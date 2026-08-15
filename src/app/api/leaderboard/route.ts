import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Join users with their 'earn' transactions, sum them up, and sort descending
    const result = await db.query(`
      SELECT 
        u.wallet_address, 
        COALESCE(SUM(t.amount), 0) as total_earned
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id AND t.type = 'earn'
      GROUP BY u.id, u.wallet_address
      HAVING COALESCE(SUM(t.amount), 0) > 0
      ORDER BY total_earned DESC
      LIMIT 100
    `);

    const response = NextResponse.json({ leaderboard: result.rows });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}