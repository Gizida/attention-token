import { NextRequest } from 'next/server';

import db from '@/lib/db';
import { insertLedgerEntry } from '@/lib/ledger';
import { sendOperationsAlert } from '@/lib/operations-alerts';
import { verifyOfferwallPostbackSignature } from '@/lib/offerwall';
import { EARNING_MATURITY_DAYS } from '@/lib/withdrawal-policy';

type PostbackSource = Pick<URLSearchParams, 'get'> | Pick<FormData, 'get'>;

function getString(source: PostbackSource, names: string[]) {
  for (const name of names) {
    const value = source.get(name);
    if (typeof value === 'string') return value;
  }
  return '';
}

async function sourceFor(request: NextRequest): Promise<PostbackSource> {
  return request.method === 'POST' ? request.formData() : request.nextUrl.searchParams;
}

async function handlePostback(request: NextRequest) {
  let source: PostbackSource;
  try {
    source = await sourceFor(request);
  } catch {
    return new Response('INVALID BODY', { status: 400 });
  }

  const userId = getString(source, ['userId', 'user', 'user_id', 'subid']);
  const transactionId = getString(source, ['transactionId', 'tx', 'txid', 'trans_id']);
  const currencyAmount = getString(source, ['currencyAmount', 'amount', 'points', 'reward']);
  const signature = getString(source, ['signature', 'sig', 'hash']);
  const status = getString(source, ['status']);
  const test = getString(source, ['test']);
  const offerId = getString(source, ['offerId', 'offer_id']);
  const offerName = getString(source, ['offerName', 'offer_name']);
  const goalId = getString(source, ['goalId', 'goal_id']);
  const payoutUsd = getString(source, ['payoutUsd', 'payout_usd']);

  if (!userId || !transactionId || !currencyAmount || !signature) return new Response('MISSING FIELDS', { status: 400 });
  if (!verifyOfferwallPostbackSignature(userId, transactionId, currencyAmount, signature)) {
    return new Response('FORBIDDEN', { status: 403 });
  }
  if (test === '1') return new Response('OK');

  const numericUserId = Number(userId);
  const numericAmount = Number(currencyAmount);
  const numericPayoutUsd = payoutUsd ? Number(payoutUsd) : null;
  if (
    !Number.isSafeInteger(numericUserId) || numericUserId <= 0
    || !/^-?(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(currencyAmount)
    || !Number.isFinite(numericAmount) || numericAmount === 0
    || transactionId.length > 255 || !['credited', 'reversed'].includes(status)
    || (status === 'credited' && numericAmount < 0) || (status === 'reversed' && numericAmount > 0)
    || (numericPayoutUsd !== null && !Number.isFinite(numericPayoutUsd))
  ) return new Response('INVALID FIELDS', { status: 400 });

  const client = await db.getClient();
  let reversalCountLastHour = 0;
  try {
    await client.query('BEGIN');
    const userResult = await client.query('SELECT id,referred_by FROM users WHERE id=$1 FOR UPDATE', [numericUserId]);
    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      return new Response('USER NOT FOUND', { status: 404 });
    }
    const referredBy = userResult.rows[0].referred_by ? Number(userResult.rows[0].referred_by) : null;
    let referralCommission = 0;
    let reversesTransactionId: string | null = null;
    let conversionKey = transactionId;

    if (status === 'credited' && referredBy) {
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [referredBy]);
      const cap = await client.query(
        `SELECT COALESCE(SUM(amount),0) AS earned FROM transactions
         WHERE user_id=$1 AND type='referral_payout' AND offer_id=$2`,
        [referredBy, String(numericUserId)],
      );
      referralCommission = Math.min(numericAmount * 0.05, Math.max(500 - Number(cap.rows[0].earned), 0));
    }

    if (status === 'reversed') {
      const sameId = await client.query(
        `SELECT provider_transaction_id,referral_commission FROM offerwall_conversions
         WHERE provider_transaction_id=$1 AND user_id=$2 AND status='credited' FOR UPDATE`,
        [transactionId, numericUserId],
      );
      let original = sameId.rows[0];
      if (original) {
        conversionKey = `${transactionId}:reversal`;
      } else {
        const match = await client.query(
          `SELECT provider_transaction_id,referral_commission FROM offerwall_conversions original
           WHERE user_id=$1 AND status='credited' AND credits=ABS($2::numeric)
             AND COALESCE(offer_id,'')=$3 AND COALESCE(goal_id,'')=$4
             AND NOT EXISTS (SELECT 1 FROM offerwall_conversions reversal
               WHERE reversal.reverses_transaction_id=original.provider_transaction_id)
           ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [numericUserId, currencyAmount, offerId, goalId],
        );
        original = match.rows[0];
      }
      if (!original) {
        await client.query('ROLLBACK');
        return new Response('ORIGINAL NOT FOUND', { status: 409 });
      }
      reversesTransactionId = original.provider_transaction_id;
      referralCommission = Number(original.referral_commission);
      if (referredBy && referralCommission > 0) await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [referredBy]);
    }

    const conversion = await client.query(
      `INSERT INTO offerwall_conversions
         (provider_transaction_id,user_id,offer_id,offer_name,goal_id,credits,payout_usd,
          status,referral_commission,reverses_transaction_id)
       VALUES ($1,$2,NULLIF($3,''),NULLIF($4,''),NULLIF($5,''),$6,$7,$8,$9,$10)
       ON CONFLICT DO NOTHING RETURNING provider_transaction_id`,
      [conversionKey, numericUserId, offerId, offerName, goalId, currencyAmount,
        numericPayoutUsd, status, referralCommission, reversesTransactionId],
    );
    if (!conversion.rows[0]) {
      await client.query('COMMIT');
      return new Response('OK');
    }

    if (status === 'reversed') {
      const reversalCount = await client.query(
        `SELECT COUNT(*) AS count FROM offerwall_conversions
         WHERE status='reversed' AND created_at >= NOW()-INTERVAL '1 hour'`,
      );
      reversalCountLastHour = Number(reversalCount.rows[0]?.count ?? 0);
    }

    const maturity = new Date(Date.now() + EARNING_MATURITY_DAYS * 24 * 60 * 60 * 1_000);
    let userAvailableAt = maturity;
    if (status === 'reversed' && reversesTransactionId) {
      const originalLedger = await client.query(
        `SELECT available_at FROM credit_ledger_entries
         WHERE user_id=$1 AND kind='offer_credit' AND source_id=$2`,
        [numericUserId, reversesTransactionId],
      );
      userAvailableAt = originalLedger.rows[0]?.available_at && new Date(originalLedger.rows[0].available_at) > new Date()
        ? new Date(originalLedger.rows[0].available_at) : new Date();
    }
    await insertLedgerEntry(client, {
      userId: numericUserId,
      kind: status === 'credited' ? 'offer_credit' : 'offer_reversal',
      amountCredits: numericAmount,
      availableAt: userAvailableAt,
      sourceType: 'offerwall.gg',
      sourceId: conversionKey,
      metadata: { offerId, offerName, goalId, reversesTransactionId },
    });
    await client.query('UPDATE users SET balance=COALESCE(balance,0)+$1 WHERE id=$2', [numericAmount, numericUserId]);
    await client.query(
      `INSERT INTO transactions (user_id,type,amount,provider,offer_id,status,available_at)
       VALUES ($1,$2,$3,'offerwall.gg',$4,'completed',$5)`,
      [numericUserId, status === 'credited' ? 'earn' : 'reversal', Math.abs(numericAmount), conversionKey, userAvailableAt],
    );

    if (referredBy && referralCommission > 0) {
      let referralAvailableAt = maturity;
      if (status === 'reversed' && reversesTransactionId) {
        const originalReferral = await client.query(
          `SELECT available_at FROM credit_ledger_entries
           WHERE user_id=$1 AND kind='referral_credit' AND source_id=$2`,
          [referredBy, reversesTransactionId],
        );
        referralAvailableAt = originalReferral.rows[0]?.available_at && new Date(originalReferral.rows[0].available_at) > new Date()
          ? new Date(originalReferral.rows[0].available_at) : new Date();
      }
      const signedCommission = status === 'credited' ? referralCommission : -referralCommission;
      await insertLedgerEntry(client, {
        userId: referredBy,
        kind: status === 'credited' ? 'referral_credit' : 'referral_reversal',
        amountCredits: signedCommission,
        availableAt: referralAvailableAt,
        sourceType: 'offerwall.gg-referral',
        sourceId: conversionKey,
        metadata: { referredUserId: numericUserId, reversesTransactionId },
      });
      await client.query('UPDATE users SET balance=COALESCE(balance,0)+$1 WHERE id=$2', [signedCommission, referredBy]);
      await client.query(
        `INSERT INTO transactions (user_id,type,amount,provider,offer_id,status,available_at)
         VALUES ($1,'referral_payout',$2,$3,$4,'completed',$5)`,
        [referredBy, signedCommission, status === 'credited' ? 'referral' : 'referral_reversal', String(numericUserId), referralAvailableAt],
      );
    }

    await client.query('COMMIT');
    const reversalThreshold = Math.max(Number(process.env.REVERSAL_SPIKE_THRESHOLD ?? 5), 1);
    if (status === 'reversed' && reversalCountLastHour > 0 && reversalCountLastHour % reversalThreshold === 0) {
      void sendOperationsAlert(
        'Offerwall reversal spike',
        `${reversalCountLastHour} Offerwall reversals were recorded in the last hour.`,
      ).catch(console.error);
    }
    return new Response('OK');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Offerwall postback error', error);
    return new Response('RETRY', { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) { return handlePostback(request); }
export async function GET(request: NextRequest) { return handlePostback(request); }
