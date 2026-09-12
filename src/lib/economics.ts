import 'server-only';

import db from './db';
import type { QueryClient } from './ledger';
import { calculateUnreimbursedExposure, MAX_UNREIMBURSED_EXPOSURE_USD } from './reward-policy';

export async function getPayoutExposure(client: QueryClient = db) {
  const result = await client.query(
    `WITH baseline AS (
       SELECT COALESCE((SELECT cutover_at FROM platform_financial_baselines WHERE provider='offerwall.gg'), NOW()) AS cutover_at
     )
     SELECT
       COALESCE((SELECT SUM(usd_amount + COALESCE(actual_network_fee_usd, estimated_network_fee_usd, 0))
         FROM withdrawal_requests, baseline
         WHERE created_at >= baseline.cutover_at AND status='confirmed'),0) AS confirmed_usd,
       COALESCE((SELECT SUM(usd_amount + COALESCE(estimated_network_fee_usd,0))
         FROM withdrawal_requests, baseline
         WHERE created_at >= baseline.cutover_at
           AND status IN ('awaiting_review','queued','signing','signed','submitted','retryable')),0) AS reserved_usd,
       COALESCE((SELECT SUM(amount_received_usd)
         FROM provider_settlements, baseline
         WHERE provider='offerwall.gg' AND status='received'
           AND COALESCE(received_at,created_at) >= baseline.cutover_at),0) AS settlements_usd`,
  );
  const row = result.rows[0] ?? {};
  const confirmedUsd = Number(row.confirmed_usd ?? 0);
  const reservedUsd = Number(row.reserved_usd ?? 0);
  const settlementsUsd = Number(row.settlements_usd ?? 0);
  const exposureUsd = calculateUnreimbursedExposure({ confirmedUsd, reservedUsd, settlementsUsd });
  return {
    confirmedUsd,
    reservedUsd,
    settlementsUsd,
    exposureUsd,
    availableCapacityUsd: Math.max(0, MAX_UNREIMBURSED_EXPOSURE_USD - exposureUsd),
  };
}

export async function getEconomicsSnapshot() {
  const [exposure, result] = await Promise.all([
    getPayoutExposure(),
    db.query(
      `SELECT
         COALESCE(SUM(provider_payout_usd) FILTER (WHERE reconciliation_state='reconciled'),0) AS reconciled_revenue,
         COALESCE(SUM(payout_usd) FILTER (WHERE reconciliation_state='unreconciled'),0) AS callback_unreconciled,
         COALESCE(SUM(credits) FILTER (WHERE status='credited'),0) / 100 AS user_reward_usd,
         COALESCE(SUM(referral_commission) FILTER (WHERE status='credited'),0) / 100 AS referral_reward_usd,
         COALESCE(ABS(SUM(provider_payout_usd) FILTER (WHERE status='reversed')),0) AS reversal_usd,
         COALESCE(SUM(provider_payout_usd) FILTER (WHERE status='credited'),0) AS credited_provider_usd,
         COUNT(*) FILTER (WHERE reconciliation_state='conflict') AS conflicts,
         COUNT(*) FILTER (WHERE reconciliation_state='unreconciled') AS unreconciled
       FROM offerwall_conversions`,
    ),
  ]);
  const row = result.rows[0] ?? {};
  const reconciledRevenueUsd = Number(row.reconciled_revenue ?? 0);
  const userRewardUsd = Number(row.user_reward_usd ?? 0);
  const referralRewardUsd = Number(row.referral_reward_usd ?? 0);
  const creditedProviderUsd = Number(row.credited_provider_usd ?? 0);
  const reversalUsd = Number(row.reversal_usd ?? 0);
  return {
    reconciledRevenueUsd,
    callbackUnreconciledUsd: Number(row.callback_unreconciled ?? 0),
    userRewardUsd,
    referralRewardUsd,
    accruedMarginUsd: reconciledRevenueUsd - userRewardUsd - referralRewardUsd,
    realizedMarginUsd: exposure.settlementsUsd - exposure.confirmedUsd,
    reversalRate: creditedProviderUsd > 0 ? reversalUsd / creditedProviderUsd : 0,
    conflicts: Number(row.conflicts ?? 0),
    unreconciled: Number(row.unreconciled ?? 0),
    ...exposure,
    maxExposureUsd: MAX_UNREIMBURSED_EXPOSURE_USD,
  };
}
