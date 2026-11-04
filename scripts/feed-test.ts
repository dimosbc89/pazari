// Run with: node --test scripts/feed-test.ts
// Synthetic fixtures: no network requests, customer details or production writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseDelimited, parseXml, readFeed } from '../sync/feed.ts';
import { normalize } from '../sync/normalize.ts';
import { SyncError, type ShopConfig } from '../sync/types.ts';

const shop: ShopConfig = {
  id: 'fixture-shop', name: 'Fixture Shop', countries: ['GR'],
  sourceType: 'feed', sourceUrl: 'https://example.test/feed.xml',
};
const xml = (fields: string) => `<products><product>${fields}</product></products>`;
const required = '<id>001</id><name>Example</name><price>10</price><link>https://example.test/product</link>';

test('uid is accepted without losing leading zeroes or changing established ID precedence', () => {
  assert.equal(parseXml(xml('<UID>00123</UID>')).items[0].id, '00123');
  for (const name of ['id', 'productid', 'product_id', 'uniqueid', 'unique_id', 'item_id', 'sku', 'code']) {
    assert.equal(parseXml(xml(`<uid>new-id</uid><${name}>existing-id</${name}>`)).items[0].id, 'existing-id');
  }
  assert.equal(parseXml(xml('<id/><uid>fallback</uid>')).items[0].id, 'fallback');
});

test('XML id attributes are a fallback after every existing child ID alias', () => {
  assert.equal(parseXml('<products><product id="00123"><name>Bag</name></product></products>').items[0].id, '00123');
  for (const name of ['id', 'productid', 'product_id', 'uniqueid', 'unique_id', 'item_id', 'sku', 'code', 'uid']) {
    const input = `<products><product id="attribute-id"><${name}>child-id</${name}></product></products>`;
    assert.equal(parseXml(input).items[0].id, 'child-id', name);
  }
  assert.equal(parseXml('<products><product id="fallback"><id/></product></products>').items[0].id, 'fallback');
});

test('TooFast item/model fields are mapped only for the exact retailer feed endpoint', () => {
  const input = xml('<item>00186</item><model>Motorcycle vest</model><mpn>GVR186</mpn><price>45.00</price><url>https://toofast.gr/vest</url>');
  for (const url of ['https://toofast.gr/xml/skroutz.xml', 'https://www.toofast.gr/xml/skroutz.xml/']) {
    const item = parseXml(input, url).items[0];
    assert.equal(item.id, '00186');
    assert.equal(item.title, 'Motorcycle vest');
    assert.equal(item.mpn, 'GVR186');
  }
  for (const url of [undefined, 'https://example.test/xml/skroutz.xml', 'https://toofast.gr/other.xml', 'https://toofast.gr.example.test/xml/skroutz.xml']) {
    const item = parseXml(input, url).items[0];
    assert.equal(item.id, '', url);
    assert.equal(item.title, undefined, url);
  }
  assert.equal(parseXml(xml('<id>1</id><model>Manufacturer model</model>')).items[0].mpn, 'Manufacturer model');
  const preferred = parseXml(xml('<id>old-id</id><item>new-id</item><name>Old title</name><model>New title</model>'), 'https://toofast.gr/xml/skroutz.xml').items[0];
  assert.equal(preferred.id, 'old-id');
  assert.equal(preferred.title, 'Old title');
});

test('TooFast category paths are a scoped fallback behind standard categories', () => {
  const input = xml(`${required}<cat_list>ΠΡΟΪΟΝΤΑ/ΕΝΔΥΣΗ/Ένδυση αναβάτη /Γιλέκα</cat_list>`);
  for (const url of ['https://toofast.gr/xml/skroutz.xml', 'https://www.toofast.gr/xml/skroutz.xml/']) {
    assert.equal(parseXml(input, url).items[0].category, 'Γιλέκα');
  }
  for (const url of [undefined, 'https://example.test/xml/skroutz.xml', 'https://toofast.gr/other.xml', 'https://toofast.gr.example.test/xml/skroutz.xml']) {
    assert.equal(parseXml(input, url).items[0].category, undefined, url);
  }
  const preferred = xml(`${required}<category>Clothing &gt; Jackets</category><cat_list>ΠΡΟΪΟΝΤΑ/Γιλέκα</cat_list>`);
  assert.equal(parseXml(preferred, 'https://toofast.gr/xml/skroutz.xml').items[0].category, 'Jackets');
});

test('Google RSS field names, sale pricing, shipping and multiple images remain compatible', () => {
  const result = parseXml(`<rss xmlns:g="http://base.google.com/ns/1.0"><channel><item>
    <g:id>sku-1</g:id><g:item_group_id>group-1</g:item_group_id><title>Shirt &amp; scarf</title>
    <link>https://example.test/shirt</link><g:image_link>https://example.test/main.jpg</g:image_link>
    <g:additional_image_link>https://example.test/side.jpg</g:additional_image_link>
    <g:additional_image_link>https://example.test/back.jpg</g:additional_image_link>
    <g:price>29.90 EUR</g:price><g:sale_price>19.90 EUR</g:sale_price>
    <g:brand>Example Brand</g:brand><g:mpn>MPN001</g:mpn><g:gtin>0123456789012</g:gtin>
    <g:google_product_category>1234</g:google_product_category><g:product_type>Clothing &gt; Shirts</g:product_type>
    <g:availability>in_stock</g:availability><g:size>M</g:size><g:color>Blue</g:color>
    <description><![CDATA[<p>Soft &amp; warm.</p>]]></description>
    <g:shipping><g:country>GR</g:country><g:price>3.50 EUR</g:price></g:shipping>
  </item></channel></rss>`);
  assert.equal(result.format, 'google');
  assert.deepEqual(result.items[0], {
    id: 'sku-1', groupId: 'group-1', title: 'Shirt & scarf', description: 'Soft & warm.',
    url: 'https://example.test/shirt', image: 'https://example.test/main.jpg',
    images: ['https://example.test/side.jpg', 'https://example.test/back.jpg'],
    price: 19.9, oldPrice: 29.9, shipping: 3.5, brand: 'Example Brand', category: 'Shirts',
    color: 'Blue', size: 'M', mpn: 'MPN001', gtin: '0123456789012', inStock: true,
  });
});

test('Skroutz names and price_with_vat retain priority over price', () => {
  const result = parseXml(`<mywebstore><products><product>
    <id>001</id><name>Bag</name><link>https://example.test/bag</link>
    <image>https://example.test/bag.jpg</image><price>12.50</price><price_with_vat>15.50</price_with_vat>
    <manufacturer>Example</manufacturer><category_path>Bags &gt; Shoulder bags</category_path>
    <mpn>BAG-001</mpn><instock>Y</instock><availability>Άμεσα διαθέσιμο</availability>
  </product></products></mywebstore>`);
  assert.equal(result.format, 'skroutz');
  assert.equal(result.items[0].price, 15.5);
  assert.equal(result.items[0].brand, 'Example');
  assert.equal(result.items[0].category, 'Shoulder bags');
  assert.equal(result.items[0].inStock, true);
});

test('MyPharmacy PriceVat is scoped to its exact endpoint and preserves UniqueID and stock flags', () => {
  const input = `<mywebstore><products><product ctn="11388">
    <UniqueID>004008600082545</UniqueID><Name>Example spoon</Name>
    <Link>https://www.mypharmacy.gr/product-p-11388</Link><PriceVat>3.91</PriceVat>
    <Instock>Y</Instock><Availability>Άμεσα διαθέσιμο</Availability><Ean>004008600082545</Ean>
  </product><product><UniqueID>unavailable</UniqueID><Name>Unavailable spoon</Name>
    <Link>https://www.mypharmacy.gr/product-p-2</Link><PriceVat>3.42</PriceVat>
    <Instock>N</Instock><Availability>Διαθέσιμο σε 1-3 Εργάσιμες</Availability>
  </product></products></mywebstore>`;
  for (const url of ['https://www.mypharmacy.gr/skroutz.xml', 'https://mypharmacy.gr/skroutz.xml/']) {
    const parsed = parseXml(input, url);
    assert.equal(parsed.items[0].id, '004008600082545');
    assert.equal(parsed.items[0].gtin, '004008600082545');
    assert.equal(parsed.items[0].price, 3.91);
    assert.equal(parsed.items[0].inStock, true);
    assert.equal(parsed.items[1].inStock, false);
    const report = normalize({ ...parsed, truncated: false }, shop, 'test');
    assert.equal(report.products.length, 1);
    assert.equal(report.products[0].price, 3.91);
    assert.equal(report.issues.find((issue) => issue.code === 'out_of_stock')?.count, 1);
  }
  for (const url of [undefined, 'https://example.test/skroutz.xml', 'https://mypharmacy.gr/other.xml',
    'https://mypharmacy.gr.example.test/skroutz.xml']) {
    assert.equal(parseXml(input, url).items[0].price, undefined, url);
  }
});

test('MyPharmacy pricevat fallback keeps existing price and sale aliases ahead of it', () => {
  const url = 'https://www.mypharmacy.gr/skroutz.xml';
  for (const name of ['price_with_vat', 'price', 'final_price', 'retail_price', 'regular_price']) {
    const item = parseXml(xml(`<uniqueid>1</uniqueid><${name}>20</${name}><PriceVat>30</PriceVat>`), url).items[0];
    assert.equal(item.price, 20, name);
  }
  const item = parseXml(xml('<uniqueid>1</uniqueid><price/><PriceVat>19,50</PriceVat><sale_price>15</sale_price>'), url).items[0];
  assert.equal(item.price, 15);
  assert.equal(item.oldPrice, 19.5);
});

test('repeated sizes preserve nonempty values even after an empty first element', () => {
  assert.equal(parseXml(xml(`${required}<size/><size>S, M, L</size><size>XL</size><size>XL</size>`)).items[0].size, 'S, M, L, XL');
  assert.equal(parseXml(xml(`${required}<size/><size/>`)).items[0].size, undefined);
  assert.equal(parseXml(xml(`${required}<sizes><size>S</size><size>M</size></sizes>`)).items[0].size, 'S, M');
});

test('nested images provide a main image and distinct gallery entries', () => {
  const item = parseXml(xml(`${required}<images><image/><image>https://example.test/one.jpg</image>
    <image>https://example.test/two.jpg</image><image>https://example.test/one.jpg</image></images>`)).items[0];
  assert.equal(item.image, 'https://example.test/one.jpg');
  assert.deepEqual(item.images, ['https://example.test/two.jpg']);
});

test('explicit main image remains preferred and all supported gallery fields are retained', () => {
  const item = parseXml(xml(`${required}<image>https://example.test/main.jpg</image>
    <image>https://example.test/second.jpg</image><additional_image>https://example.test/a.jpg</additional_image>
    <additional_image>https://example.test/b.jpg</additional_image><additional_imageurl>https://example.test/c.jpg</additional_imageurl>
    <additional_imageurl>https://example.test/d.jpg</additional_imageurl>
    <images><image>https://example.test/e.jpg</image><image>https://example.test/main.jpg</image></images>`)).items[0];
  assert.equal(item.image, 'https://example.test/main.jpg');
  assert.deepEqual(item.images, [
    'https://example.test/a.jpg', 'https://example.test/b.jpg', 'https://example.test/e.jpg',
    'https://example.test/c.jpg', 'https://example.test/d.jpg', 'https://example.test/second.jpg',
  ]);
});

test('empty main images fall back to the available gallery', () => {
  const item = parseXml(xml(`${required}<image/><additional_imageurl>https://example.test/a.jpg</additional_imageurl>`)).items[0];
  assert.equal(item.image, 'https://example.test/a.jpg');
  assert.deepEqual(item.images, []);
});

test('comma decimal prices, mixed separators and double escaped text are decoded', () => {
  const item = parseXml(xml('<uid>1</uid><name>L&amp;apos;Oréal &amp;amp; Co</name><price_with_vat>19,00</price_with_vat>')).items[0];
  assert.equal(item.price, 19);
  assert.equal(item.title, "L'Oréal & Co");
  assert.equal(parseXml(xml('<price>1.234,50 €</price>')).items[0].price, 1234.5);
});

test('stock flags, zero quantity and backorders are excluded while immediate availability stays accepted', () => {
  for (const value of ['N', 'no', 'false', '0', 'out_of_stock', 'Εξαντλημένο', 'Μη διαθέσιμο', 'backorder', 'on back-order', 'Back Order']) {
    const item = parseXml(xml(`${required}<instock>${value}</instock>`)).items[0];
    assert.equal(item.inStock, false, value);
    const report = normalize({ format: 'xml', items: [item], truncated: false }, shop, 'test');
    assert.equal(report.products.length, 0, value);
    assert.equal(report.issues[0].code, 'out_of_stock', value);
  }
  for (const fields of ['<instock>Y</instock>', '<availability>Άμεσα διαθέσιμο</availability>', '<instock>in stock</instock>', '']) {
    assert.equal(parseXml(xml(`${required}${fields}`)).items[0].inStock, true, fields);
  }
  assert.equal(parseXml(xml(`${required}<instock>Y</instock><quantity>0</quantity>`)).items[0].inStock, false);
  assert.equal(parseXml(xml(`${required}<availability>Άμεσα διαθέσιμο</availability><instock>N</instock>`)).items[0].inStock, false);
});

test('shipping_costs and inventory are fallbacks behind established shipping and quantity aliases', () => {
  assert.equal(parseXml(xml(`${required}<shipping_costs>4</shipping_costs>`)).items[0].shipping, 4);
  assert.equal(parseXml(xml(`${required}<shipping_costs>0</shipping_costs>`)).items[0].shipping, 0);
  for (const name of ['shipping', 'shipping_cost', 'shippingcost', 'delivery_cost', 'shipping_price']) {
    const item = parseXml(xml(`${required}<${name}>3</${name}><shipping_costs>4</shipping_costs>`)).items[0];
    assert.equal(item.shipping, 3, name);
  }
  assert.equal(parseXml(xml(`${required}<availability>in stock</availability><inventory>0</inventory>`)).items[0].inStock, false);
  assert.equal(parseXml(xml(`${required}<inventory>2</inventory>`)).items[0].inStock, true);
  for (const name of ['quantity', 'qty', 'stock_quantity']) {
    assert.equal(parseXml(xml(`${required}<${name}>2</${name}><inventory>0</inventory>`)).items[0].inStock, true, name);
    assert.equal(parseXml(xml(`${required}<${name}>0</${name}><inventory>2</inventory>`)).items[0].inStock, false, name);
  }
});

test('explicit Greek backorder labels are excluded across accents and letter case', () => {
  for (const value of ['Κατόπιν παραγγελίας', 'κατοπιν παραγγελιας', 'ΚΑΤΟΠΙΝ ΠΑΡΑΓΓΕΛΙΑΣ',
    'ΚΑΤΌΠΙΝ ΠΑΡΑΓΓΕΛΊΑΣ', 'Αναμένεται', 'αναμενεται', 'ΑΝΑΜΕΝΕΤΑΙ', 'ΑΝΑΜΈΝΕΤΑΙ']) {
    const item = parseXml(xml(`${required}<instock>Y</instock><availability>${value}</availability>`)).items[0];
    assert.equal(item.inStock, false, value);
    assert.equal(normalize({ format: 'xml', items: [item], truncated: false }, shop, 'test').products.length, 0, value);
  }
  for (const value of ['Άμεσα διαθέσιμο', 'ΑΜΕΣΑ ΔΙΑΘΕΣΙΜΟ', 'Άμεση παραλαβή / Παράδoση 1 έως 3 ημέρες']) {
    assert.equal(parseXml(xml(`${required}<availability>${value}</availability>`)).items[0].inStock, true, value);
  }
});

test('malformed XML rejects the entire feed with bad_format', () => {
  for (const input of [
    '<products><product><id>1</id></products>',
    '<products><product><id>1</id></product>',
    '<products><product><name>A & B</name></product></products>',
    '<products><product><name><![CDATA[unfinished</name></product></products>',
  ]) {
    assert.throws(() => parseXml(input), (error: unknown) => error instanceof SyncError && error.code === 'bad_format');
  }
});

test('normalization still deduplicates IDs and preserves its existing validation rules', () => {
  const parsed = parseXml(`<products><product>${required}</product><product>${required}<category>Duplicate</category></product>
    <product><uid>zero</uid><name>Zero price</name><price>0</price><link>https://example.test/zero</link></product>
    <product><uid>missing</uid><name>No price</name><link>https://example.test/missing</link></product></products>`);
  const report = normalize({ ...parsed, truncated: false }, shop, 'test');
  assert.equal(report.found, 4);
  assert.equal(report.products.length, 1);
  assert.equal(report.products[0].id, 'fixture-shop-001');
  assert.equal(report.skipped, 3);
  assert.deepEqual(report.skippedIds, ['fixture-shop-zero', 'fixture-shop-missing']);
  assert.equal(report.issues.find((issue) => issue.code === 'duplicate_id')?.count, 1);
  assert.equal(report.issues.find((issue) => issue.code === 'missing_price')?.count, 2);
});

test('CSV and TSV feeds retain quoting, uid fallback and established ID precedence', () => {
  const csv = parseDelimited('id;uid;title;price;link;size\nold;new;"A; B";"19,50";https://example.test/a;M');
  assert.equal(csv.format, 'csv');
  assert.equal(csv.items[0].id, 'old');
  assert.equal(csv.items[0].title, 'A; B');
  assert.equal(csv.items[0].price, 19.5);
  assert.equal(csv.items[0].size, 'M');
  const tsv = parseDelimited('uid\ttitle\tprice\tlink\n00123\tExample\t10\thttps://example.test/a');
  assert.equal(tsv.format, 'tsv');
  assert.equal(tsv.items[0].id, '00123');
});

test('Ellinoekdotiki list prices and fractional discounts produce verified retail prices', () => {
  for (const [list, discount, retail] of [
    [50, 0.1, 45], [12.25, 0.5, 6.13], [26.7, 0.625, 10.01], [10, 0, 10],
    [9.45, 0.1, 8.51], [5.25, 0.1, 4.73],
  ]) {
    const parsed = parseXml(xml(`<id>1</id><name>Book</name><link>https://example.test/book</link>
      <price_with_vat>${list}</price_with_vat><discount>${discount}</discount>`), 'https://ellinoekdotiki.gr/export/feed');
    const report = normalize({ ...parsed, truncated: false }, shop, 'test');
    assert.equal(report.products[0].price, retail);
    assert.equal(report.products[0].oldPrice, discount > 0 ? list : undefined);
  }
});

test('fractional discount interpretation is restricted to the publisher feed URL', () => {
  const input = xml(`${required}<discount>0.5</discount>`);
  for (const url of [undefined, 'https://example.test/export/feed', 'https://ellinoekdotiki.gr/other-feed',
    'https://ellinoekdotiki.gr.example.test/export/feed', 'not-a-url']) {
    assert.equal(parseXml(input, url).items[0].price, 10, url);
    assert.equal(parseXml(input, url).items[0].oldPrice, undefined, url);
  }
  assert.equal(parseXml(input, 'https://www.ellinoekdotiki.gr/export/feed/').items[0].price, 5);
});

test('explicit sale prices take priority and malformed publisher discounts reject the feed', () => {
  const url = 'https://ellinoekdotiki.gr/export/feed';
  const item = parseXml(xml(`${required}<discount>0.5</discount><sale_price>8</sale_price>`), url).items[0];
  assert.equal(item.price, 8);
  assert.equal(item.oldPrice, 10);
  for (const value of ['', '-0.1', '1', '50', 'NaN', 'Infinity', '0,5', '10%']) {
    assert.throws(() => parseXml(xml(`${required}<discount>${value}</discount>`), url),
      (error: unknown) => error instanceof SyncError && error.code === 'bad_format', value);
  }
  assert.equal(parseXml(xml(`${required}<discount>50%</discount>`), 'https://example.test/export/feed').items[0].price, 10);
});

test('readFeed passes its source URL through to publisher pricing without a network request', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(xml(`${required}<discount>0.5</discount>`), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  }));
  const source = await readFeed('https://ellinoekdotiki.gr/export/feed', {});
  assert.equal(source.items[0].price, 5);
  assert.equal(source.items[0].oldPrice, 10);
  assert.equal(source.truncated, false);
});

const eShoesUrl = 'https://e-shoes.gr/wp-content/uploads/webexpert-glami-xml/glami.xml';
const pharmacyLiveUrl = 'https://pharmacylive.gr/feeds/bestprice.xml';
const bonprixUrl = 'https://www.bonprix.gr/feeds/bestprice.xml';
const glamiFields = `<ITEM_ID>00411587</ITEM_ID><ITEMGROUP_ID>00411584</ITEMGROUP_ID>
  <PRODUCTNAME>Γυναικεία Sneakers</PRODUCTNAME><PRICE_VAT>130,00</PRICE_VAT>
  <URL>https://e-shoes.gr/product/shoe/?attribute_pa_size=36</URL>
  <IMGURL>https://e-shoes.gr/main.jpg</IMGURL><IMGURL_ALTERNATIVE>https://e-shoes.gr/side.jpg</IMGURL_ALTERNATIVE>
  <IMGURL_ALTERNATIVE>https://e-shoes.gr/back.jpg</IMGURL_ALTERNATIVE>
  <MANUFACTURER>DKNY</MANUFACTURER><CATEGORYTEXT>Γυναικεία | Sneakers</CATEGORYTEXT>
  <DESCRIPTION><![CDATA[<p>&Gamma;&upsilon;&nu;&alpha;ί&kappa;&alpha; &Sigma;&sigma;&sigmaf; &times; &bull; &trade;</p>]]></DESCRIPTION>
  <PARAM><PARAM_NAME>μέγεθος</PARAM_NAME><VAL>36</VAL></PARAM>
  <pArAm><pArAm_NaMe>ΧΡΩΜΑ</pArAm_NaMe><vAl>Μαύρο</vAl></pArAm>
  <PARAM><PARAM_NAME>υλικό</PARAM_NAME><VAL>Δέρμα</VAL></PARAM>`;

test('E-shoes GLAMI maps nested parameters, images, category, price, descriptions and variant identities', () => {
  const input = `<SHOP><SHOPITEM>${glamiFields}<DELIVERY_DATE>0</DELIVERY_DATE></SHOPITEM></SHOP>`;
  for (const url of [eShoesUrl, eShoesUrl.replace('https://', 'https://www.')]) {
    const parsed = parseXml(input, url);
    assert.equal(parsed.items.length, 1); // A single SHOPITEM must also be found.
    const item = parsed.items[0];
    assert.equal(item.id, '00411587');
    assert.equal(item.groupId, '00411584');
    assert.equal(item.price, 130);
    assert.equal(item.size, '36');
    assert.equal(item.color, 'Μαύρο');
    assert.equal(item.category, 'Sneakers');
    assert.equal(item.image, 'https://e-shoes.gr/main.jpg');
    assert.deepEqual(item.images, ['https://e-shoes.gr/side.jpg', 'https://e-shoes.gr/back.jpg']);
    assert.equal(item.description, 'Γυναίκα Σσς × • ™');
    assert.equal(item.inStock, true);
    assert.equal(item.mpn, undefined); // A retailer variant ID is not an MPN.
    const report = normalize({ ...parsed, truncated: false }, shop, 'test');
    assert.equal(report.products[0].id, 'fixture-shop-00411587');
    assert.equal(report.products[0].groupId, 'fixture-shop-00411584');
    assert.equal(report.products[0].url, 'https://e-shoes.gr/product/shoe/?attribute_pa_size=36');
  }
  const variants = parseXml(`<SHOP><SHOPITEM>${glamiFields}<DELIVERY_DATE>0</DELIVERY_DATE></SHOPITEM>
    <SHOPITEM>${glamiFields.replace('00411587', '00411588').replaceAll('36', '37')}<DELIVERY_DATE>0</DELIVERY_DATE></SHOPITEM></SHOP>`, eShoesUrl);
  const products = normalize({ ...variants, truncated: false }, shop, 'test').products;
  assert.equal(products.length, 2);
  assert.equal(products[0].groupId, products[1].groupId);
  assert.notEqual(products[0].id, products[1].id);
  assert.notEqual(products[0].size, products[1].size);
  const singleParam = parseXml(xml(`${required}<PARAM><PARAM_NAME>SiZe</PARAM_NAME><VAL>38</VAL></PARAM><DELIVERY_DATE>0</DELIVERY_DATE>`), eShoesUrl).items[0];
  assert.equal(singleParam.size, '38');
  const variantLink = 'https://e-shoes.gr/product/shoe/?attribute_pa_size=38';
  assert.equal(parseXml(xml(`${required}<URL_SIZE>${variantLink}</URL_SIZE>`), eShoesUrl).items[0].url, variantLink);
  for (const invalid of ['', '@@URL_SIZE@@', 'javascript:alert(1)']) {
    assert.equal(parseXml(xml(`${required}<URL_SIZE>${invalid}</URL_SIZE>`), eShoesUrl).items[0].url, 'https://example.test/product');
  }
  assert.equal(parseXml(xml(`${required}<URL_SIZE>${variantLink}</URL_SIZE>`)).items[0].url, 'https://example.test/product');
});

test('E-shoes only treats GLAMI zero delivery_date as immediate stock and respects other negative flags', () => {
  for (const value of ['1', '5', '-1', '2026-11-10', 'unknown', '', '0.0']) {
    const parsed = parseXml(xml(`${required}<DELIVERY_DATE>${value}</DELIVERY_DATE>`), eShoesUrl);
    assert.equal(parsed.items[0].inStock, false, value);
    assert.equal(normalize({ ...parsed, truncated: false }, shop, 'test').products.length, 0, value);
  }
  assert.equal(parseXml(xml(required), eShoesUrl).items[0].inStock, false);
  for (const field of ['<instock>N</instock>', '<quantity>0</quantity>', '<availability>backorder</availability>']) {
    assert.equal(parseXml(xml(`${required}<DELIVERY_DATE>0</DELIVERY_DATE>${field}`), eShoesUrl).items[0].inStock, false);
  }
  assert.equal(parseXml(xml(`${required}<DELIVERY_DATE>5</DELIVERY_DATE>`)).items[0].inStock, true);
});

test('E-shoes decimal VAT prices preserve fractional cents without applying thousands-separator heuristics', () => {
  for (const [value, expected] of [['69.953', 69.95], ['69.955', 69.96], ['9.945', 9.95], ['1.005', 1.01], ['130,00', 130]]) {
    const parsed = parseXml(xml(`${required}<PRICE_VAT>${value}</PRICE_VAT><DELIVERY_DATE>0</DELIVERY_DATE>`), eShoesUrl);
    assert.equal(normalize({ ...parsed, truncated: false }, shop, 'test').products[0].price, expected);
  }
  for (const invalid of ['', 'invalid', '-5', 'Infinity', '1.234.56']) {
    const parsed = parseXml(xml(`${required}<PRICE_VAT>${invalid}</PRICE_VAT><DELIVERY_DATE>0</DELIVERY_DATE>`), eShoesUrl);
    assert.equal(normalize({ ...parsed, truncated: false }, shop, 'test').products.length, 0, invalid);
  }
  assert.equal(parseXml(xml('<id>1</id><price>69.953</price>')).items[0].price, 69953);
});

const pharmacyFields = `<productid>001ABC</productid><product_name>Example pharmacy item</product_name>
  <Product_link>https://pharmacylive.gr/el/item.html</Product_link>
  <product_image>https://pharmacylive.gr/image.jpg</product_image>
  <product_in_stock>Y</product_in_stock><product_availability>Άμεση παραλαβή/Παράδοση σε 1 έως 3 ημέρες</product_availability>
  <Quantity>4</Quantity><Original_Price>24.98</Original_Price><product_special_price>23.00</product_special_price>
  <product_size>100ml</product_size><product_part_number>PART-123</product_part_number><barcode>05213010813620</barcode>
  <Manufacturer>Example brand</Manufacturer><Product_Description><![CDATA[<p>Product &amp; details.</p>]]></Product_Description>`;

test('PharmacyLive uses the verified selling price with its custom image, size, description and manufacturer part number', () => {
  for (const url of [pharmacyLiveUrl, pharmacyLiveUrl.replace('https://', 'https://www.')]) {
    const parsed = parseXml(xml(pharmacyFields), url);
    const item = parsed.items[0];
    assert.equal(item.id, '001ABC');
    assert.equal(item.price, 23);
    assert.equal(item.oldPrice, undefined);
    assert.equal(item.image, 'https://pharmacylive.gr/image.jpg');
    assert.equal(item.size, '100ml');
    assert.equal(item.description, 'Product & details.');
    assert.equal(item.mpn, 'PART-123');
    assert.equal(item.gtin, '05213010813620');
    assert.equal(item.inStock, true);
    assert.equal(normalize({ ...parsed, truncated: false }, shop, 'test').products.length, 1);
  }
  for (const current of ['24.98', '26.00']) {
    const item = parseXml(xml(pharmacyFields.replace('<product_special_price>23.00', `<product_special_price>${current}`)), pharmacyLiveUrl).items[0];
    assert.equal(item.price, Number(current));
    assert.equal(item.oldPrice, undefined);
  }
  for (const current of ['', 'invalid', '0', '-2']) {
    const parsed = parseXml(xml(pharmacyFields.replace('<product_special_price>23.00', `<product_special_price>${current}`)), pharmacyLiveUrl);
    assert.equal(normalize({ ...parsed, truncated: false }, shop, 'test').products.length, 0, current);
  }
});

test('PharmacyLive custom negative stock flags override positive generic fields and quantity', () => {
  for (const fields of [
    pharmacyFields.replace('<product_in_stock>Y', '<product_in_stock>N'),
    pharmacyFields.replace('Άμεση παραλαβή/Παράδοση σε 1 έως 3 ημέρες', 'Εξαντλημένο'),
    pharmacyFields.replace('<Quantity>4', '<Quantity>0'),
  ]) {
    const parsed = parseXml(xml(`${fields}<instock>Y</instock><availability>in stock</availability>`), pharmacyLiveUrl);
    assert.equal(parsed.items[0].inStock, false);
    assert.equal(normalize({ ...parsed, truncated: false }, shop, 'test').products.length, 0);
  }
});

test('Bonprix skips placeholder images, prefers valid thumbnail and then gallery, without changing prices', () => {
  const fields = `${required}<image>@@ProductImage@@</image><thumbnail>https://www.bonprix.gr/thumb.jpg</thumbnail>
    <additional_imageurl>https://www.bonprix.gr/side.jpg</additional_imageurl><initialprice>5</initialprice>`;
  for (const url of [bonprixUrl, bonprixUrl.replace('www.', '')]) {
    const item = parseXml(xml(fields), url).items[0];
    assert.equal(item.image, 'https://www.bonprix.gr/thumb.jpg');
    assert.deepEqual(item.images, ['https://www.bonprix.gr/side.jpg']);
    assert.equal(item.price, 10);
    assert.equal(item.oldPrice, undefined); // initialprice must never become a lower selling price.
    const noThumbnail = fields.replace('https://www.bonprix.gr/thumb.jpg', '@@Thumbnail@@');
    assert.equal(parseXml(xml(noThumbnail), url).items[0].image, 'https://www.bonprix.gr/side.jpg');
    assert.equal(parseXml(xml(fields.replace('@@ProductImage@@', 'https://www.bonprix.gr/main.jpg')), url).items[0].image, 'https://www.bonprix.gr/main.jpg');
  }
  assert.equal(parseXml(xml(fields)).items[0].image, '@@ProductImage@@');
});

test('the three new profiles require their exact HTTPS endpoint, allowing only www as a host alias', () => {
  for (const endpoint of [eShoesUrl, pharmacyLiveUrl, bonprixUrl]) {
    const url = new URL(endpoint);
    const wrong = [undefined, endpoint.replace('https:', 'http:'), `${endpoint}/`, `${endpoint}?other=1`,
      `${endpoint}#other`, `${url.origin}/other.xml`, endpoint.replace(url.hostname, `${url.hostname}.example.test`),
      endpoint.replace(url.hostname, `${url.hostname}:8443`)];
    const fields = `${required}${glamiFields}${pharmacyFields}<image>@@ProductImage@@</image><thumbnail>https://example.test/thumb.jpg</thumbnail>`;
    const generic = parseXml(xml(fields));
    for (const source of wrong) assert.deepEqual(parseXml(xml(fields), source), generic, source);
  }
});
