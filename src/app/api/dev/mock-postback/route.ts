import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    const userId = searchParams.get('user_id');
    const amount = searchParams.get('amount');
    const offerId = searchParams.get('offer_id');

    if (!userId || !amount || !offerId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1. Pay the user their 70% (or whatever the full amount is)
    await db.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [numericAmount, numericUserId]
    );

    // 2. REFERRAL LOGIC
    const userRes = await db.query('SELECT referred_by FROM users WHERE id = $1', [numericUserId]);
    const referrerId = userRes.rows[0].referred_by;

    if (referrerId) {
      // Calculate 5% commission
      const commission = numericAmount * 0.05;
      
      if (commission > 0) {
        // Check the 500 credit cap. 
        // We sum up all the commission the referee has earned so far.
        const capCheck = await db.query(
          `SELECT COALESCE(SUM(amount), 0) as total_earned 
           FROM transactions 
           WHERE user_id = $1 AND type = 'referral_payout' 
           AND offer_id = $2`, // offer_id stores the referee's user_id in this context
          [referrerId, numericUserId.toString()]
        );

        const totalEarnedFromThisReferral = parseFloat(capCheck.rows[0].total_earned);
        const cap = 500.00;

        if (totalEarnedFromThisReferral < cap) {
          // If they haven't hit the cap, calculate how much they can get
          const remainingCap = cap - totalEarnedFromThisReferral;
          const finalCommission = Math.min(commission, remainingCap);

          // Add to referrer's PENDING balance (so they have to claim it)
          await db.query(
            'UPDATE users SET pending_referral_balance = pending_referral_balance + $1 WHERE id = $2',
            [finalCommission, referrerId]
          );

          // Record this in the transactions ledger for auditing
          await db.query(
            `INSERT INTO transactions (user_id, type, amount, provider, offer_id, status) 
             VALUES ($1, 'referral_payout', $2, 'referral', $3, 'completed')`,
            [referrerId, finalCommission, numericUserId.toString()] // store referee ID in offer_id
          );
        }
      }
    }

    // 1. Check if this offer was already completed (fraud prevention)
    const existingTx = await db.query(
      'SELECT * FROM transactions WHERE offer_id = $1 AND type = $2',
      [offerId, 'earn']
    );

    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view');

    if (existingTx.rows.length > 0) {
      // Return 400 so the frontend knows it failed
      return NextResponse.json({ error: 'Offer already completed' }, { status: 400 });
    }

    // 2. Force the types to be numbers so PostgreSQL doesn't complain
    const numericAmount = parseFloat(amount);
    const numericUserId = parseInt(userId, 10);

    // 3. Record the transaction in the ledger
    await db.query(
      'INSERT INTO transactions (user_id, type, amount, provider, offer_id, status) VALUES ($1, $2, $3, $4, $5, $6)',
      [numericUserId, 'earn', numericAmount, 'mock_adgate', offerId, 'completed']
    );

    // 4. Update the user's balance
    await db.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [numericAmount, numericUserId]
    );

    return NextResponse.json({ 
      success: true, 
      message: `Added ${numericAmount} credits to user ${numericUserId}`,
    });

  } catch (error) {
    console.error('Mock postback error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}