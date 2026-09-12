BEGIN;

ALTER TABLE offerwall_conversions ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();
UPDATE offerwall_conversions SET public_id=gen_random_uuid() WHERE public_id IS NULL;
ALTER TABLE offerwall_conversions ALTER COLUMN public_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS offerwall_conversions_public_id_key ON offerwall_conversions(public_id);

ALTER TABLE offerwall_conversions ADD COLUMN IF NOT EXISTS provider_payout_usd NUMERIC(20, 8);
ALTER TABLE offerwall_conversions ADD COLUMN IF NOT EXISTS provider_status TEXT;
ALTER TABLE offerwall_conversions ADD COLUMN IF NOT EXISTS provider_created_at TIMESTAMPTZ;
ALTER TABLE offerwall_conversions ADD COLUMN IF NOT EXISTS reconciled_at TIMESTAMPTZ;
ALTER TABLE offerwall_conversions ADD COLUMN IF NOT EXISTS reconciliation_state TEXT NOT NULL DEFAULT 'unreconciled';
ALTER TABLE offerwall_conversions ADD COLUMN IF NOT EXISTS reconciliation_details JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS offerwall_conversions_reconciliation_idx
  ON offerwall_conversions(reconciliation_state, created_at DESC);

COMMENT ON COLUMN offerwall_conversions.payout_usd IS
  'Unverified payout value reported by the signed postback; payoutUsd is not covered by the postback HMAC.';
COMMENT ON COLUMN offerwall_conversions.provider_payout_usd IS
  'Authoritative payout value read from the authenticated Offerwall API.';

CREATE TABLE IF NOT EXISTS provider_reconciliation_runs (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running','succeeded','failed')),
  conversions_seen INTEGER NOT NULL DEFAULT 0,
  conversions_matched INTEGER NOT NULL DEFAULT 0,
  conflicts INTEGER NOT NULL DEFAULT 0,
  unmatched INTEGER NOT NULL DEFAULT 0,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS provider_reconciliation_runs_created_idx
  ON provider_reconciliation_runs(provider, started_at DESC);

CREATE TABLE IF NOT EXISTS provider_daily_stats (
  provider TEXT NOT NULL,
  stat_date DATE NOT NULL,
  impressions BIGINT NOT NULL DEFAULT 0,
  clicks BIGINT NOT NULL DEFAULT 0,
  conversions BIGINT NOT NULL DEFAULT 0,
  reversals BIGINT NOT NULL DEFAULT 0,
  payout_usd NUMERIC(20, 8) NOT NULL DEFAULT 0,
  conversion_rate NUMERIC(20, 8) NOT NULL DEFAULT 0,
  epc NUMERIC(20, 8) NOT NULL DEFAULT 0,
  reconciled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(provider, stat_date)
);

CREATE TABLE IF NOT EXISTS provider_settlements (
  id UUID PRIMARY KEY,
  provider TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  expected_usd NUMERIC(20, 8),
  amount_received_usd NUMERIC(20, 8) NOT NULL CHECK (amount_received_usd >= 0),
  status TEXT NOT NULL CHECK (status IN ('expected','requested','received')),
  idempotency_key TEXT NOT NULL,
  external_reference TEXT,
  note TEXT,
  recorded_by BIGINT REFERENCES users(id),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider, idempotency_key),
  CHECK(period_end >= period_start)
);
CREATE INDEX IF NOT EXISTS provider_settlements_period_idx
  ON provider_settlements(provider, period_end DESC);

CREATE TABLE IF NOT EXISTS platform_financial_baselines (
  provider TEXT PRIMARY KEY,
  cutover_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);
INSERT INTO platform_financial_baselines(provider, notes)
VALUES ('offerwall.gg', 'Rewards beta accounting cutover')
ON CONFLICT DO NOTHING;

ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS estimated_network_fee_usd NUMERIC(20, 8) NOT NULL DEFAULT 0;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS actual_network_fee_usd NUMERIC(20, 8);

COMMIT;
