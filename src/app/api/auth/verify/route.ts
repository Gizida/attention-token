import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    // Get the auth-token cookie from the request headers
    const cookieHeader = req.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth-token=([^;]+)/);
    
    if (!tokenMatch) {
      return NextResponse.json({ error: 'No token' }, { status: 401 });
    }
    
    const token = tokenMatch[1];
    const userId = await verifySession(token);
    
    if (!userId) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    // Get user info from DB
    const db = (await import('@/lib/db')).default;
    const userResult = await db.query('SELECT id, wallet_address, balance FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({ user: userResult.rows[0] });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
    
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}