import 'server-only';

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import db from './db';
import { requireServerEnv } from './server-env';

function jwtSecret(): string {
  return requireServerEnv('JWT_SECRET');
}

export async function getOrCreateUser(walletAddress: string, refCode?: string | null) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM users WHERE wallet_address=$1 FOR UPDATE', [walletAddress]);
    if (existing.rows[0]) {
      await client.query('UPDATE users SET last_login=NOW() WHERE id=$1', [existing.rows[0].id]);
      await client.query('COMMIT');
      return existing.rows[0];
    }

    let referrerId: number | null = null;
    if (refCode) {
      const referrer = await client.query('SELECT id FROM users WHERE referral_code=$1 FOR UPDATE', [refCode]);
      referrerId = referrer.rows[0] ? Number(referrer.rows[0].id) : null;
    }
    const referralCode = crypto.createHash('sha256').update(walletAddress).digest('hex').slice(0, 8);
    const inserted = await client.query(
      `INSERT INTO users (wallet_address, referral_code, referred_by)
       VALUES ($1,$2,$3) RETURNING *`,
      [walletAddress, referralCode, referrerId],
    );
    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if ((error as { code?: string }).code === '23505') {
      const existing = await db.query('SELECT * FROM users WHERE wallet_address=$1', [walletAddress]);
      if (existing.rows[0]) return existing.rows[0];
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function createSession(userId: number) {
  const token = jwt.sign({ userId }, jwtSecret(), { expiresIn: '7d' });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
    await client.query('INSERT INTO sessions (user_id,token,expires_at) VALUES ($1,$2,$3)', [userId, token, expiresAt]);
    await client.query('COMMIT');
    return token;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function verifySession(token: string) {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as { userId: number };
    const result = await db.query(
      'SELECT user_id FROM sessions WHERE token=$1 AND expires_at>NOW()',
      [token],
    );
    if (!result.rows[0] || Number(result.rows[0].user_id) !== decoded.userId) return null;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function createAuthChallenge(input: {
  walletAddress: string;
  origin: string;
  domain: string;
}) {
  const nonce = crypto.randomBytes(18).toString('base64url');
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 5 * 60_000);
  const message = [
    `${input.domain} wants you to sign in with your Solana account:`,
    input.walletAddress,
    '',
    'Sign in to Attention Token. This request does not create a blockchain transaction.',
    '',
    `URI: ${input.origin}`,
    'Version: 1',
    'Chain ID: solana',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
  ].join('\n');
  const nonceHash = crypto.createHash('sha256').update(nonce).digest('hex');
  await db.query(
    `INSERT INTO auth_nonces (nonce_hash,wallet_address,message,expires_at)
     VALUES ($1,$2,$3,$4)`,
    [nonceHash, input.walletAddress, message, expiresAt],
  );
  void db.query('DELETE FROM auth_nonces WHERE expires_at < NOW()-INTERVAL \'1 day\'');
  return { nonce, message, expiresAt };
}

export async function consumeAuthChallenge(input: { nonce: string; walletAddress: string }) {
  const hash = crypto.createHash('sha256').update(input.nonce).digest('hex');
  const result = await db.query(
    `UPDATE auth_nonces SET consumed_at=NOW()
     WHERE nonce_hash=$1 AND wallet_address=$2 AND consumed_at IS NULL AND expires_at>NOW()
     RETURNING message`,
    [hash, input.walletAddress],
  );
  return result.rows[0]?.message as string | undefined;
}
