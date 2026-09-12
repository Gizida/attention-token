import 'server-only';

import crypto, { randomUUID } from 'crypto';
import db from './db';

export function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashInviteCode(code: string) {
  return crypto.createHash('sha256').update(normalizeInviteCode(code)).digest('hex');
}

function createCode() {
  const raw = crypto.randomBytes(10).toString('hex').toUpperCase();
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}-${raw.slice(15)}`;
}

export async function issueInvites(input: { issuerUserId: number; count: number; admin: boolean }) {
  const count = Math.min(input.admin ? 25 : 2, Math.max(1, Math.trunc(input.count)));
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT invite_allowance FROM users WHERE id=$1 FOR UPDATE', [input.issuerUserId]);
    if (!user.rows[0]) throw new Error('User not found');
    if (!input.admin) {
      const issued = await client.query(
        `SELECT COUNT(*) AS count FROM beta_invites WHERE issued_by=$1 AND revoked_at IS NULL`,
        [input.issuerUserId],
      );
      if (Number(issued.rows[0].count) + count > Number(user.rows[0].invite_allowance)) {
        throw new Error('Invite allowance reached');
      }
    }
    const invitations = [];
    for (let index = 0; index < count; index++) {
      const code = createCode();
      const result = await client.query(
        `INSERT INTO beta_invites(id,code_hash,issued_by,expires_at)
         VALUES ($1,$2,$3,NOW()+INTERVAL '30 days') RETURNING id,expires_at`,
        [randomUUID(), hashInviteCode(code), input.issuerUserId],
      );
      invitations.push({ id: result.rows[0].id, code, expiresAt: result.rows[0].expires_at });
    }
    await client.query('COMMIT');
    return invitations;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listInvites(issuerUserId?: number) {
  const result = await db.query(
    `SELECT bi.id,bi.issued_by,bi.redeemed_by,bi.expires_at,bi.redeemed_at,bi.revoked_at,bi.created_at,
       u.wallet_address AS redeemed_wallet
     FROM beta_invites bi LEFT JOIN users u ON u.id=bi.redeemed_by
     WHERE ($1::bigint IS NULL OR bi.issued_by=$1) ORDER BY bi.created_at DESC LIMIT 200`,
    [issuerUserId ?? null],
  );
  return result.rows.map((row) => ({
    ...row,
    redeemed_wallet: row.redeemed_wallet
      ? `${String(row.redeemed_wallet).slice(0, 4)}…${String(row.redeemed_wallet).slice(-4)}` : null,
  }));
}
