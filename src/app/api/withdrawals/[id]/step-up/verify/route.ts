import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import nacl from 'tweetnacl';

import db from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const nonceHash = crypto.createHash('sha256').update(String(body.nonce || '')).digest('hex');
  const nonceResult = await db.query(
    `SELECT message,wallet_address FROM withdrawal_step_up_nonces
     WHERE nonce_hash=$1 AND withdrawal_request_id=$2 AND user_id=$3
       AND consumed_at IS NULL AND expires_at>NOW()`,
    [nonceHash, id, userId],
  );
  const record = nonceResult.rows[0];
  if (!record) return NextResponse.json({ error: 'Verification challenge expired or already used' }, { status: 401 });
  try {
    const signature = bs58.decode(String(body.signature || ''));
    const valid = signature.length === 64 && nacl.sign.detached.verify(
      new TextEncoder().encode(record.message), signature, new PublicKey(record.wallet_address).toBytes(),
    );
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const consumed = await client.query(
      `UPDATE withdrawal_step_up_nonces SET consumed_at=NOW()
       WHERE nonce_hash=$1 AND consumed_at IS NULL AND expires_at>NOW() RETURNING nonce_hash`,
      [nonceHash],
    );
    if (!consumed.rows[0]) throw new Error('Verification challenge already used');
    const updated = await client.query(
      `UPDATE withdrawal_requests SET step_up_verified_at=NOW(),updated_at=NOW()
       WHERE id=$1 AND user_id=$2 AND status='awaiting_review' AND requires_step_up=TRUE RETURNING id`,
      [id, userId],
    );
    if (!updated.rows[0]) throw new Error('Withdrawal is unavailable');
    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Verification failed' }, { status: 409 });
  } finally {
    client.release();
  }
}
