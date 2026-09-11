import { NextRequest } from 'next/server';

import db from '@/lib/db';
import { verifyOfferwallPostbackSignature } from '@/lib/offerwall';

type PostbackSource = Pick<URLSearchParams, 'get'> | Pick<FormData, 'get'>;

function getString(source: PostbackSource, names: string[]) {
  for (const name of names) {
    const value = source.get(name);
    if (typeof value === 'string') return value;
  }
  return '';
}

async function getPostbackSource(request: NextRequest): Promise<PostbackSource> {
  if (request.method === 'POST') return request.formData();
  return request.nextUrl.searchParams;
}

async function handlePostback(request: NextRequest) {
  let source: PostbackSource;

  try {
    source = await getPostbackSource(request);
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

  if (!userId || !transactionId || !currencyAmount || !signature) {
    return new Response('MISSING FIELDS', { status: 400 });
  }

  if (!verifyOfferwallPostbackSignature(userId, transactionId, currencyAmount, signature)) {
    return new Response('FORBIDDEN', { status: 403 });
  }

  // Offerwall.gg's dashboard test uses a valid signature but must never alter a balance.
  if (test === '1') return new Response('OK');

  const numericUserId = Number(userId);
  const numericAmount = Number(currencyAmount);
  const numericPayoutUsd = payoutUsd ? Number(payoutUsd) : null;

  if (
    !Number.isSafeInteger(numericUserId) ||
    numericUserId <= 0 ||
    !/^-?(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(currencyAmount) ||
    !Number.isFinite(numericAmount) ||
    numericAmount === 0 ||
    transactionId.length > 255 ||
    !['credited', 'reversed'].includes(status) ||
    (status === 'credited' && numericAmount < 0) ||
    (status === 'reversed' && numericAmount > 0) ||
    (numericPayoutUsd !== null && !Number.isFinite(numericPayoutUsd))
  ) {
    return new Response('INVALID FIELDS', { status: 400 });
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, referred_by FROM users WHERE id = $1 FOR UPDATE',
      [numericUserId],
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return new Response('USER NOT FOUND', { status: 404 });
    }

    const referredBy = userResult.rows[0].referred_by as number | null;
    let referralCommission = 0;
    let reversesTransactionId: string | null = null;

    if (status === 'credited' && referredBy) {
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [referredBy]);

      const capResult = await client.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_earned
         FROM transactions
         WHERE user_id = $1
           AND type = 'referral_payout'
           AND offer_id = $2`,
        [referredBy, String(numericUserId)],
      );

      const remainingCap = Math.max(500 - Number(capResult.rows[0].total_earned), 0);
      referralCommission = Math.min(numericAmount * 0.05, remainingCap);
    }

    if (status === 'reversed') {
      const originalResult = await client.query(
        `SELECT provider_transaction_id, referral_commission
         FROM offerwall_conversions original
         WHERE original.user_id = $1
           AND original.status = 'credited'
           AND original.credits = ABS($2::numeric)
           AND COALESCE(original.offer_id, '') = $3
           AND COALESCE(original.goal_id, '') = $4
           AND NOT EXISTS (
             SELECT 1
             FROM offerwall_conversions reversal
             WHERE reversal.reverses_transaction_id = original.provider_transaction_id
           )
         ORDER BY original.created_at DESC
         LIMIT 1
         FOR UPDATE`,
        [numericUserId, currencyAmount, offerId, goalId],
      );

      if (originalResult.rows.length > 0) {
        reversesTransactionId = originalResult.rows[0].provider_transaction_id;
        referralCommission = Number(originalResult.rows[0].referral_commission);

        if (referredBy && referralCommission > 0) {
          await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [referredBy]);
        }
      }
    }

    const conversionResult = await client.query(
      `INSERT INTO offerwall_conversions (
         provider_transaction_id,
         user_id,
         offer_id,
         offer_name,
         goal_id,
         credits,
         payout_usd,
         status,
         referral_commission,
         reverses_transaction_id
       )
       VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING
       RETURNING provider_transaction_id`,
      [
        transactionId,
        numericUserId,
        offerId,
        offerName,
        goalId,
        currencyAmount,
        numericPayoutUsd,
        status,
        referralCommission,
        reversesTransactionId,
      ],
    );

    if (conversionResult.rows.length === 0) {
      await client.query('COMMIT');
      return new Response('OK');
    }

    await client.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [
      currencyAmount,
      numericUserId,
    ]);

    await client.query(
      `INSERT INTO transactions (user_id, type, amount, provider, offer_id, status)
       VALUES ($1, $2, $3, 'offerwall.gg', $4, 'completed')`,
      [
        numericUserId,
        status === 'credited' ? 'earn' : 'reversal',
        Math.abs(numericAmount),
        transactionId,
      ],
    );

    if (referredBy && referralCommission > 0) {
      if (status === 'credited') {
        await client.query(
          `UPDATE users
           SET pending_referral_balance = pending_referral_balance + $1
           WHERE id = $2`,
          [referralCommission, referredBy],
        );
      } else {
        const referrerResult = await client.query(
          'SELECT balance, pending_referral_balance FROM users WHERE id = $1',
          [referredBy],
        );
        const pendingBalance = Math.max(
          Number(referrerResult.rows[0]?.pending_referral_balance ?? 0),
          0,
        );
        const pendingDeduction = Math.min(pendingBalance, referralCommission);
        const balanceDeduction = referralCommission - pendingDeduction;

        await client.query(
          `UPDATE users
           SET pending_referral_balance = pending_referral_balance - $1,
               balance = balance - $2
           WHERE id = $3`,
          [pendingDeduction, balanceDeduction, referredBy],
        );
      }

      await client.query(
        `INSERT INTO transactions (user_id, type, amount, provider, offer_id, status)
         VALUES ($1, 'referral_payout', $2, $3, $4, 'completed')`,
        [
          referredBy,
          status === 'credited' ? referralCommission : -referralCommission,
          status === 'credited' ? 'referral' : 'referral_reversal',
          String(numericUserId),
        ],
      );
    }

    await client.query('COMMIT');
    return new Response('OK');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Offerwall postback error:', error);
    return new Response('RETRY', { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  return handlePostback(request);
}

export async function GET(request: NextRequest) {
  return handlePostback(request);
}
