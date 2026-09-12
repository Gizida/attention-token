import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { getAuthenticatedUserId } from '@/lib/request-auth';

export async function GET(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const result = await db.query(
    `SELECT u.referral_code,
       (SELECT COUNT(*) FROM users WHERE referred_by=$1) AS total_referrals,
       COALESCE(SUM(le.amount_credits) FILTER (WHERE le.kind IN ('referral_credit','referral_reversal')),0) AS total_earned_all_time,
       COALESCE(SUM(le.amount_credits) FILTER (WHERE le.kind IN ('referral_credit','referral_reversal') AND le.available_at>NOW()),0) AS pending_referral_balance
     FROM users u LEFT JOIN credit_ledger_entries le ON le.user_id=u.id
     WHERE u.id=$1 GROUP BY u.id,u.referral_code`,
    [userId],
  );
  return NextResponse.json({ affiliateData: result.rows[0] });
}

export async function POST(request: NextRequest) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({
    success: true,
    claimedAmount: 0,
    message: 'Referral rewards now become available automatically after seven days.',
  });
}
