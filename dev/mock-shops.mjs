// Local test shops for development (never deployed). Serves on http://localhost:9100:
//   /feeds/google.xml     Google Merchant Center RSS feed
//   /feeds/skroutz.xml    Skroutz XML feed (Greek)
//   /feeds/bestprice.xml  BestPrice-style XML feed
//   /feeds/products.tsv   tab-separated feed
//   /                     a Shopify store (/products.json at the root, like a real store)
//   /woo                  a WooCommerce shop (/wp-json/wc/store/v1/products)
//   /img/<name>.svg       product images (from the demo catalogue)
// The same headphones (barcode 5201234567897) are sold by every shop, so the
// product page can compare them. Run: node dev/mock-shops.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 9100);
const BASE = `http://localhost:${PORT}`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const img = (n) => `${BASE}/img/${n}.svg`;

const google = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Demo Google feed</title>
<item><g:id>HP-Q40-BLK</g:id><g:title>Sonaro Q40 ασύρματα ακουστικά, μαύρα</g:title><g:description><![CDATA[<p>Over-ear με <b>ακύρωση θορύβου</b>.</p><p>Έως 40 ώρες μπαταρία.</p>]]></g:description>
<g:link>${BASE}/p/q40</g:link><g:image_link>${img('sonaro-q40-black-1')}</g:image_link><g:additional_image_link>${img('sonaro-q40-black-2')}</g:additional_image_link>
<g:availability>in stock</g:availability><g:price>159.00 EUR</g:price><g:sale_price>139.00 EUR</g:sale_price><g:brand>Sonaro</g:brand><g:gtin>5201234567897</g:gtin><g:mpn>Q40-BLK</g:mpn>
<g:color>Μαύρο</g:color><g:product_type>Ηλεκτρονικά &gt; Ήχος &gt; Ακουστικά</g:product_type><g:shipping><g:country>GR</g:country><g:price>0 EUR</g:price></g:shipping></item>
<item><g:id>LAMP-ARC-R</g:id><g:title>Lumo Arc φωτιστικό γραφείου</g:title><g:link>${BASE}/p/arc</g:link><g:image_link>${img('lumo-arc-red-1')}</g:image_link>
<g:availability>in stock</g:availability><g:price>49.90 EUR</g:price><g:brand>Lumo</g:brand><g:google_product_category>2242</g:google_product_category><g:color>Κόκκινο</g:color>
<g:shipping><g:country>GR</g:country><g:price>3.90 EUR</g:price></g:shipping></item>
<item><g:id>LAMP-ARC-B</g:id><g:title>Lumo Arc φωτιστικό γραφείου</g:title><g:link>${BASE}/p/arc-b</g:link><g:image_link>${img('lumo-arc-black-1')}</g:image_link>
<g:availability>out of stock</g:availability><g:price>49.90 EUR</g:price><g:brand>Lumo</g:brand></item>
<item><g:id>NO-PRICE</g:id><g:title>Προϊόν χωρίς τιμή</g:title><g:link>${BASE}/p/x</g:link><g:availability>in stock</g:availability></item>
</channel></rss>`;

const skroutz = `<?xml version="1.0" encoding="UTF-8"?>
<mywebstore><created_at>2026-11-02 10:00</created_at><products>
<product><id>1001</id><name><![CDATA[Ακουστικά Sonaro Q40 Bluetooth Μαύρο]]></name><link><![CDATA[${BASE}/sk/1001]]></link>
<image><![CDATA[${img('sonaro-q40-black-1')}]]></image><additionalimage><![CDATA[${img('sonaro-q40-black-3')}]]></additionalimage>
<category id="77"><![CDATA[Τεχνολογία > Ήχος > Ακουστικά]]></category><price_with_vat>134,90</price_with_vat><vat>24.00</vat>
<manufacturer><![CDATA[Sonaro]]></manufacturer><mpn>Q40-BLK</mpn><ean>5201234567897</ean><instock>Y</instock><availability>Άμεσα διαθέσιμο</availability>
<shipping>2,50</shipping><color>Μαύρο</color><description><![CDATA[Ασύρματα ακουστικά με ακύρωση θορύβου.]]></description><quantity>12</quantity></product>
<product><id>1002</id><name><![CDATA[Μπρίκι Caffeo Moka Classica 6 φλ.]]></name><link><![CDATA[${BASE}/sk/1002]]></link>
<image><![CDATA[${img('caffeo-moka-classica-red-1')}]]></image><category id="12"><![CDATA[Σπίτι > Κουζίνα > Καφετιέρες]]></category><price_with_vat>31,90</price_with_vat>
<manufacturer><![CDATA[Caffeo]]></manufacturer><mpn>MC-6-RED</mpn><instock>Y</instock><availability>Παράδοση σε 1-3 ημέρες</availability><size>6 φλ.</size><color>Κόκκινο</color><quantity>3</quantity></product>
<product><id>1003</id><name><![CDATA[Θερμός Rivo Flow 750 ml]]></name><link><![CDATA[${BASE}/sk/1003]]></link><image><![CDATA[${img('rivo-flow-olive-1')}]]></image>
<category id="30"><![CDATA[Αθλητισμός > Παγούρια]]></category><price_with_vat>22,00</price_with_vat><manufacturer><![CDATA[Rivo]]></manufacturer><mpn>RF-750</mpn><instock>N</instock><quantity>0</quantity></product>
</products></mywebstore>`;

const bestprice = `<?xml version="1.0" encoding="UTF-8"?>
<store><date>2026-11-02</date><products>
<product><productId>BP-77</productId><title>Sonaro Q40 Wireless Headphones Black</title><productURL>${BASE}/bp/77</productURL><imageURL>${img('sonaro-q40-black-2')}</imageURL>
<price>142.50</price><category_path>Ήχος &gt; Ακουστικά</category_path><brand>Sonaro</brand><ean>5201234567897</ean><availability>Σε απόθεμα</availability><stock>Y</stock></product>
<product><productId>BP-78</productId><title>Solis Cove γυαλιά ηλίου ροζ</title><productURL>${BASE}/bp/78</productURL><imageURL>${img('solis-cove-pink-1')}</imageURL>
<price>64.00</price><category_path>Μόδα &gt; Γυαλιά ηλίου</category_path><brand>Solis</brand><availability>Σε απόθεμα</availability><color>Ροζ</color></product>
</products></store>`;

const tsv = ['id\ttitle\tlink\timage_link\tprice\tsale_price\tbrand\tgtin\tavailability\tproduct_type',
  `T1\tSonaro Q40 ακουστικά\t${BASE}/tsv/1\t${img('sonaro-q40-black-1')}\t149.00 EUR\t\tSonaro\t5201234567897\tin_stock\tΑκουστικά`,
  `T2\tTrekka City Pack σακίδιο\t${BASE}/tsv/2\t${img('trekka-city-pack-navy-1')}\t52,90 EUR\t44,90 EUR\tTrekka\t\tin_stock\tΣακίδια`].join('\n');

const shopify = [
  { id: 9001, title: 'Velto Aero Runner', handle: 'velto-aero-runner', body_html: '<p>Ελαφριά παπούτσια για τρέξιμο.</p>', vendor: 'Velto', product_type: 'Παπούτσια',
    options: [{ name: 'Χρώμα', position: 1 }, { name: 'Μέγεθος', position: 2 }],
    images: [{ src: img('velto-aero-runner-red-1') }, { src: img('velto-aero-runner-navy-1') }],
    variants: [
      { id: 1, title: 'Κόκκινο / 42', option1: 'Κόκκινο', option2: '42', available: true, price: '84.90', compare_at_price: '99.00', featured_image: { src: img('velto-aero-runner-red-1') } },
      { id: 2, title: 'Κόκκινο / 43', option1: 'Κόκκινο', option2: '43', available: false, price: '84.90', compare_at_price: null },
      { id: 3, title: 'Navy / 42', option1: 'Navy', option2: '42', available: true, price: '79.90', compare_at_price: null, featured_image: { src: img('velto-aero-runner-navy-1') } },
    ] },
  { id: 9002, title: 'Sonaro Q40', handle: 'sonaro-q40', body_html: '<p>Ακουστικά με ANC.</p>', vendor: 'Sonaro', product_type: 'Ακουστικά', options: [{ name: 'Title', position: 1 }],
    images: [{ src: img('sonaro-q40-black-1') }],
    variants: [{ id: 4, title: 'Default Title', option1: 'Default Title', available: true, price: '145.00', compare_at_price: null, barcode: '5201234567897' }] },
];

const woo = [
  { id: 501, name: 'Linea Essential Tee &#8211; Λευκό', permalink: `${BASE}/woo/product/tee`, sku: 'LIN-TEE-W', type: 'simple',
    short_description: '<p>Το βασικό t-shirt.</p>', prices: { price: '1790', regular_price: '2390', sale_price: '1790', currency_minor_unit: 2 },
    images: [{ src: img('linea-essential-tee-white-1') }], categories: [{ name: 'Ρούχα' }], brands: [{ name: 'Linea' }],
    attributes: [{ name: 'Χρώμα', terms: [{ name: 'Λευκό' }] }, { name: 'Μέγεθος', terms: [{ name: 'S' }, { name: 'M' }] }], is_in_stock: true },
  { id: 502, name: 'Horo Field 38', permalink: `${BASE}/woo/product/field`, type: 'simple', prices: { price: '12900', regular_price: '12900', sale_price: '12900', currency_minor_unit: 2 },
    images: [{ src: img('horo-field-38-olive-1') }], categories: [{ name: 'Ρολόγια' }], attributes: [{ name: 'Μάρκα', terms: [{ name: 'Horo' }] }], is_in_stock: true },
  { id: 503, name: 'Εξαντλημένο προϊόν', permalink: `${BASE}/woo/product/gone`, prices: { price: '1000', regular_price: '1000', sale_price: '1000', currency_minor_unit: 2 }, is_in_stock: false },
];

const send = (res, status, type, body, headers = {}) => { res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', ...headers }); res.end(body); };

http.createServer((req, res) => {
  const u = new URL(req.url, BASE);
  const p = u.pathname;
  if (p === '/feeds/google.xml') return send(res, 200, 'application/xml; charset=utf-8', google);
  if (p === '/feeds/skroutz.xml') return send(res, 200, 'application/xml; charset=utf-8', skroutz);
  if (p === '/feeds/bestprice.xml') return send(res, 200, 'application/xml; charset=utf-8', bestprice);
  if (p === '/feeds/products.tsv') return send(res, 200, 'text/tab-separated-values; charset=utf-8', tsv);
  if (p === '/feeds/page.html') return send(res, 200, 'text/html', '<!doctype html><html><body>Not a feed</body></html>');
  if (p === '/products.json' || p === '/shopify/products.json') { // a Shopify store lives at the domain root
    const page = Number(u.searchParams.get('page') || 1);
    return send(res, 200, 'application/json', JSON.stringify({ products: page === 1 ? shopify : [] }));
  }
  if (p === '/woo/wp-json/wc/store/v1/products') {
    const page = Number(u.searchParams.get('page') || 1);
    const per = 2;
    return send(res, 200, 'application/json', JSON.stringify(woo.slice((page - 1) * per, page * per)), { 'X-WP-TotalPages': String(Math.ceil(woo.length / per)), 'X-WP-Total': String(woo.length) });
  }
  if (p.startsWith('/img/')) {
    const file = path.join(root, 'public/demo/img', path.basename(p));
    if (fs.existsSync(file)) return send(res, 200, 'image/svg+xml', fs.readFileSync(file));
  }
  if (p.startsWith('/p/') || p.startsWith('/sk/') || p.startsWith('/bp/') || p.startsWith('/tsv/') || p.startsWith('/woo/product/') || p.startsWith('/products/')) {
    return send(res, 200, 'text/html; charset=utf-8', `<!doctype html><meta charset="utf-8"><h1>Shop product page (test)</h1><p>${p}</p>`);
  }
  send(res, 404, 'text/plain', 'not found');
}).listen(PORT, () => console.log(`mock shops on ${BASE}`));
