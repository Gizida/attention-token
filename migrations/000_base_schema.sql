BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  wallet_address VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  username VARCHAR,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  balance NUMERIC(20, 8) DEFAULT 0,
  referred_by BIGINT REFERENCES users(id),
  referral_code VARCHAR UNIQUE,
  pending_referral_balance NUMERIC(20, 8) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  token VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  type VARCHAR NOT NULL,
  provider VARCHAR,
  offer_id VARCHAR,
  status VARCHAR DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  amount NUMERIC(20, 8) NOT NULL DEFAULT 0,
  sol_amount NUMERIC(20, 9)
);

CREATE TABLE IF NOT EXISTS treasury_logs (
  id BIGSERIAL PRIMARY KEY,
  type VARCHAR NOT NULL,
  from_wallet VARCHAR,
  to_wallet VARCHAR,
  amount_usd NUMERIC(20, 8),
  amount_token NUMERIC(20, 9),
  swap_rate NUMERIC(20, 8),
  network_fee NUMERIC(20, 9),
  tx_signature VARCHAR,
  status VARCHAR DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
