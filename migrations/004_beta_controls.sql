BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS adult_attested_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition_source TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition_campaign TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition_content TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS network_fingerprint_hmac TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_allowance INTEGER NOT NULL DEFAULT 2;

CREATE TABLE IF NOT EXISTS beta_invites (
  id UUID PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  issued_by BIGINT REFERENCES users(id),
  redeemed_by BIGINT UNIQUE REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS beta_invites_issuer_idx ON beta_invites(issued_by, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS beta_invite_id UUID REFERENCES beta_invites(id);

ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS requires_step_up BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS step_up_verified_at TIMESTAMPTZ;
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS risk_reasons JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS withdrawal_step_up_nonces (
  nonce_hash TEXT PRIMARY KEY,
  withdrawal_request_id UUID NOT NULL REFERENCES withdrawal_requests(id),
  user_id BIGINT NOT NULL REFERENCES users(id),
  wallet_address VARCHAR NOT NULL,
  message TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS withdrawal_step_up_expiry_idx
  ON withdrawal_step_up_nonces(expires_at) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  identity_hash TEXT NOT NULL,
  bucket TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY(identity_hash, bucket)
);
CREATE INDEX IF NOT EXISTS rate_limit_expiry_idx ON rate_limit_buckets(expires_at);

CREATE TABLE IF NOT EXISTS auth_risk_events (
  id BIGSERIAL PRIMARY KEY,
  identity_hash TEXT,
  wallet_address VARCHAR,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS auth_risk_events_recent_idx
  ON auth_risk_events(identity_hash, created_at DESC);

COMMIT;
