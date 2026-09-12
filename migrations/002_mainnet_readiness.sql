BEGIN;

CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce_hash TEXT PRIMARY KEY,
  wallet_address VARCHAR NOT NULL,
  message TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_nonces_expiry_idx
  ON auth_nonces (expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS credit_ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN (
    'opening_balance', 'opening_referral', 'offer_credit', 'offer_reversal',
    'referral_credit', 'referral_reversal', 'withdrawal_reserve', 'withdrawal_release'
  )),
  amount_credits NUMERIC(20, 8) NOT NULL CHECK (amount_credits <> 0),
  available_at TIMESTAMPTZ NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, kind, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS credit_ledger_user_available_idx
  ON credit_ledger_entries (user_id, available_at, created_at);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  destination_wallet VARCHAR NOT NULL,
  credits NUMERIC(20, 8) NOT NULL CHECK (credits > 0),
  usd_amount NUMERIC(20, 8) NOT NULL CHECK (usd_amount > 0),
  sol_price_usd NUMERIC(20, 8) NOT NULL CHECK (sol_price_usd > 0),
  sol_lamports BIGINT NOT NULL CHECK (sol_lamports > 0),
  status TEXT NOT NULL CHECK (status IN (
    'awaiting_review', 'queued', 'signing', 'signed', 'submitted',
    'confirmed', 'retryable', 'rejected', 'expired'
  )),
  idempotency_key TEXT NOT NULL,
  quote_observed_at TIMESTAMPTZ NOT NULL,
  quote_expires_at TIMESTAMPTZ NOT NULL,
  approved_by BIGINT REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejected_by BIGINT REFERENCES users(id),
  rejected_at TIMESTAMPTZ,
  review_reason TEXT,
  processing_token UUID,
  processing_locked_until TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  tx_signature VARCHAR,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key),
  UNIQUE (tx_signature)
);

CREATE INDEX IF NOT EXISTS withdrawal_requests_user_created_idx
  ON withdrawal_requests (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawal_requests_process_idx
  ON withdrawal_requests (status, processing_locked_until, created_at);

CREATE TABLE IF NOT EXISTS payout_attempts (
  id UUID PRIMARY KEY,
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id),
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  treasury_wallet VARCHAR NOT NULL,
  signed_transaction_base64 TEXT NOT NULL,
  expected_signature VARCHAR NOT NULL UNIQUE,
  recent_blockhash VARCHAR NOT NULL,
  last_valid_block_height BIGINT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('signed', 'submitted', 'confirmed', 'failed', 'expired')),
  submitted_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (withdrawal_request_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS payout_attempts_reconcile_idx
  ON payout_attempts (status, updated_at);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS withdrawal_request_id UUID REFERENCES withdrawal_requests(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tx_signature VARCHAR;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_withdrawal_request_key
  ON transactions (withdrawal_request_id) WHERE withdrawal_request_id IS NOT NULL;

ALTER TABLE treasury_logs ADD COLUMN IF NOT EXISTS withdrawal_request_id UUID REFERENCES withdrawal_requests(id);
CREATE UNIQUE INDEX IF NOT EXISTS treasury_logs_withdrawal_request_key
  ON treasury_logs (withdrawal_request_id) WHERE withdrawal_request_id IS NOT NULL;

INSERT INTO credit_ledger_entries (
  user_id, kind, amount_credits, available_at, source_type, source_id
)
SELECT id, 'opening_balance', balance, NOW(), 'migration', '002-mainnet-readiness'
FROM users
WHERE COALESCE(balance, 0) <> 0
ON CONFLICT DO NOTHING;

INSERT INTO credit_ledger_entries (
  user_id, kind, amount_credits, available_at, source_type, source_id
)
SELECT id, 'opening_referral', pending_referral_balance, NOW(), 'migration', '002-mainnet-readiness'
FROM users
WHERE COALESCE(pending_referral_balance, 0) <> 0
ON CONFLICT DO NOTHING;

UPDATE users
SET balance = COALESCE(balance, 0) + COALESCE(pending_referral_balance, 0),
    pending_referral_balance = 0
WHERE COALESCE(pending_referral_balance, 0) <> 0;

CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_key ON sessions (token);

COMMIT;
