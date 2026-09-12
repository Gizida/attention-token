import 'server-only';

import { randomUUID } from 'crypto';

import db from './db';
import { getCreditBalances, insertLedgerEntry } from './ledger';
import { sendOperationsAlert } from './operations-alerts';
import { getSolPriceQuote } from './sol-price';
import { envFlag } from './server-env';
import {
  AUTO_DAILY_USER_CREDITS,
  PLATFORM_DAILY_CREDITS,
  QUOTE_TTL_MS,
  creditsToLamports,
  creditsToUsd,
  validateWithdrawalCredits,
} from './withdrawal-policy';

export type WithdrawalStatus =
  | 'awaiting_review' | 'queued' | 'signing' | 'signed' | 'submitted'
  | 'confirmed' | 'retryable' | 'rejected' | 'expired';

export type WithdrawalRecord = {
  id: string;
  user_id: string | number;
  destination_wallet: string;
  credits: string | number;
  usd_amount: string | number;
  sol_price_usd: string | number;
  sol_lamports: string | number;
  status: WithdrawalStatus;
  quote_observed_at: string | Date;
  quote_expires_at: string | Date;
  tx_signature?: string | null;
  review_reason?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

const ACTIVE_DAILY_STATUSES = "('queued','signing','signed','submitted','confirmed')";
const DAILY_PAYOUT_ADVISORY_LOCK = 728_410_025;

function publicWithdrawal(row: WithdrawalRecord) {
  const statusMessage = row.status === 'retryable'
    ? 'Delivery was not confirmed. The processor will retry the same signed payment or wait for its blockhash to expire before replacing it.'
    : row.status === 'submitted'
      ? 'The payment was submitted to Solana and is being verified. Do not create a replacement request.'
      : row.status === 'expired'
        ? 'The quote expired before signing and the reserved credits were restored.'
        : row.status === 'rejected'
          ? row.review_reason || 'The request was rejected and the reserved credits were restored.'
          : null;
  return {
    id: row.id,
    credits: Number(row.credits),
    usdAmount: Number(row.usd_amount),
    solAmount: Number(BigInt(row.sol_lamports)) / 1_000_000_000,
    solLamports: String(row.sol_lamports),
    destinationWallet: row.destination_wallet,
    status: row.status,
    quoteObservedAt: new Date(row.quote_observed_at).toISOString(),
    quoteExpiresAt: new Date(row.quote_expires_at).toISOString(),
    signature: row.tx_signature ?? null,
    reviewReason: row.review_reason ?? null,
    statusMessage,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function findIdempotentRequest(userId: number, idempotencyKey: string) {
  const result = await db.query(
    'SELECT * FROM withdrawal_requests WHERE user_id = $1 AND idempotency_key = $2',
    [userId, idempotencyKey],
  );
  return result.rows[0] as WithdrawalRecord | undefined;
}

export async function createWithdrawalRequest(input: {
  userId: number;
  credits: unknown;
  idempotencyKey: string;
}) {
  if (!envFlag('PAYOUTS_ENABLED')) throw new Error('Withdrawals are temporarily paused');
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(input.idempotencyKey)) {
    throw new Error('A valid Idempotency-Key header is required');
  }
  const previous = await findIdempotentRequest(input.userId, input.idempotencyKey);
  if (previous) return publicWithdrawal(previous);

  const credits = validateWithdrawalCredits(input.credits);
  const quote = await getSolPriceQuote();
  const lamports = creditsToLamports(credits, quote.priceUsd);
  if (lamports <= 0n) throw new Error('Withdrawal rounds to zero lamports');
  const requestId = randomUUID();
  const quoteExpiresAt = new Date(quote.observedAt.getTime() + QUOTE_TTL_MS);
  const client = await db.getClient();
  let created: WithdrawalRecord;
  let platformLimitReached = false;

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [DAILY_PAYOUT_ADVISORY_LOCK]);
    const userResult = await client.query(
      'SELECT id, wallet_address FROM users WHERE id = $1 FOR UPDATE',
      [input.userId],
    );
    if (!userResult.rows[0]) throw new Error('User not found');
    const balances = await getCreditBalances(client, input.userId);
    if (balances.available < credits) throw new Error('Insufficient available balance');

    const daily = await client.query(
      `SELECT
         COALESCE(SUM(credits) FILTER (WHERE user_id = $1), 0) AS user_total,
         COALESCE(SUM(credits), 0) AS platform_total
       FROM withdrawal_requests
       WHERE created_at >= (date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
         AND status IN ${ACTIVE_DAILY_STATUSES}`,
      [input.userId],
    );
    const userDaily = Number(daily.rows[0]?.user_total ?? 0);
    const platformDaily = Number(daily.rows[0]?.platform_total ?? 0);
    platformLimitReached = platformDaily + credits > PLATFORM_DAILY_CREDITS;
    const automatic = envFlag('AUTO_PAYOUTS_ENABLED')
      && credits <= AUTO_DAILY_USER_CREDITS
      && userDaily + credits <= AUTO_DAILY_USER_CREDITS
      && !platformLimitReached;
    const status: WithdrawalStatus = automatic ? 'queued' : 'awaiting_review';

    const insert = await client.query(
      `INSERT INTO withdrawal_requests (
         id, user_id, destination_wallet, credits, usd_amount, sol_price_usd,
         sol_lamports, status, idempotency_key, quote_observed_at, quote_expires_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [requestId, input.userId, userResult.rows[0].wallet_address, credits, creditsToUsd(credits),
        quote.priceUsd, lamports.toString(), status, input.idempotencyKey, quote.observedAt, quoteExpiresAt],
    );
    created = insert.rows[0] as WithdrawalRecord;
    const reserved = await insertLedgerEntry(client, {
      userId: input.userId,
      kind: 'withdrawal_reserve',
      amountCredits: -credits,
      availableAt: new Date(),
      sourceType: 'withdrawal',
      sourceId: requestId,
    });
    if (!reserved) throw new Error('Withdrawal reservation already exists');
    await client.query('UPDATE users SET balance = COALESCE(balance, 0) - $1 WHERE id = $2', [credits, input.userId]);
    await client.query(
      `INSERT INTO transactions
         (user_id, type, amount, sol_amount, provider, status, withdrawal_request_id, available_at)
       VALUES ($1, 'withdraw', $2, $3, 'solana', $4, $5, NOW())`,
      [input.userId, credits, Number(lamports) / 1_000_000_000, status, requestId],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if ((error as { code?: string }).code === '23505') {
      const raced = await findIdempotentRequest(input.userId, input.idempotencyKey);
      if (raced) return publicWithdrawal(raced);
    }
    throw error;
  } finally {
    client.release();
  }

  if (created.status === 'awaiting_review') {
    void sendOperationsAlert(
      'Withdrawal awaiting review',
      `Request ${created.id} for $${Number(created.usd_amount).toFixed(2)} is awaiting review.`,
    ).catch(console.error);
  }
  if (platformLimitReached) {
    void sendOperationsAlert(
      'Daily payout cap reached',
      `Request ${created.id} is awaiting review because paying it would exceed the $100 UTC platform limit.`,
    ).catch(console.error);
  }
  return publicWithdrawal(created);
}

export async function listUserWithdrawals(userId: number) {
  const result = await db.query(
    'SELECT * FROM withdrawal_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
    [userId],
  );
  return result.rows.map((row) => publicWithdrawal(row as WithdrawalRecord));
}

export async function getUserWithdrawal(userId: number, requestId: string) {
  const result = await db.query(
    'SELECT * FROM withdrawal_requests WHERE id = $1 AND user_id = $2',
    [requestId, userId],
  );
  return result.rows[0] ? publicWithdrawal(result.rows[0] as WithdrawalRecord) : null;
}

export async function releaseWithdrawal(input: {
  requestId: string;
  status: 'rejected' | 'expired';
  actorUserId?: number;
  reason: string;
  confirmedOnChainFailure?: boolean;
}): Promise<boolean> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE', [input.requestId]);
    const request = result.rows[0] as WithdrawalRecord | undefined;
    const releasable = ['awaiting_review', 'queued', 'signing', 'retryable'].includes(request?.status ?? '')
      || (input.confirmedOnChainFailure && ['signed', 'submitted'].includes(request?.status ?? ''));
    if (!request || !releasable) {
      await client.query('ROLLBACK');
      return false;
    }
    const released = await insertLedgerEntry(client, {
      userId: Number(request.user_id),
      kind: 'withdrawal_release',
      amountCredits: Number(request.credits),
      availableAt: new Date(),
      sourceType: 'withdrawal',
      sourceId: request.id,
      metadata: { reason: input.reason },
    });
    if (released) {
      await client.query('UPDATE users SET balance = COALESCE(balance, 0) + $1 WHERE id = $2', [request.credits, request.user_id]);
    }
    await client.query(
      `UPDATE withdrawal_requests SET status=$2, review_reason=$3, rejected_by=$4,
         rejected_at=CASE WHEN $2='rejected' THEN NOW() ELSE rejected_at END,
         processing_token=NULL, processing_locked_until=NULL, updated_at=NOW()
       WHERE id=$1`,
      [input.requestId, input.status, input.reason, input.actorUserId ?? null],
    );
    await client.query(
      'UPDATE transactions SET status=$2 WHERE withdrawal_request_id=$1',
      [input.requestId, input.status],
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function approveWithdrawal(requestId: string, adminUserId: number): Promise<boolean> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [DAILY_PAYOUT_ADVISORY_LOCK]);
    const result = await client.query('SELECT * FROM withdrawal_requests WHERE id=$1 FOR UPDATE', [requestId]);
    const request = result.rows[0] as WithdrawalRecord | undefined;
    if (!request || request.status !== 'awaiting_review') {
      await client.query('ROLLBACK');
      return false;
    }
    if (new Date(request.quote_expires_at).getTime() <= Date.now()) {
      await client.query('ROLLBACK');
      await releaseWithdrawal({ requestId, status: 'expired', actorUserId: adminUserId, reason: 'Quote expired before approval' });
      return false;
    }
    const daily = await client.query(
      `SELECT COALESCE(SUM(credits),0) AS total FROM withdrawal_requests
       WHERE created_at >= (date_trunc('day', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
         AND status IN ${ACTIVE_DAILY_STATUSES}`,
    );
    if (Number(daily.rows[0]?.total ?? 0) + Number(request.credits) > PLATFORM_DAILY_CREDITS) {
      throw new Error('Approving this request would exceed the $100 UTC daily platform limit');
    }
    await client.query(
      `UPDATE withdrawal_requests SET status='queued', approved_by=$2, approved_at=NOW(),
         review_reason=NULL, updated_at=NOW() WHERE id=$1`,
      [requestId, adminUserId],
    );
    await client.query("UPDATE transactions SET status='queued' WHERE withdrawal_request_id=$1", [requestId]);
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function expireUnsignedWithdrawals(): Promise<number> {
  const result = await db.query(
    `SELECT id FROM withdrawal_requests
     WHERE quote_expires_at <= NOW() AND status IN ('awaiting_review','queued','signing','retryable')
     ORDER BY quote_expires_at LIMIT 50`,
  );
  let expired = 0;
  for (const row of result.rows) {
    if (await releaseWithdrawal({ requestId: row.id, status: 'expired', reason: 'Quote expired before signing' })) expired++;
  }
  return expired;
}
