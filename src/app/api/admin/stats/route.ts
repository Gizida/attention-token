import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireAdminUserId } from '@/lib/request-auth';

export async function GET(request: NextRequest) {
  if (!await requireAdminUserId(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const result = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       COALESCE((SELECT SUM(amount_credits) FROM credit_ledger_entries),0) AS total_entitlements,
       COALESCE((SELECT SUM(amount_credits) FROM credit_ledger_entries WHERE kind IN ('offer_credit','referral_credit')),0) AS total_earned,
       COALESCE((SELECT SUM(credits) FROM withdrawal_requests WHERE status='confirmed'),0) AS total_withdrawn,
       (SELECT COUNT(*) FROM withdrawal_requests WHERE status='awaiting_review') AS awaiting_review`,
  );
  const row = result.rows[0];
  return NextResponse.json({
    totalUsers: Number(row.total_users),
    totalEntitlements: Number(row.total_entitlements),
    totalEarned: Number(row.total_earned),
    totalWithdrawn: Number(row.total_withdrawn),
    awaitingReview: Number(row.awaiting_review),
  });
}
