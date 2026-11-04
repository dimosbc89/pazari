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
