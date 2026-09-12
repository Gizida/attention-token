import { NextRequest, NextResponse } from 'next/server';

import { getEconomicsSnapshot } from '@/lib/economics';
import { requireAdminUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!await requireAdminUserId(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await getEconomicsSnapshot());
}
