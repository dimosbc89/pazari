// End-to-end test of the Tagora app for Shopify, against a local Tagora (wrangler dev on :8787,
// with .dev.vars from .dev.vars.example) and the stand-in Shopify (mock-shopify.mjs on :8790).
// Runs on GitHub: .github/workflows/shopify-app.yml.
import { createHmac, randomBytes } from 'node:crypto';

const T = process.env.TAGORA || 'http://localhost:8787';
const M = process.env.MOCK || 'http://localhost:8790';
const SHOP = 'test-store.myshopify.com';
const CLIENT_ID = 'test-client-id';
const SECRET = 'test-secret';

let fails = 0;
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function token(shop = SHOP, { secret = SECRET, aud = CLIENT_ID, exp = 60 } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ iss: `https://${shop}/admin`, dest: `https://${shop}`, aud, sub: '42', exp: now + exp, nbf: now - 5, iat: now, jti: randomBytes(6).toString('hex'), sid: 's' });
  return `${head}.${body}.${createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')}`;
}

async function app(path, { body, tok = token(), shop } = {}) {
  const res = await fetch(`${T}/api/shopify/app/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(tok === null ? {} : { Authorization: `Bearer ${shop ? token(shop) : tok}` }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, retry: res.headers.get('X-Shopify-Retry-Invalid-Session-Request'), data: await res.json().catch(() => ({})) };
}
const control = async (action, body, shop = SHOP) =>
  (await fetch(`${M}/_control/${shop}/${action}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
const get = async (path, headers = {}) => { const r = await fetch(`${T}${path}`, { headers }); return { status: r.status, data: await r.json().catch(() => ({})) }; };

async function untilSynced(label, shop = SHOP) {
  for (let i = 0; i < 40; i++) {
    const s = await app('state', { shop });
    if (s.data.ok && !s.data.syncing) return s.data;
    await sleep(500);
  }
  check(`${label}: sync finished`, 'still running', 'finished');
  return (await app('state', { shop })).data;
}

console.log('== The page inside the Shopify admin');
{
  const r = await fetch(`${T}/shopify?shop=${SHOP}&host=abc&embedded=1&locale=el-GR`);
  const html = await r.text();
  check('page: loads', r.status, 200);
  check('page: App Bridge with the Client ID', html.includes(`<meta name="shopify-api-key" content="${CLIENT_ID}">`) && html.includes('https://cdn.shopify.com/shopifycloud/app-bridge.js'), true);
  check('page: App Bridge is the first script', html.indexOf('<script') === html.indexOf('<script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"'), true);
  check('page: only this store may frame it', r.headers.get('content-security-policy'), `frame-ancestors https://${SHOP} https://admin.shopify.com;`);
  check('page: Greek', html.includes('<html lang="el">'), true);
  const outside = await fetch(`${T}/shopify`);
  const o = await outside.text();
  check('page outside Shopify: no App Bridge, no framing', [o.includes('app-bridge.js'), outside.headers.get('content-security-policy')], [false, "frame-ancestors 'none';"]);
  const en = await (await fetch(`${T}/shopify?shop=${SHOP}&locale=en`)).text();
  check('page: English', en.includes('<html lang="en">'), true);
}

console.log('== Session tokens');
{
  const none = await app('state', { tok: null });
  check('no token: 401 + retry header', [none.status, none.retry], [401, '1']);
  check('wrong signature: 401', (await app('state', { tok: token(SHOP, { secret: 'nope' }) })).status, 401);
  check('other app (aud): 401', (await app('state', { tok: token(SHOP, { aud: 'other-app' }) })).status, 401);
  check('expired: 401', (await app('state', { tok: token(SHOP, { exp: -120 }) })).status, 401);
  const bad = token('evil.example.com');
  check('not a myshopify.com store: 401', (await app('state', { tok: bad })).status, 401);
}

console.log('== Install: token exchange, store details');
let state = await app('state');
check('state: ok', state.status, 200);
check('state: store details from Shopify', [state.data.store?.name, state.data.store?.email, state.data.store?.currency], ['Test Store', `owner@${SHOP}`, 'EUR']);
check('state: not on Tagora yet', state.data.tagora, null);
let stats = await control('stats');
check('expiring offline token requested', [stats.exchanges, stats.expiringRequested], [1, 1]);
await app('state');
check('token kept (no second exchange)', (await control('stats')).exchanges, 1);

console.log('== Apply from inside Shopify');
check('apply without consent: 400', (await app('apply', { body: { name: 'Test Store', email: 'owner@test.example', countries: ['gr'] } })).status, 400);
check('apply without countries: 400', (await app('apply', { body: { name: 'Test Store', email: 'owner@test.example', countries: [], consent: true } })).status, 400);
const applied = await app('apply', { body: { name: 'Test Store', email: 'owner@test.example', countries: ['gr', 'cy'], consent: true, defaultShipping: '3.50', lang: 'el' } });
check('apply: pending', applied.data.tagora?.status, 'pending');
check('apply: first sync started', applied.data.syncing, true);
const shopId = applied.data.tagora?.id;
check('apply twice: 409', (await app('apply', { body: { name: 'x', email: 'a@b.cd', countries: ['gr'], consent: true } })).status, 409);
state = await untilSynced('first sync');
check('first sync: offers ready (hidden until approval)', state.tagora?.productCount, 4);
check('first sync: status', state.tagora?.lastSyncStatus, 'warning');
const codes = Object.fromEntries((state.tagora?.issues ?? []).map((i) => [i.code, i.count]));
check('first sync: issues', [codes.out_of_stock, codes.missing_link, codes.missing_brand, codes.missing_identifier], [1, 1, 1, 2]);
check('pending shop: not in search', (await get('/api/catalogue/search?country=gr&q=q40')).data.total, 0);

console.log('== Admin approves');
const login = await (await fetch(`${T}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@example.com' }) })).json();
const verify = await fetch(`${T}/api/auth/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: new URL(login.devLink).searchParams.get('token') }) });
const cookie = verify.headers.get('set-cookie').split(';')[0];
const admin = (path, body, method = 'POST') => fetch(`${T}/api${path}`, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: body && JSON.stringify(body) }).then(async (r) => ({ status: r.status, data: await r.json() }));
const approved = await admin(`/admin/shops/${shopId}/approve`, {});
check('approve: offers listed', approved.data.result?.imported, 4);
await untilSynced('sync on approval');

console.log('== What Tagora shows');
const s1 = (await get('/api/catalogue/search?country=gr&q=sonaro')).data;
check('sonaro: found', s1.total, 1);
check('sonaro: sale price + old price', [s1.hits?.[0]?.price, s1.hits?.[0]?.oldPrice], [109, 129]);
check('sonaro: barcode', s1.hits?.[0]?.matchKey, 'gtin:5209000000017');
check('sonaro: brand (Vendor)', s1.hits?.[0]?.brand, 'Sonaro');
check('sonaro: category (Shopify taxonomy)', s1.hits?.[0]?.category, 'Electronics > Audio > Headphones');
check('sonaro: link to the product', s1.hits?.[0]?.url, 'https://test-store.example/products/sonaro-q40');
const v = (await get('/api/catalogue/search?country=gr&q=velto&sort=price_asc')).data;
check('velto: one offer per size in stock', v.total, 2);
check('velto: sizes', (v.hits ?? []).map((h) => h.size).sort(), ['42', '43']);
check('velto: variant link', (v.hits ?? []).map((h) => h.url).sort()[0], 'https://test-store.example/products/velto-aero?variant=2002');
const l = (await get('/api/catalogue/search?country=gr&q=lumo')).data;
check('lumo: colour', l.hits?.[0]?.color, 'Κόκκινο');
check('cyprus too', (await get('/api/catalogue/search?country=cy&q=sonaro%20q40')).data.total, 1);

console.log('== Live updates (webhooks)');
check('price change webhook accepted', (await control('price', { product: 1001, variant: 2001, price: '99.00' })).status, 200);
await sleep(1200);
check('price change reaches Tagora', (await get(`/api/catalogue/products/${shopId}-1001-2001`)).data.product?.price, 99);
await control('soldout', { product: 1002, variant: 2002 });
await sleep(1200);
check('sold out (inventory webhook): removed', (await get(`/api/catalogue/products/${shopId}-1002-2002`)).status, 404);
check('other size stays', (await get(`/api/catalogue/products/${shopId}-1002-2003`)).status, 200);
await control('delete', { product: 1005 });
check('deleted product: removed', (await get(`/api/catalogue/products/${shopId}-1005-2006`)).status, 404);

console.log('== Expiring tokens: refresh, also when two requests refresh at once');
await control('expire');
const [a, b] = await Promise.all([
  control('price', { product: 1001, variant: 2001, price: '95.00' }),
  control('webhook', { topic: 'products/update', payload: { id: 1002 } }),
]);
check('both webhooks accepted', [a.status, b.status], [200, 200]);
await sleep(2000);
stats = await control('stats');
check('token refreshed once, no new install needed', [stats.refreshes >= 1, stats.exchanges], [true, 1]);
check('update after refresh reaches Tagora', (await get('/api/catalogue/search?country=gr&q=ακουστικα%20sonaro')).data.hits?.[0]?.price, 95);

console.log('== Webhook security and privacy webhooks');
check('bad signature: 401', (await control('webhook', { topic: 'products/update', payload: { id: 1001 }, secret: 'wrong' })).status, 401);
check('customers/data_request: 200', (await control('webhook', { topic: 'customers/data_request', payload: { shop_domain: SHOP, customer: { id: 1 } } })).status, 200);
check('customers/redact: 200', (await control('webhook', { topic: 'customers/redact', payload: { shop_domain: SHOP, customer: { id: 1 } } })).status, 200);

console.log('== Sync now');
const sync1 = await app('sync', { body: {} });
check('sync from the app: started', [sync1.status, sync1.data.syncing], [200, true]);
check('sync again at once: 429', (await app('sync', { body: {} })).status, 429);
await untilSynced('manual sync');
const dash = await admin(`/shops/${shopId}/sync`, {});
check('sync from the Tagora dashboard: started', dash.data.started, true);
await untilSynced('dashboard sync');

console.log('== Missed "finished" webhook: the schedule picks it up');
await control('set', { sendBulkWebhook: false });
await control('price', { product: 1002, variant: 2003, price: '70.00' });
await admin(`/shops/${shopId}/sync`, {});
await sleep(1000);
check('still waiting without the webhook', (await app('state')).data.syncing, true);
await fetch(`${T}/cdn-cgi/local/scheduled`);
await sleep(500);
check('schedule saved the result', (await app('state')).data.syncing, false);
await control('set', { sendBulkWebhook: true });

console.log('== Uninstall, reinstall, data removal');
await control('uninstall');
let detail = await admin(`/shops/${shopId}`, undefined, 'GET');
check('uninstalled: shop paused, offers removed', [detail.data.shop?.status, detail.data.shop?.productCount], ['paused', 0]);
state = await app('state');
check('reinstall: new token exchange', (await control('stats')).exchanges, 2);
check('reinstall: shop live again', state.data.tagora?.status, 'active');
state = await untilSynced('sync on reinstall');
check('reinstall: offers back', state.tagora?.productCount, 2);
await control('uninstall');
check('shop/redact: 200', (await control('webhook', { topic: 'shop/redact', payload: { shop_domain: SHOP, shop_id: 1 } })).status, 200);
detail = await admin(`/shops/${shopId}`, undefined, 'GET');
check('after redact: no offers kept', detail.data.shop?.productCount, 0);
state = await app('state');
check('after redact: the store starts fresh', state.data.tagora, null);

console.log('== Dashboards');
const list = await admin('/admin/shops', undefined, 'GET');
const row = list.data.shops?.find((x) => x.id === shopId);
check('admin list: source', [row?.sourceType, row?.sourceFormat], ['shopify-app', 'shopify-app']);
check('changing the connection of a Shopify app shop: 409', (await admin(`/shops/${shopId}`, { sourceType: 'feed', sourceUrl: 'https://x.example/feed.xml' }, 'PATCH')).status, 409);

console.log(fails ? `\n${fails} check(s) failed` : '\nall checks passed');
process.exit(fails ? 1 : 0);
