import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/request-auth';

function maskWallet(wallet: string) {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await db.query(
      `SELECT u.id, u.wallet_address,
         COALESCE(SUM(le.amount_credits) FILTER (
           WHERE le.kind IN ('offer_credit','offer_reversal','referral_credit','referral_reversal')
         ), 0) AS total_earned
       FROM users u
       LEFT JOIN credit_ledger_entries le ON le.user_id=u.id
       GROUP BY u.id,u.wallet_address
       HAVING COALESCE(SUM(le.amount_credits) FILTER (
         WHERE le.kind IN ('offer_credit','offer_reversal','referral_credit','referral_reversal')
       ), 0) > 0
       ORDER BY total_earned DESC
       LIMIT 100`,
    );
    const leaderboard = result.rows.map((row) => ({
      wallet_address: maskWallet(String(row.wallet_address)),
      total_earned: row.total_earned,
      is_current_user: Number(row.id) === userId,
    }));
    const response = NextResponse.json({ leaderboard });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
