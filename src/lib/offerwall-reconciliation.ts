import 'server-only';

import { randomUUID } from 'crypto';
import db from './db';
import { sendOperationsAlert } from './operations-alerts';
import { requireServerEnv } from './server-env';
import { assessOfferwallConversion } from './reward-policy';

type Conversion = {
  transactionId: string;
  userId: string;
  offerId?: string;
  offerName?: string;
  goalId?: string;
  currencyAmount: number;
  payoutUsd: number;
  status: 'pending' | 'credited' | 'rejected' | 'reversed';
  createdAt: string;
};

type StatsDay = {
  date: string; impressions: number; clicks: number; conversions: number; reversals: number;
  payoutUsd: number; conversionRate: number; epc: number;
};

async function offerwallGet<T>(pathname: string, params: Record<string, string>): Promise<T> {
  const url = new URL(pathname, 'https://offerwall.gg');
  url.searchParams.set('appId', requireServerEnv('OFFERWALL_GG_PUBLIC_KEY'));
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { 'X-Api-Key': requireServerEnv('OFFERWALL_GG_SECRET_KEY') },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Offerwall API ${pathname} returned ${response.status}`);
  const body = await response.json() as { success: boolean; data?: T; error?: string };
  if (!body.success || !body.data) throw new Error(body.error || `Offerwall API ${pathname} failed`);
  return body.data;
}

function reconciliationState(local: Record<string, unknown>, remote: Conversion) {
  const assessment = assessOfferwallConversion({
    localCredits: Number(local.credits), localStatus: String(local.status),
    currencyAmount: Number(remote.currencyAmount), payoutUsd: Number(remote.payoutUsd),
    providerStatus: remote.status,
  });
  return { state: assessment.conflict ? 'conflict' : 'reconciled', details: assessment };
}

export async function runOfferwallReconciliation() {
  const runId = randomUUID();
  await db.query(
    `INSERT INTO provider_reconciliation_runs(id,provider,status) VALUES ($1,'offerwall.gg','running')`,
    [runId],
  );
  let seen = 0;
  let matched = 0;
  let conflicts = 0;
  let unmatched = 0;
  try {
    const first = await offerwallGet<{ conversions: Conversion[]; pagination: { total?: number } }>(
      '/api/v1/conversions', { page: '1', limit: '200' },
    );
    const total = Number(first.pagination?.total ?? first.conversions.length);
    const pages = Math.max(1, Math.ceil(total / 200));
    const all = [...first.conversions];
    for (let page = 2; page <= pages; page++) {
      const next = await offerwallGet<{ conversions: Conversion[] }>(
        '/api/v1/conversions', { page: String(page), limit: '200' },
      );
      all.push(...next.conversions);
    }

    for (const remote of all) {
      seen++;
      const localResult = await db.query(
        `SELECT provider_transaction_id,credits,status FROM offerwall_conversions
         WHERE provider_transaction_id=$1 OR provider_transaction_id=$1 || ':reversal'
         ORDER BY created_at DESC LIMIT 1`,
        [remote.transactionId],
      );
      const local = localResult.rows[0];
      if (!local) {
        if (remote.status === 'credited' || remote.status === 'reversed') unmatched++;
        continue;
      }
      matched++;
      const assessment = reconciliationState(local, remote);
      if (assessment.state === 'conflict') conflicts++;
      await db.query(
        `UPDATE offerwall_conversions SET
           provider_payout_usd=$2, provider_status=$3, provider_created_at=$4,
           reconciled_at=NOW(), reconciliation_state=$5, reconciliation_details=$6::jsonb
         WHERE provider_transaction_id=$1`,
        [local.provider_transaction_id, remote.payoutUsd, remote.status, remote.createdAt,
          assessment.state, JSON.stringify(assessment.details)],
      );
    }

    const stats = await offerwallGet<{
      days: number; totals: Record<string, number>; series: StatsDay[];
    }>('/api/v1/stats', { days: '365' });
    for (const day of stats.series) {
      await db.query(
        `INSERT INTO provider_daily_stats
           (provider,stat_date,impressions,clicks,conversions,reversals,payout_usd,conversion_rate,epc,reconciled_at)
         VALUES ('offerwall.gg',$1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT(provider,stat_date) DO UPDATE SET
           impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks,
           conversions=EXCLUDED.conversions, reversals=EXCLUDED.reversals,
           payout_usd=EXCLUDED.payout_usd, conversion_rate=EXCLUDED.conversion_rate,
           epc=EXCLUDED.epc, reconciled_at=NOW()`,
        [day.date, day.impressions, day.clicks, day.conversions, day.reversals,
          day.payoutUsd, day.conversionRate, day.epc],
      );
    }
    await db.query(
      `UPDATE provider_reconciliation_runs SET status='succeeded',conversions_seen=$2,
         conversions_matched=$3,conflicts=$4,unmatched=$5,stats=$6::jsonb,completed_at=NOW()
       WHERE id=$1`,
      [runId, seen, matched, conflicts, unmatched, JSON.stringify(stats)],
    );
    if (conflicts || unmatched) {
      await sendOperationsAlert(
        'Offerwall reconciliation needs review',
        `${conflicts} conflicts and ${unmatched} credited or reversed conversions were unmatched.`,
      ).catch(console.error);
    }
    return { runId, seen, matched, conflicts, unmatched };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown reconciliation error';
    await db.query(
      `UPDATE provider_reconciliation_runs SET status='failed',error=$2,completed_at=NOW() WHERE id=$1`,
      [runId, message.slice(0, 2000)],
    );
    throw error;
  }
}
