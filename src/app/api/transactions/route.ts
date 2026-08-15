import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = await verifySession(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const result = await db.query(
      'SELECT type, amount, sol_amount, provider, status, created_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    const response = NextResponse.json({ transactions: result.rows });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}