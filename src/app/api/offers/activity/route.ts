import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(request.nextUrl.searchParams.get('limit') || '20', 10) || 20));
  const offset = (page - 1) * limit;
  const [rows, count] = await Promise.all([
    db.query(
      `SELECT oc.public_id,oc.offer_name,oc.goal_id,oc.credits,oc.status,oc.created_at,
         oc.reconciliation_state,cle.available_at
       FROM offerwall_conversions oc
       LEFT JOIN credit_ledger_entries cle
         ON cle.user_id=oc.user_id AND cle.source_id=oc.provider_transaction_id
       WHERE oc.user_id=$1 ORDER BY oc.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    db.query('SELECT COUNT(*) AS total FROM offerwall_conversions WHERE user_id=$1', [userId]),
  ]);
  const publicKey = process.env.OFFERWALL_GG_PUBLIC_KEY?.trim();
  const supportUrl = publicKey
    ? `https://offerwall.gg/wall/${encodeURIComponent(publicKey)}/support?userId=${encodeURIComponent(String(userId))}`
    : null;
  return NextResponse.json({
    activity: rows.rows.map((row) => ({
      id: row.public_id,
      offerName: row.offer_name || 'Partner offer',
      goalId: row.goal_id,
      credits: Number(row.credits),
      status: row.status,
      availability: row.status === 'reversed' ? 'reversed'
        : row.reconciliation_state === 'conflict' ? 'under_review'
          : row.available_at && new Date(row.available_at) <= new Date() ? 'available' : 'pending',
      availableAt: row.available_at ? new Date(row.available_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    })),
    pagination: { page, limit, total: Number(count.rows[0]?.total ?? 0) },
    supportUrl,
  });
}
