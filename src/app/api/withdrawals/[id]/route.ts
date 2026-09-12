import { NextRequest, NextResponse } from 'next/server';

import { getAuthenticatedUserId } from '@/lib/request-auth';
import { getUserWithdrawal } from '@/lib/withdrawals';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const withdrawal = await getUserWithdrawal(userId, id);
  return withdrawal
    ? NextResponse.json({ withdrawal })
    : NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });
}
