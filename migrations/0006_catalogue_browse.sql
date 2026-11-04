-- Cover catalogue counts, facets and statistics without reading product documents.
-- A single selected shop also uses the index for price ordering.
CREATE INDEX products_browse ON products (
  listed, shop, price, countries, brand, category, color, size, discount, shop_id
);
