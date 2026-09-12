import { NextRequest, NextResponse } from 'next/server';

import { requireAdminUserId } from '@/lib/request-auth';
import { approveWithdrawal } from '@/lib/withdrawals';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const adminUserId = await requireAdminUserId(request);
  if (!adminUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await context.params;
    const approved = await approveWithdrawal(id, adminUserId);
    return approved
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: 'Request is unavailable or expired' }, { status: 409 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Approval failed' }, { status: 400 });
  }
}
