-- Shops that list their products on Pazari, their syncs, click-outs and logins.

CREATE TABLE shops (
  id                  TEXT PRIMARY KEY,          -- slug, prefixes product ids
  name                TEXT NOT NULL,
  website             TEXT NOT NULL,
  email               TEXT NOT NULL,             -- contact and login
  contact_name        TEXT,
  phone               TEXT,
  company             TEXT,                      -- legal name
  vat                 TEXT,                      -- ΑΦΜ / VAT number
  countries           TEXT NOT NULL,             -- JSON array of country codes
  lang                TEXT NOT NULL DEFAULT 'el',
  source_type         TEXT NOT NULL,             -- feed | shopify | woocommerce
  source_url          TEXT NOT NULL,
  source_format       TEXT,                      -- detected: google, skroutz, bestprice, csv, shopify, woocommerce
  default_shipping    REAL,
  free_shipping_over  REAL,
  status              TEXT NOT NULL DEFAULT 'pending', -- pending | active | paused | rejected
  status_reason       TEXT,
  created_at          TEXT NOT NULL,
  approved_at         TEXT,
  last_sync_at        TEXT,
  last_sync_status    TEXT,                      -- ok | warning | error
  last_sync_message   TEXT,
  last_issues         TEXT,                      -- JSON from the last sync
  product_count       INTEGER NOT NULL DEFAULT 0,
  next_sync_at        TEXT,
  last_manual_sync_at TEXT
);
CREATE INDEX shops_email ON shops (email);
CREATE INDEX shops_due ON shops (status, next_sync_at);

CREATE TABLE sync_runs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id     TEXT NOT NULL REFERENCES shops (id) ON DELETE CASCADE,
  trigger     TEXT NOT NULL,                     -- schedule | manual | approve
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  status      TEXT NOT NULL,                     -- running | ok | warning | error
  found       INTEGER,
  imported    INTEGER,
  skipped     INTEGER,
  removed     INTEGER,
  message     TEXT,
  issues      TEXT
);
CREATE INDEX sync_runs_shop ON sync_runs (shop_id, id DESC);

-- Click-outs per shop per day. No visitor data is stored.
CREATE TABLE clicks (
  shop_id TEXT NOT NULL,
  day     TEXT NOT NULL,                         -- YYYY-MM-DD (UTC)
  clicks  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (shop_id, day)
);

-- One-time sign-in links (only the SHA-256 of the token is stored).
CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT
);
CREATE INDEX login_tokens_email ON login_tokens (email, created_at);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
