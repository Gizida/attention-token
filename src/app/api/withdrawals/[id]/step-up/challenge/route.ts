import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/request-auth';
import { enforceRateLimit } from '@/lib/risk';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rate = await enforceRateLimit({ identity: String(userId), bucket: 'withdrawal_step_up', limit: 5, windowSeconds: 600 });
  if (!rate.allowed) return NextResponse.json({ error: 'Too many verification attempts.' }, { status: 429 });
  const { id } = await context.params;
  const result = await db.query(
    `SELECT wr.id,u.wallet_address FROM withdrawal_requests wr JOIN users u ON u.id=wr.user_id
     WHERE wr.id=$1 AND wr.user_id=$2 AND wr.status='awaiting_review'
       AND wr.requires_step_up=TRUE AND wr.step_up_verified_at IS NULL`,
    [id, userId],
  );
  if (!result.rows[0]) return NextResponse.json({ error: 'Verification is unavailable for this request' }, { status: 409 });
  const nonce = crypto.randomBytes(18).toString('base64url');
  const nonceHash = crypto.createHash('sha256').update(nonce).digest('hex');
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 10 * 60_000);
  const domain = process.env.AUTH_DOMAIN?.trim() || request.nextUrl.host;
  const message = [
    `${domain} withdrawal verification`, `Wallet: ${result.rows[0].wallet_address}`,
    `Withdrawal: ${id}`, 'Purpose: manual payout review', `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`, `Expiration Time: ${expiresAt.toISOString()}`,
    'This signature does not create a blockchain transaction.',
  ].join('\n');
  await db.query(
    `INSERT INTO withdrawal_step_up_nonces
       (nonce_hash,withdrawal_request_id,user_id,wallet_address,message,expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [nonceHash, id, userId, result.rows[0].wallet_address, message, expiresAt],
  );
  return NextResponse.json({ nonce, message, expiresAt: expiresAt.toISOString() });
}
