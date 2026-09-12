import { NextRequest, NextResponse } from 'next/server';

import { issueInvites, listInvites } from '@/lib/invites';
import { requireAdminUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!await requireAdminUserId(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ invites: await listInvites() });
}

export async function POST(request: NextRequest) {
  const adminUserId = await requireAdminUserId(request);
  if (!adminUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json({ invites: await issueInvites({ issuerUserId: adminUserId, count: Number(body.count || 1), admin: true }) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to issue invites' }, { status: 409 });
  }
}
