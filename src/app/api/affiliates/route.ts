import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const token = cookieHeader.match(/auth-token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = await verifySession(token);
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    const result = await db.query(
      `SELECT 
        referral_code, 
        pending_referral_balance,
        (SELECT COUNT(*) FROM users WHERE referred_by = $1) as total_referrals,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE user_id = $1 AND type = 'referral_payout') as total_earned_all_time
       FROM users WHERE id = $1`,
      [userId]
    );

    return NextResponse.json({ affiliateData: result.rows[0] });
  } catch (error) {
    console.error('Affiliate fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Claim pending balance!
export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const token = cookieHeader.match(/auth-token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = await verifySession(token);
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    await db.query('BEGIN');

    // Get pending balance
    const userRes = await db.query('SELECT pending_referral_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
    const pendingAmount = parseFloat(userRes.rows[0].pending_referral_balance);

    if (pendingAmount <= 0) {
      await db.query('ROLLBACK');
      return NextResponse.json({ error: 'No pending balance to claim' }, { status: 400 });
    }

    // Move from pending to main balance
    await db.query('UPDATE users SET balance = balance + pending_referral_balance, pending_referral_balance = 0 WHERE id = $1', [userId]);
    
    // Record the claim in the ledger
    await db.query(
      `INSERT INTO transactions (user_id, type, amount, provider, status) 
       VALUES ($1, 'referral_claim', $2, 'referral', 'completed')`,
      [userId, pendingAmount]
    );

    await db.query('COMMIT');

    return NextResponse.json({ success: true, claimedAmount: pendingAmount });
  } catch (error) {
    await db.query('ROLLBACK');
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}