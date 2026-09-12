import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserId } from '@/lib/request-auth';
import { createWithdrawalRequest, listUserWithdrawals } from '@/lib/withdrawals';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ withdrawals: await listUserWithdrawals(userId) });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const withdrawal = await createWithdrawalRequest({
      userId,
      credits: body.credits,
      idempotencyKey: request.headers.get('idempotency-key') || '',
    });
    return NextResponse.json({ withdrawal }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create withdrawal';
    const status = /temporarily paused/i.test(message) ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
