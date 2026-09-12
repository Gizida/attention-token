import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireAdminUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!await requireAdminUserId(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 120);
  const conflictsOnly = request.nextUrl.searchParams.get('conflicts') === 'true';
  const result = await db.query(
    `SELECT oc.public_id,oc.user_id,u.wallet_address,oc.offer_name,oc.goal_id,oc.credits,
       oc.status,oc.provider_payout_usd,oc.provider_status,oc.reconciliation_state,
       oc.reconciliation_details,oc.created_at,oc.reconciled_at
     FROM offerwall_conversions oc JOIN users u ON u.id=oc.user_id
     WHERE ($1='' OR u.wallet_address ILIKE '%'||$1||'%' OR oc.public_id::text=$1)
       AND (NOT $2::boolean OR oc.reconciliation_state='conflict')
     ORDER BY oc.created_at DESC LIMIT 100`,
    [q, conflictsOnly],
  );
  return NextResponse.json({ conversions: result.rows.map((row) => ({
    ...row,
    wallet_address: `${String(row.wallet_address).slice(0, 4)}…${String(row.wallet_address).slice(-4)}`,
    credits: Number(row.credits),
    provider_payout_usd: row.provider_payout_usd === null ? null : Number(row.provider_payout_usd),
  })) });
}
