import { NextRequest, NextResponse } from 'next/server';

import { issueInvites, listInvites } from '@/lib/invites';
import { getAuthenticatedUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ invites: await listInvites(userId) });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json({ invites: await issueInvites({ issuerUserId: userId, count: Number(body.count || 1), admin: false }) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to issue invite' }, { status: 409 });
  }
}
