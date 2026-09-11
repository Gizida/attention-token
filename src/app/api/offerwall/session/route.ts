import { NextRequest, NextResponse } from 'next/server';

import { verifySession } from '@/lib/auth';
import { createOfferwallSession } from '@/lib/offerwall';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = await verifySession(token);
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
  }

  try {
    const session = createOfferwallSession(userId);
    const response = NextResponse.json(session);
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error('Offerwall session error:', error);
    return NextResponse.json(
      { error: 'Offers are not configured yet.' },
      { status: 503 },
    );
  }
}
