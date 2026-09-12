import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireAdminUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!await requireAdminUserId(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const result = await db.query(
    `SELECT id,user_id,destination_wallet,credits,usd_amount,sol_lamports,status,
       quote_expires_at,review_reason,tx_signature,last_error,requires_step_up,step_up_verified_at,
       risk_reasons,created_at,updated_at
     FROM withdrawal_requests ORDER BY created_at DESC LIMIT 100`,
  );
  return NextResponse.json({ withdrawals: result.rows });
}
