CREATE TABLE IF NOT EXISTS bank_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  institution TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_consents (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES bank_connections(id),
  consent_id_externo TEXT NOT NULL,
  scopes TEXT NOT NULL,
  granted_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bank_tokens (
  id TEXT PRIMARY KEY,
  consent_id TEXT NOT NULL REFERENCES bank_consents(id),
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,
  rotated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES bank_connections(id),
  external_account_id TEXT NOT NULL,
  type TEXT,
  currency TEXT,
  masked_number TEXT,
  name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(connection_id, external_account_id)
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES bank_accounts(id),
  external_tx_id TEXT NOT NULL,
  booked_at DATE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  description TEXT,
  merchant TEXT,
  category TEXT,
  raw_hash TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(account_id, external_tx_id)
);
