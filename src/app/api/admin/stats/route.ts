import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const userId = await verifySession(token);
    if (!userId) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    // Verify this user is an admin
    const userRes = await db.query('SELECT wallet_address FROM users WHERE id = $1', [userId]);
    if (userRes.rows[0].wallet_address !== process.env.ADMIN_WALLET_ADDRESS) {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // Fetch platform statistics
    const totalUsers = await db.query('SELECT COUNT(*) FROM users');
    const totalEntitlements = await db.query('SELECT SUM(balance) FROM users');
    const totalWithdrawn = await db.query("SELECT SUM(amount) FROM transactions WHERE type = 'withdraw'");
    const totalEarned = await db.query("SELECT SUM(amount) FROM transactions WHERE type = 'earn'");

    return NextResponse.json({
      totalUsers: totalUsers.rows[0].count,
      totalEntitlements: totalEntitlements.rows[0].sum || 0,
      totalWithdrawn: totalWithdrawn.rows[0].sum || 0,
      totalEarned: totalEarned.rows[0].sum || 0,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}