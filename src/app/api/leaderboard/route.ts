import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    // Instead of a heavy JOIN, we just read the pre-calculated view!
    const result = await db.query('SELECT * FROM leaderboard_view ORDER BY total_earned DESC LIMIT 100');

    const response = NextResponse.json({ leaderboard: result.rows });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}