import { NextRequest, NextResponse } from 'next/server';

import { requireAdminUserId } from '@/lib/request-auth';
import { releaseWithdrawal } from '@/lib/withdrawals';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const adminUserId = await requireAdminUserId(request);
  if (!adminUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 3 || reason.length > 500) {
    return NextResponse.json({ error: 'A rejection reason between 3 and 500 characters is required' }, { status: 400 });
  }
  const { id } = await context.params;
  const rejected = await releaseWithdrawal({ requestId: id, status: 'rejected', actorUserId: adminUserId, reason });
  return rejected
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Only unsigned requests can be rejected' }, { status: 409 });
}
