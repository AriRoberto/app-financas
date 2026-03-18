-- Mirror table for reserves that become investments
CREATE TABLE IF NOT EXISTS investments (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id),
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL,
  source_transaction_id TEXT UNIQUE REFERENCES transactions(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
