import { NextRequest, NextResponse } from 'next/server';

import { runOfferwallReconciliation } from '@/lib/offerwall-reconciliation';
import { sendOperationsAlert } from '@/lib/operations-alerts';
import { requireServerEnv } from '@/lib/server-env';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${requireServerEnv('CRON_SECRET')}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runOfferwallReconciliation());
  } catch (error) {
    console.error('Offerwall reconciliation failed', error);
    await sendOperationsAlert(
      'Offerwall reconciliation failed',
      error instanceof Error ? error.message : 'Unknown reconciliation error',
    ).catch(console.error);
    return NextResponse.json({ error: 'Offerwall reconciliation failed' }, { status: 500 });
  }
}
