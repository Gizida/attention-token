import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireAdminUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!await requireAdminUserId(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await context.params;
  const result = await db.query(
    `UPDATE beta_invites SET revoked_at=NOW()
     WHERE id=$1 AND redeemed_at IS NULL AND revoked_at IS NULL RETURNING id`,
    [id],
  );
  return result.rows[0]
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Invite is unavailable' }, { status: 409 });
}
