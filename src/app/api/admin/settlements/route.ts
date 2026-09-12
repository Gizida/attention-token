import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import db from '@/lib/db';
import { requireAdminUserId } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!await requireAdminUserId(request)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const result = await db.query(
    `SELECT id,provider,period_start,period_end,expected_usd,amount_received_usd,status,
       external_reference,note,received_at,created_at FROM provider_settlements
     ORDER BY period_end DESC LIMIT 100`,
  );
  return NextResponse.json({ settlements: result.rows });
}

export async function POST(request: NextRequest) {
  const adminUserId = await requireAdminUserId(request);
  if (!adminUserId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const idempotencyKey = request.headers.get('idempotency-key') || '';
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey)) {
    return NextResponse.json({ error: 'A valid Idempotency-Key is required' }, { status: 400 });
  }
  const body = await request.json().catch(() => ({}));
  const amount = Number(body.amountReceivedUsd);
  const start = String(body.periodStart || '');
  const end = String(body.periodEnd || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)
    || !Number.isFinite(amount) || amount < 0 || amount > 1_000_000) {
    return NextResponse.json({ error: 'Valid dates and received amount are required' }, { status: 400 });
  }
  try {
    const result = await db.query(
      `INSERT INTO provider_settlements
         (id,provider,period_start,period_end,expected_usd,amount_received_usd,status,
          idempotency_key,external_reference,note,recorded_by,received_at)
       VALUES ($1,'offerwall.gg',$2,$3,$4,$5,'received',$6,$7,$8,$9,NOW())
       ON CONFLICT(provider,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key
       RETURNING *`,
      [randomUUID(), start, end, body.expectedUsd ?? null, amount, idempotencyKey,
        String(body.externalReference || '').slice(0, 200) || null,
        String(body.note || '').slice(0, 1000) || null, adminUserId],
    );
    return NextResponse.json({ settlement: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to record settlement' }, { status: 400 });
  }
}
