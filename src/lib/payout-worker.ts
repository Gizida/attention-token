import 'server-only';

import { randomUUID } from 'crypto';

import db from './db';
import { sendOperationsAlert } from './operations-alerts';
import {
  getTreasuryBalanceLamports,
  observePayout,
  prepareSolPayout,
  submitSignedPayout,
} from './payout';
import { envFlag, validatePayoutEnvironment } from './server-env';
import { expireUnsignedWithdrawals, releaseWithdrawal, WithdrawalRecord } from './withdrawals';

type AttemptRecord = {
  id: string;
  withdrawal_request_id: string;
  attempt_number: number;
  treasury_wallet: string;
  signed_transaction_base64: string;
  expected_signature: string;
  recent_blockhash: string;
  last_valid_block_height: string | number;
  status: 'signed' | 'submitted' | 'confirmed' | 'failed' | 'expired';
  destination_wallet: string;
  sol_lamports: string | number;
  quote_expires_at: string | Date;
  sol_price_usd: string | number;
  usd_amount: string | number;
  credits: string | number;
  created_at: string | Date;
};

async function submitAttempt(attempt: AttemptRecord): Promise<boolean> {
  try {
    const signature = await submitSignedPayout(attempt.signed_transaction_base64);
    if (signature !== attempt.expected_signature) {
      throw new Error(`RPC returned unexpected signature ${signature}`);
    }
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE payout_attempts SET status='submitted', submitted_at=COALESCE(submitted_at,NOW()),
           error=NULL, updated_at=NOW() WHERE id=$1`,
        [attempt.id],
      );
      await client.query(
        `UPDATE withdrawal_requests SET status='submitted', tx_signature=$2,
           processing_token=NULL, processing_locked_until=NULL, last_error=NULL, updated_at=NOW()
         WHERE id=$1 AND status IN ('signed','signing')`,
        [attempt.withdrawal_request_id, signature],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown RPC submission error';
    await db.query('UPDATE payout_attempts SET error=$2, updated_at=NOW() WHERE id=$1', [attempt.id, message.slice(0, 1000)]);
    return false;
  }
}

async function submitPendingSignedAttempts(): Promise<number> {
  const result = await db.query(
    `SELECT pa.*, wr.destination_wallet, wr.sol_lamports, wr.quote_expires_at,
       wr.sol_price_usd, wr.usd_amount, wr.credits
     FROM payout_attempts pa JOIN withdrawal_requests wr ON wr.id=pa.withdrawal_request_id
     WHERE pa.status='signed' AND wr.status='signed'
     ORDER BY pa.created_at LIMIT 10`,
  );
  let submitted = 0;
  for (const row of result.rows as AttemptRecord[]) {
    if (await submitAttempt(row)) submitted++;
  }
  return submitted;
}

async function claimWithdrawal(autoPayoutsEnabled: boolean): Promise<(WithdrawalRecord & { processing_token: string; attempt_count: number }) | null> {
  const token = randomUUID();
  const result = await db.query(
    `WITH candidate AS (
       SELECT wr.id FROM withdrawal_requests wr
        WHERE wr.status IN ('queued','retryable')
          AND (wr.approved_by IS NOT NULL OR $2::boolean)
         AND wr.quote_expires_at > NOW()
         AND (wr.processing_locked_until IS NULL OR wr.processing_locked_until < NOW())
         AND NOT EXISTS (
           SELECT 1 FROM payout_attempts pa
           WHERE pa.withdrawal_request_id=wr.id AND pa.status IN ('signed','submitted','confirmed')
         )
       ORDER BY wr.created_at
       FOR UPDATE SKIP LOCKED LIMIT 1
     )
     UPDATE withdrawal_requests wr
     SET status='signing', processing_token=$1, processing_locked_until=NOW()+INTERVAL '2 minutes',
         attempt_count=attempt_count+1, updated_at=NOW()
     FROM candidate WHERE wr.id=candidate.id RETURNING wr.*`,
    [token, autoPayoutsEnabled],
  );
  return (result.rows[0] as (WithdrawalRecord & { processing_token: string; attempt_count: number })) ?? null;
}

async function signClaimedWithdrawal(request: WithdrawalRecord & { processing_token: string; attempt_count: number }) {
  try {
    const prepared = await prepareSolPayout({
      recipientAddress: request.destination_wallet,
      lamports: BigInt(request.sol_lamports),
    });
    const attemptId = randomUUID();
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      const locked = await client.query(
        `SELECT status, processing_token FROM withdrawal_requests
         WHERE id=$1 FOR UPDATE`,
        [request.id],
      );
      if (locked.rows[0]?.status !== 'signing' || locked.rows[0]?.processing_token !== request.processing_token) {
        await client.query('ROLLBACK');
        return false;
      }
      const count = await client.query(
        'SELECT COALESCE(MAX(attempt_number),0)+1 AS next FROM payout_attempts WHERE withdrawal_request_id=$1',
        [request.id],
      );
      await client.query(
        `INSERT INTO payout_attempts
           (id,withdrawal_request_id,attempt_number,treasury_wallet,signed_transaction_base64,
            expected_signature,recent_blockhash,last_valid_block_height,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'signed')`,
        [attemptId, request.id, count.rows[0].next, prepared.treasuryAddress,
          prepared.signedTransactionBase64, prepared.signature, prepared.recentBlockhash,
          prepared.lastValidBlockHeight.toString()],
      );
      await client.query(
        `UPDATE withdrawal_requests SET status='signed', tx_signature=$2,
           processing_locked_until=NULL, processing_token=NULL, last_error=NULL, updated_at=NOW()
         WHERE id=$1`,
        [request.id, prepared.signature],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return submitAttempt({
      id: attemptId,
      withdrawal_request_id: request.id,
      attempt_number: request.attempt_count,
      treasury_wallet: prepared.treasuryAddress,
      signed_transaction_base64: prepared.signedTransactionBase64,
      expected_signature: prepared.signature,
      recent_blockhash: prepared.recentBlockhash,
      last_valid_block_height: prepared.lastValidBlockHeight.toString(),
      status: 'signed',
      destination_wallet: request.destination_wallet,
      sol_lamports: request.sol_lamports,
      quote_expires_at: request.quote_expires_at,
      sol_price_usd: request.sol_price_usd,
      usd_amount: request.usd_amount,
      credits: request.credits,
      created_at: request.created_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown signing error';
    const nextStatus = request.attempt_count >= 5 ? 'awaiting_review' : 'retryable';
    await db.query(
      `UPDATE withdrawal_requests SET status=$3, last_error=$2,
         processing_token=NULL, processing_locked_until=NULL, updated_at=NOW()
       WHERE id=$1 AND processing_token=$4`,
      [request.id, message.slice(0, 1000), nextStatus, request.processing_token],
    );
    await sendOperationsAlert('Payout signing failed', `Request ${request.id}: ${message}`).catch(console.error);
    return false;
  }
}

async function markConfirmed(attempt: AttemptRecord, networkFeeLamports = 0n): Promise<void> {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const requestResult = await client.query('SELECT * FROM withdrawal_requests WHERE id=$1 FOR UPDATE', [attempt.withdrawal_request_id]);
    const request = requestResult.rows[0] as WithdrawalRecord | undefined;
    if (!request || request.status === 'confirmed') {
      await client.query('COMMIT');
      return;
    }
    await client.query("UPDATE payout_attempts SET status='confirmed', confirmed_at=NOW(), updated_at=NOW() WHERE id=$1", [attempt.id]);
    await client.query(
      `UPDATE withdrawal_requests SET status='confirmed', confirmed_at=NOW(), tx_signature=$2,
         actual_network_fee_usd=$3,last_error=NULL, updated_at=NOW() WHERE id=$1`,
      [attempt.withdrawal_request_id, attempt.expected_signature,
        Number(networkFeeLamports) / 1_000_000_000 * Number(request.sol_price_usd)],
    );
    await client.query(
      `UPDATE transactions SET status='completed', tx_signature=$2, offer_id=$2
       WHERE withdrawal_request_id=$1`,
      [attempt.withdrawal_request_id, attempt.expected_signature],
    );
    await client.query(
      `INSERT INTO treasury_logs
         (type,from_wallet,to_wallet,amount_usd,amount_token,swap_rate,network_fee,
          tx_signature,status,withdrawal_request_id)
       VALUES ('withdrawal',$1,$2,$3,$4,$5,$6,$7,'completed',$8)
       ON CONFLICT DO NOTHING`,
      [attempt.treasury_wallet, attempt.destination_wallet, request.usd_amount,
        Number(BigInt(request.sol_lamports)) / 1_000_000_000, request.sol_price_usd,
        Number(networkFeeLamports) / 1_000_000_000, attempt.expected_signature, request.id],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const treasuryLamports = await getTreasuryBalanceLamports();
  const treasuryUsd = Number(treasuryLamports) / 1_000_000_000 * Number(attempt.sol_price_usd);
  const queued = await db.query(
    `SELECT COALESCE(SUM(usd_amount),0) AS total FROM withdrawal_requests
     WHERE status IN ('awaiting_review','queued','signing','signed','submitted','retryable')`,
  );
  const alertThreshold = Math.max(125, Number(queued.rows[0]?.total ?? 0));
  if (treasuryUsd < alertThreshold) {
    await sendOperationsAlert(
      'Treasury balance is low',
      `Treasury value is about $${treasuryUsd.toFixed(2)}; the current alert threshold is $${alertThreshold.toFixed(2)}.`,
    ).catch(console.error);
  }
}

export async function runPayoutProcessor(): Promise<{ expired: number; signed: number; submitted: number }> {
  const expired = await expireUnsignedWithdrawals();
  if (!envFlag('PAYOUTS_ENABLED')) return { expired, signed: 0, submitted: 0 };
  validatePayoutEnvironment();
  await db.query(
    `UPDATE withdrawal_requests wr SET status='retryable', processing_token=NULL,
       processing_locked_until=NULL, last_error='Recovered an expired processing lease', updated_at=NOW()
     WHERE wr.status='signing' AND wr.processing_locked_until < NOW()
       AND NOT EXISTS (SELECT 1 FROM payout_attempts pa WHERE pa.withdrawal_request_id=wr.id)`,
  );
  let submitted = await submitPendingSignedAttempts();
  let signed = 0;
  const batchSize = Math.min(Math.max(Number(process.env.PAYOUT_BATCH_SIZE ?? 5), 1), 10);
  const autoPayoutsEnabled = envFlag('AUTO_PAYOUTS_ENABLED');
  for (let index = 0; index < batchSize; index++) {
    const request = await claimWithdrawal(autoPayoutsEnabled);
    if (!request) break;
    signed++;
    if (await signClaimedWithdrawal(request)) submitted++;
  }
  return { expired, signed, submitted };
}

export async function runPayoutReconciler(): Promise<{ confirmed: number; failed: number; pending: number }> {
  validatePayoutEnvironment();
  if (!envFlag('PAYOUTS_ENABLED')) return { confirmed: 0, failed: 0, pending: 0 };
  const result = await db.query(
    `SELECT pa.*, wr.destination_wallet, wr.sol_lamports, wr.quote_expires_at,
       wr.sol_price_usd, wr.usd_amount, wr.credits
     FROM payout_attempts pa JOIN withdrawal_requests wr ON wr.id=pa.withdrawal_request_id
     WHERE pa.status IN ('signed','submitted') AND wr.status IN ('signed','submitted')
     ORDER BY pa.created_at LIMIT 25`,
  );
  let confirmed = 0;
  let failed = 0;
  let pending = 0;
  for (const attempt of result.rows as AttemptRecord[]) {
    const observation = await observePayout({
      signature: attempt.expected_signature,
      treasuryAddress: attempt.treasury_wallet,
      destinationAddress: attempt.destination_wallet,
      lamports: BigInt(attempt.sol_lamports),
    });
    if (observation.confirmed) {
      await markConfirmed(attempt, observation.networkFeeLamports);
      confirmed++;
      continue;
    }
    if (observation.failed) {
      await db.query("UPDATE payout_attempts SET status='failed', error='Confirmed on-chain failure', updated_at=NOW() WHERE id=$1", [attempt.id]);
      await releaseWithdrawal({
        requestId: attempt.withdrawal_request_id,
        status: 'rejected',
        reason: 'The Solana transaction failed on-chain; reserved credits were restored',
        confirmedOnChainFailure: true,
      });
      failed++;
      continue;
    }
    if (observation.absentEverywhere && observation.currentBlockHeight > BigInt(attempt.last_valid_block_height)) {
      await db.query("UPDATE payout_attempts SET status='expired', error='Blockhash expired before landing', updated_at=NOW() WHERE id=$1", [attempt.id]);
      if (new Date(attempt.quote_expires_at).getTime() <= Date.now()) {
        await releaseWithdrawal({
          requestId: attempt.withdrawal_request_id,
          status: 'expired',
          reason: 'The signed transaction expired without landing; reserved credits were restored',
          confirmedOnChainFailure: true,
        });
      } else {
        await db.query(
          `UPDATE withdrawal_requests SET status='retryable', tx_signature=NULL,
             last_error='Previous signed transaction expired without landing', updated_at=NOW()
           WHERE id=$1 AND status IN ('signed','submitted')`,
          [attempt.withdrawal_request_id],
        );
      }
      continue;
    }
    if (observation.error || Date.now() - new Date(attempt.created_at).getTime() > 5 * 60_000) {
      await sendOperationsAlert(
        'Payout needs reconciliation attention',
        `Request ${attempt.withdrawal_request_id}, signature ${attempt.expected_signature}: ${observation.error ?? 'still unresolved after five minutes'}`,
      ).catch(console.error);
    }
    pending++;
  }
  return { confirmed, failed, pending };
}
