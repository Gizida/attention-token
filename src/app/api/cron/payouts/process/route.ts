import { NextRequest, NextResponse } from 'next/server';

import { runPayoutProcessor } from '@/lib/payout-worker';
import { sendOperationsAlert } from '@/lib/operations-alerts';
import { requireServerEnv } from '@/lib/server-env';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${requireServerEnv('CRON_SECRET')}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runPayoutProcessor());
  } catch (error) {
    console.error('Payout processor failed', error);
    await sendOperationsAlert(
      'Payout processor job failed',
      error instanceof Error ? error.message : 'Unknown payout processor error',
    ).catch(console.error);
    return NextResponse.json({ error: 'Payout processor failed' }, { status: 500 });
  }
}
