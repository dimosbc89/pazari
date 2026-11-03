-- The Tagora plugin for WooCommerce: the shop sends its products to Tagora (push)
-- instead of Tagora reading them, so shops behind firewalls work too.
ALTER TABLE shops ADD COLUMN plugin_key_hash TEXT;   -- SHA-256 of the connection key (the key itself is shown once)
ALTER TABLE shops ADD COLUMN plugin_seen_at TEXT;    -- last request from the plugin
ALTER TABLE shops ADD COLUMN plugin_info TEXT;       -- JSON: plugin, WooCommerce and WordPress versions, site address
CREATE UNIQUE INDEX shops_plugin_key ON shops (plugin_key_hash);

-- Products of shops still waiting for approval are kept, but not shown (listed = 0).
ALTER TABLE products ADD COLUMN listed INTEGER NOT NULL DEFAULT 1;

-- Ties the batches of one full sync from the plugin to one sync run.
ALTER TABLE sync_runs ADD COLUMN ext_id TEXT;
CREATE INDEX sync_runs_ext ON sync_runs (shop_id, ext_id);
