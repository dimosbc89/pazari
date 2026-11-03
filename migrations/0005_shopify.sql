-- The Tagora app for Shopify: one row per store that installed it.
-- A store can install the app before it applies to Tagora (shop_id is filled in then).
CREATE TABLE shopify_stores (
  shop_domain TEXT PRIMARY KEY,            -- e.g. my-store.myshopify.com
  shop_id TEXT REFERENCES shops (id),      -- the Tagora shop, once the store applied
  token TEXT,                              -- access + refresh token, encrypted (AES-GCM, key from the app secret)
  info TEXT,                               -- JSON: store name, email, address, currency, taxes included
  installed_at TEXT NOT NULL,
  uninstalled_at TEXT,
  paused_by_uninstall INTEGER NOT NULL DEFAULT 0, -- 1: Tagora paused the shop because the app was removed
  bulk_id TEXT,                            -- full sync running at Shopify (bulk operation id)
  bulk_started_at TEXT,
  bulk_trigger TEXT,
  bulk_claimed_at TEXT,                    -- when a worker started saving its result (so only one does)
  last_webhook_at TEXT
);
CREATE INDEX shopify_stores_shop ON shopify_stores (shop_id);
