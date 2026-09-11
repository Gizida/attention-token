BEGIN;

CREATE TABLE IF NOT EXISTS offerwall_conversions (
  provider_transaction_id TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  offer_id TEXT,
  offer_name TEXT,
  goal_id TEXT,
  credits NUMERIC(18, 8) NOT NULL,
  payout_usd NUMERIC(18, 8),
  status TEXT NOT NULL CHECK (status IN ('credited', 'reversed')),
  referral_commission NUMERIC(18, 8) NOT NULL DEFAULT 0,
  reverses_transaction_id TEXT REFERENCES offerwall_conversions(provider_transaction_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS offerwall_one_reversal_per_conversion
  ON offerwall_conversions (reverses_transaction_id)
  WHERE reverses_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS offerwall_conversions_user_created
  ON offerwall_conversions (user_id, created_at DESC);

COMMIT;
