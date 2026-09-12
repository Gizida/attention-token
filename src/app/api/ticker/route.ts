import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const result = await db.query(
      `SELECT t.sol_amount,
              LEFT(u.wallet_address, 4) || '…' || RIGHT(u.wallet_address, 4) AS wallet_address
       FROM transactions t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.type = 'withdraw' AND t.status = 'completed' AND t.sol_amount IS NOT NULL 
       ORDER BY t.created_at DESC LIMIT 20`
    );

    const response = NextResponse.json({ ticker: result.rows });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Ticker fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
