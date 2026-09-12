import 'server-only';

import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import db from './db';
import type { QueryClient } from './ledger';

export function requestFingerprint(request: NextRequest): string | null {
  const secret = process.env.RISK_HMAC_SECRET?.trim();
  if (!secret) return null;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim();
  if (!forwarded) return null;
  return crypto.createHmac('sha256', secret).update(forwarded).digest('hex');
}

export async function enforceRateLimit(input: {
  identity: string; bucket: string; limit: number; windowSeconds: number;
}) {
  const identityHash = crypto.createHash('sha256').update(input.identity).digest('hex');
  const result = await db.query(
    `INSERT INTO rate_limit_buckets(identity_hash,bucket,request_count,window_started_at,expires_at)
     VALUES ($1,$2,1,NOW(),NOW()+($3::text || ' seconds')::interval)
     ON CONFLICT(identity_hash,bucket) DO UPDATE SET
       request_count=CASE WHEN rate_limit_buckets.expires_at<=NOW() THEN 1 ELSE rate_limit_buckets.request_count+1 END,
       window_started_at=CASE WHEN rate_limit_buckets.expires_at<=NOW() THEN NOW() ELSE rate_limit_buckets.window_started_at END,
       expires_at=CASE WHEN rate_limit_buckets.expires_at<=NOW() THEN NOW()+($3::text || ' seconds')::interval ELSE rate_limit_buckets.expires_at END
     RETURNING request_count,expires_at`,
    [identityHash, input.bucket, input.windowSeconds],
  );
  return { allowed: Number(result.rows[0].request_count) <= input.limit, expiresAt: result.rows[0].expires_at };
}

export async function assessWithdrawalRisk(client: QueryClient, userId: number, fingerprint: string | null) {
  const result = await client.query(
    `SELECT
       NOT EXISTS (SELECT 1 FROM withdrawal_requests WHERE user_id=$1 AND status='confirmed') AS first_withdrawal,
       (SELECT COUNT(*) FROM withdrawal_requests WHERE user_id=$1 AND created_at>NOW()-INTERVAL '1 hour') AS recent_requests,
       COALESCE((SELECT ABS(SUM(credits)) FILTER (WHERE status='reversed') /
         NULLIF(SUM(credits) FILTER (WHERE status='credited'),0)
         FROM offerwall_conversions WHERE user_id=$1),0) AS reversal_ratio,
       COALESCE((SELECT COUNT(DISTINCT id) FROM users
         WHERE network_fingerprint_hmac=$2 AND id<>$1),0) AS shared_network_users`,
    [userId, fingerprint],
  );
  const row = result.rows[0] ?? {};
  const reasons: string[] = [];
  if (row.first_withdrawal) reasons.push('first_withdrawal');
  if (Number(row.recent_requests) >= 2) reasons.push('request_velocity');
  if (Number(row.reversal_ratio) >= 0.1) reasons.push('elevated_reversal_ratio');
  if (fingerprint && Number(row.shared_network_users) >= 2) reasons.push('shared_network_cluster');
  return { requiresStepUp: reasons.length > 0, reasons };
}
