import 'server-only';

import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import db from './db';
import { envFlag, requireServerEnv } from './server-env';
import { hashInviteCode } from './invites';

export const CURRENT_TERMS_VERSION = '2026-09-12';
const SIGNUP_ADVISORY_LOCK = 728_410_026;

function jwtSecret(): string {
  return requireServerEnv('JWT_SECRET');
}

function sanitizeAttribution(value: unknown) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/[^A-Za-z0-9._~-]/g, '').slice(0, 80);
  return cleaned || null;
}

export async function getOrCreateUser(input: {
  walletAddress: string;
  refCode?: string | null;
  inviteCode?: string | null;
  adultAttested: boolean;
  termsVersion: string;
  acquisition?: { source?: unknown; campaign?: unknown; content?: unknown };
  networkFingerprint?: string | null;
}) {
  if (!input.adultAttested || input.termsVersion !== CURRENT_TERMS_VERSION) {
    throw new Error('You must confirm that you are at least 18 and accept the current terms.');
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [SIGNUP_ADVISORY_LOCK]);
    const existing = await client.query('SELECT * FROM users WHERE wallet_address=$1 FOR UPDATE', [input.walletAddress]);
    if (existing.rows[0]) {
      const updated = await client.query(
        `UPDATE users SET last_login=NOW(),adult_attested_at=COALESCE(adult_attested_at,NOW()),
           terms_version=$2,terms_accepted_at=CASE WHEN terms_version IS DISTINCT FROM $2 THEN NOW() ELSE COALESCE(terms_accepted_at,NOW()) END,
           network_fingerprint_hmac=COALESCE($3,network_fingerprint_hmac)
         WHERE id=$1 RETURNING *`,
        [existing.rows[0].id, CURRENT_TERMS_VERSION, input.networkFingerprint ?? null],
      );
      await client.query('COMMIT');
      return updated.rows[0];
    }

    const invitesRequired = envFlag('BETA_INVITES_REQUIRED', process.env.NODE_ENV === 'production');
    let invitation: Record<string, unknown> | null = null;
    if (input.inviteCode) {
      const inviteResult = await client.query(
        `SELECT * FROM beta_invites WHERE code_hash=$1 AND redeemed_at IS NULL
           AND revoked_at IS NULL AND expires_at>NOW() FOR UPDATE`,
        [hashInviteCode(input.inviteCode)],
      );
      invitation = inviteResult.rows[0] ?? null;
    }
    if (invitesRequired && !invitation) throw new Error('A valid beta invitation is required.');

    const cap = Math.max(1, Number.parseInt(process.env.BETA_USER_CAP || '50', 10) || 50);
    const userCount = await client.query('SELECT COUNT(*) AS count FROM users');
    if (Number(userCount.rows[0].count) >= cap) throw new Error('The beta is currently full.');

    let referrerId: number | null = null;
    if (input.refCode) {
      const referrer = await client.query('SELECT id FROM users WHERE referral_code=$1 FOR UPDATE', [input.refCode]);
      referrerId = referrer.rows[0] ? Number(referrer.rows[0].id) : null;
    }
    const referralCode = crypto.createHash('sha256').update(input.walletAddress).digest('hex').slice(0, 8);
    const inserted = await client.query(
      `INSERT INTO users
         (wallet_address,referral_code,referred_by,adult_attested_at,terms_version,
          terms_accepted_at,acquisition_source,acquisition_campaign,acquisition_content,
          network_fingerprint_hmac,beta_invite_id)
       VALUES ($1,$2,$3,NOW(),$4,NOW(),$5,$6,$7,$8,$9) RETURNING *`,
      [input.walletAddress, referralCode, referrerId, CURRENT_TERMS_VERSION,
        sanitizeAttribution(input.acquisition?.source), sanitizeAttribution(input.acquisition?.campaign),
        sanitizeAttribution(input.acquisition?.content), input.networkFingerprint ?? null,
        invitation?.id ?? null],
    );
    if (invitation) {
      await client.query(
        'UPDATE beta_invites SET redeemed_by=$2,redeemed_at=NOW() WHERE id=$1',
        [invitation.id, inserted.rows[0].id],
      );
    }
    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
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
    const result = await db.query('SELECT user_id FROM sessions WHERE token=$1 AND expires_at>NOW()', [token]);
    if (!result.rows[0] || Number(result.rows[0].user_id) !== decoded.userId) return null;
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function createAuthChallenge(input: { walletAddress: string; origin: string; domain: string }) {
  const nonce = crypto.randomBytes(18).toString('base64url');
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + 5 * 60_000);
  const message = [
    `${input.domain} wants you to sign in with your Solana account:`, input.walletAddress, '',
    'Sign in to Attention Token. This request does not create a blockchain transaction.', '',
    `URI: ${input.origin}`, 'Version: 1', 'Chain ID: solana', `Nonce: ${nonce}`,
    `Issued At: ${issuedAt.toISOString()}`, `Expiration Time: ${expiresAt.toISOString()}`,
  ].join('\n');
  const nonceHash = crypto.createHash('sha256').update(nonce).digest('hex');
  await db.query(
    `INSERT INTO auth_nonces (nonce_hash,wallet_address,message,expires_at) VALUES ($1,$2,$3,$4)`,
    [nonceHash, input.walletAddress, message, expiresAt],
  );
  void db.query("DELETE FROM auth_nonces WHERE expires_at < NOW()-INTERVAL '1 day'");
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
