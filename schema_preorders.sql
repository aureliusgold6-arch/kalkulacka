CREATE TABLE IF NOT EXISTS preorders (
  id            TEXT PRIMARY KEY,
  ref           TEXT NOT NULL UNIQUE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  note          TEXT,
  metal_code    TEXT NOT NULL,
  metal_name    TEXT NOT NULL,
  purity        INTEGER NOT NULL,
  weight        REAL NOT NULL,
  pieces        INTEGER NOT NULL DEFAULT 1,
  mode          TEXT NOT NULL,
  price         REAL NOT NULL,
  price_per_gram REAL NOT NULL,
  status        TEXT NOT NULL DEFAULT 'NOVA',
  email_status  TEXT NOT NULL DEFAULT 'PENDING',
  email_error   TEXT,
  client_ip     TEXT
);
CREATE INDEX IF NOT EXISTS idx_preorders_created ON preorders(created_at);
CREATE INDEX IF NOT EXISTS idx_preorders_status  ON preorders(status);
