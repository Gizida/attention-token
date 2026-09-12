import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserId } from '@/lib/request-auth';
import { enforceRateLimit, requestFingerprint } from '@/lib/risk';
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
    const rate = await enforceRateLimit({ identity: String(userId), bucket: 'withdrawal_create', limit: 5, windowSeconds: 3600 });
    if (!rate.allowed) return NextResponse.json({ error: 'Too many withdrawal requests. Try again later.' }, { status: 429 });
    const body = await request.json();
    const withdrawal = await createWithdrawalRequest({
      userId,
      credits: body.credits,
      idempotencyKey: request.headers.get('idempotency-key') || '',
      networkFingerprint: requestFingerprint(request),
    });
    return NextResponse.json({ withdrawal }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create withdrawal';
    const status = /temporarily paused/i.test(message) ? 503 : message === 'PAYOUT_CAPACITY_REACHED' ? 409 : 400;
    return NextResponse.json({ error: message === 'PAYOUT_CAPACITY_REACHED' ? 'Payout capacity is temporarily full. Your credits were not reserved.' : message, code: message === 'PAYOUT_CAPACITY_REACHED' ? message : undefined }, { status });
  }
}
