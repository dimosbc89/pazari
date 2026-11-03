-- Products of the partner shops, searchable with SQLite full-text search (FTS5).
-- Written by the sync (worker/catalogue.ts), read by /api/catalogue/*.

CREATE TABLE products (
  rid          INTEGER PRIMARY KEY,        -- row id used by the full-text index
  id           TEXT NOT NULL UNIQUE,       -- "<shop id>-<shop's product id>"
  shop_id      TEXT NOT NULL,
  group_id     TEXT NOT NULL,              -- variants (colours, sizes) of one product
  match_key    TEXT,                       -- same product in other shops: barcode, or brand + MPN
  shop         TEXT NOT NULL,
  brand        TEXT NOT NULL,
  category     TEXT NOT NULL,
  color        TEXT,
  size         TEXT,
  discount     TEXT,                       -- filter bucket: upto20 | 20to35 | 35plus
  discount_pct INTEGER NOT NULL DEFAULT 0,
  price        REAL NOT NULL,
  rank         INTEGER NOT NULL DEFAULT 0, -- order of variants in a group
  shuffle      INTEGER NOT NULL,           -- stable mixed order for browsing without a search
  countries    TEXT NOT NULL,              -- ",gr,cy,"
  doc          TEXT NOT NULL,              -- the whole product as JSON
  hash         TEXT NOT NULL,              -- unchanged products are not rewritten
  t_title      TEXT NOT NULL,              -- search text: folded words plus their Latin spelling
  t_brand      TEXT NOT NULL,
  t_color      TEXT NOT NULL,
  t_category   TEXT NOT NULL,
  t_other      TEXT NOT NULL,              -- description, shop, size, MPN
  updated_at   TEXT NOT NULL
);
CREATE INDEX products_shop ON products (shop_id);
CREATE INDEX products_group ON products (group_id);
CREATE INDEX products_match ON products (match_key);

CREATE VIRTUAL TABLE products_fts USING fts5(
  t_title, t_brand, t_color, t_category, t_other,
  content = 'products', content_rowid = 'rid', tokenize = 'unicode61', prefix = '2 3'
);
-- Every word in the index (for typo correction).
CREATE VIRTUAL TABLE products_terms USING fts5vocab(products_fts, 'row');

CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts (rowid, t_title, t_brand, t_color, t_category, t_other)
  VALUES (new.rid, new.t_title, new.t_brand, new.t_color, new.t_category, new.t_other);
END;
CREATE TRIGGER products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts (products_fts, rowid, t_title, t_brand, t_color, t_category, t_other)
  VALUES ('delete', old.rid, old.t_title, old.t_brand, old.t_color, old.t_category, old.t_other);
END;
CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts (products_fts, rowid, t_title, t_brand, t_color, t_category, t_other)
  VALUES ('delete', old.rid, old.t_title, old.t_brand, old.t_color, old.t_category, old.t_other);
  INSERT INTO products_fts (rowid, t_title, t_brand, t_color, t_category, t_other)
  VALUES (new.rid, new.t_title, new.t_brand, new.t_color, new.t_category, new.t_other);
END;

-- Site settings changed from the admin page, and housekeeping values.
-- catalogue: demo | live (which products the website shows)
-- last_cron_at, last_alert_at: monitoring
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO settings (key, value) VALUES ('catalogue', 'demo');
