-- Which version of the shop terms each shop accepted, and when
-- (EU Regulation 2019/1150 asks platforms to keep this on record).
ALTER TABLE shops ADD COLUMN terms_version TEXT;
ALTER TABLE shops ADD COLUMN terms_accepted_at TEXT;
