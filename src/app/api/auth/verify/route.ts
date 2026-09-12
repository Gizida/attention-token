import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { getCreditBalances } from '@/lib/ledger';
import { getAuthenticatedUserId, isAdminWallet } from '@/lib/request-auth';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  const result = await db.query('SELECT id,wallet_address FROM users WHERE id=$1', [userId]);
  if (!result.rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const balances = await getCreditBalances(db, userId);
  const response = NextResponse.json({
    user: {
      ...result.rows[0],
      balance: balances.available,
      balances,
      isAdmin: isAdminWallet(result.rows[0].wallet_address),
    },
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  return response;
}
