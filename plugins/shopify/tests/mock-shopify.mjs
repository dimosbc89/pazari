// A stand-in for Shopify, for testing the Tagora app without a real store: token exchange and
// refresh (expiring offline tokens, single-use refresh tokens), the Admin GraphQL queries the
// app uses, bulk operations with a JSONL result file, and signed webhooks sent to Tagora.
//
//   node plugins/shopify/tests/mock-shopify.mjs      (port 8790, Tagora at http://localhost:8787)
//
// Tagora uses it when .dev.vars has SHOPIFY_TEST_ORIGIN=http://localhost:8790.
// The test drives it through /_control/… (see e2e.mjs).
import { createHmac, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT || 8790);
const BASE = `http://localhost:${PORT}`;
const TAGORA = process.env.TAGORA || 'http://localhost:8787';
const CLIENT_ID = process.env.SHOPIFY_API_KEY || 'test-client-id';
const SECRET = process.env.SHOPIFY_API_SECRET || 'test-secret';
const VERSION = '2026-07';

const b64url = (b) => Buffer.from(b).toString('base64url');
export function sessionToken(shop, { secret = SECRET, aud = CLIENT_ID, exp = 60, nbf = -5, dest } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iss: `https://${shop}/admin`, dest: dest ?? `https://${shop}`, aud, sub: '42', exp: now + exp, nbf: now + nbf, iat: now, jti: randomBytes(8).toString('hex'), sid: 'sid-1' }));
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

// ---------------------------------------------------------------- stores and their products

const variant = (id, o = {}) => ({
  id: `gid://shopify/ProductVariant/${id}`, legacyResourceId: String(id), title: 'Default Title', price: '10.00', compareAtPrice: null,
  barcode: null, availableForSale: true, selectedOptions: [{ name: 'Title', value: 'Default Title' }], image: null, inventoryItem: 3000 + (id - 2000), ...o,
});
const product = (id, o = {}) => ({
  id: `gid://shopify/Product/${id}`, legacyResourceId: String(id), title: `Product ${id}`, handle: `p-${id}`, status: 'ACTIVE', vendor: '',
  productType: '', description: '', onlineStoreUrl: `https://shop.example/products/p-${id}`, category: null,
  featuredMedia: { preview: { image: { url: `https://cdn.example/${id}.jpg` } } }, media: [`https://cdn.example/${id}.jpg`, `https://cdn.example/${id}-b.jpg`], variants: [], ...o,
});

function catalogue(domain) {
  const site = `https://${domain.replace('.myshopify.com', '')}.example`;
  return [
    product(1001, { title: 'Ακουστικά Sonaro Q40', handle: 'sonaro-q40', vendor: 'Sonaro', category: { fullName: 'Electronics > Audio > Headphones' },
      description: 'Over-ear με ακύρωση θορύβου.', onlineStoreUrl: `${site}/products/sonaro-q40`,
      variants: [variant(2001, { price: '109.00', compareAtPrice: '129.00', barcode: '5209000000017' })] }),
    product(1002, { title: 'Αθλητικά Velto Aero', handle: 'velto-aero', vendor: 'Velto', productType: 'Παπούτσια', onlineStoreUrl: `${site}/products/velto-aero`,
      variants: [
        variant(2002, { title: '42', price: '80.00', barcode: '5209000000062', selectedOptions: [{ name: 'Μέγεθος', value: '42' }], image: { url: 'https://cdn.example/velto-42.jpg' } }),
        variant(2003, { title: '43', price: '80.00', selectedOptions: [{ name: 'Μέγεθος', value: '43' }] }),
        variant(2004, { title: '44', price: '80.00', availableForSale: false, selectedOptions: [{ name: 'Μέγεθος', value: '44' }] }),
      ] }),
    product(1003, { title: 'Πρόχειρο', status: 'DRAFT', variants: [variant(2005)] }),
    product(1004, { title: 'Μόνο σε άλλο κανάλι', onlineStoreUrl: null, variants: [variant(2007)] }),
    product(1005, { title: 'Φωτιστικό Lumo', vendor: '', onlineStoreUrl: `${site}/products/lumo`,
      variants: [variant(2006, { title: 'Κόκκινο', price: '49.90', selectedOptions: [{ name: 'Χρώμα', value: 'Κόκκινο' }] })] }),
  ];
}

const stores = new Map();
function store(domain) {
  if (!stores.has(domain)) {
    stores.set(domain, {
      domain, products: catalogue(domain), access: new Map(), refresh: new Map(), ops: new Map(), opSeq: 0,
      info: { name: domain.startsWith('page') ? 'Page Test Store' : 'Test Store', email: `owner@${domain}`, currencyCode: 'EUR', taxesIncluded: true,
        primaryDomain: { url: `https://${domain.replace('.myshopify.com', '')}.example` }, billingAddress: { countryCodeV2: 'GR' } },
      stats: { exchanges: 0, refreshes: 0, failedRefreshes: 0, expiringRequested: 0, queries: 0, bulkRuns: 0 },
      accessTtl: 3600, sendBulkWebhook: true, installed: true,
    });
  }
  return stores.get(domain);
}

function issueTokens(s) {
  const access = `shpat_${randomBytes(12).toString('hex')}`;
  const refresh = `shprt_${randomBytes(12).toString('hex')}`;
  s.access.set(access, Date.now() + s.accessTtl * 1000);
  s.refresh.set(refresh, true);
  return { access_token: access, scope: 'read_products,read_inventory', expires_in: s.accessTtl, refresh_token: refresh, refresh_token_expires_in: 7776000 };
}

function verifyJwt(token) {
  const [h, b, sig] = String(token).split('.');
  if (!sig || createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64url') !== sig) return null;
  return JSON.parse(Buffer.from(b, 'base64url').toString());
}

// ---------------------------------------------------------------- GraphQL (only what the app asks)

const asVariant = (v) => { const { inventoryItem: _i, ...rest } = v; return rest; };
const productOut = (p) => { const { media, variants, ...rest } = p; return rest; };

function bulkLines(s) {
  const lines = [];
  for (const p of s.products.filter((p) => p.status === 'ACTIVE')) {
    lines.push(JSON.stringify(productOut(p)));
    for (const v of p.variants) lines.push(JSON.stringify({ ...asVariant(v), __parentId: p.id }));
    p.media.forEach((url, i) => lines.push(JSON.stringify({ id: `gid://shopify/MediaImage/${p.legacyResourceId}${i}`, image: { url }, __parentId: p.id })));
    lines.push(JSON.stringify({ __parentId: p.id })); // a video: no image fields
  }
  return lines.join('\n') + '\n';
}

async function graphql(s, query, variables) {
  s.stats.queries++;
  if (query.includes('bulkOperationRunQuery')) {
    if (!/products\(query: "status:active"\)/.test(variables.query) || !variables.query.includes('variants') || variables.query.includes('fragment')) {
      return { data: { bulkOperationRunQuery: { bulkOperation: null, userErrors: [{ field: ['query'], message: 'Unexpected bulk query' }] } } };
    }
    s.stats.bulkRuns++;
    const id = `gid://shopify/BulkOperation/${++s.opSeq}`;
    const op = { id, status: 'RUNNING', errorCode: null, objectCount: '0', url: null, file: bulkLines(s) };
    s.ops.set(id, op);
    setTimeout(() => {
      op.status = 'COMPLETED';
      op.url = `${BASE}/files/${s.domain}/${s.opSeq}.jsonl`;
      if (s.sendBulkWebhook) webhook(s.domain, 'bulk_operations/finish', { admin_graphql_api_id: id, status: 'completed', type: 'query' });
    }, 400);
    return { data: { bulkOperationRunQuery: { bulkOperation: { id, status: 'CREATED' }, userErrors: [] } } };
  }
  if (query.includes('node(id: $id)')) {
    const op = s.ops.get(variables.id);
    return { data: { node: op ? { id: op.id, status: op.status, errorCode: op.errorCode, objectCount: op.objectCount, url: op.url } : null } };
  }
  if (query.includes('product(id: $id)')) {
    const p = s.products.find((x) => x.id === variables.id);
    return { data: { product: p ? { ...productOut(p), variants: { nodes: p.variants.map(asVariant) }, media: { nodes: [...p.media.map((url) => ({ image: { url } })), {}] } } : null } };
  }
  if (query.includes('inventoryItem(id: $id)')) {
    const n = Number(String(variables.id).split('/').pop());
    const p = s.products.find((x) => x.variants.some((v) => v.inventoryItem === n));
    return { data: { inventoryItem: { variant: p ? { product: { id: p.id } } : null } } };
  }
  if (/\{\s*shop\s*\{/.test(query)) return { data: { shop: s.info } };
  return { errors: [{ message: `mock: unknown query ${query.slice(0, 60)}` }] };
}

// ---------------------------------------------------------------- webhooks to Tagora

export async function webhook(domain, topic, payload, { secret = SECRET } = {}) {
  const body = JSON.stringify(payload);
  const res = await fetch(`${TAGORA}/api/shopify/webhooks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', 'X-Shopify-Topic': topic, 'X-Shopify-Shop-Domain': domain, 'X-Shopify-API-Version': VERSION,
      'X-Shopify-Webhook-Id': randomBytes(8).toString('hex'), 'X-Shopify-Hmac-Sha256': createHmac('sha256', secret).update(body).digest('base64'),
    },
    body,
  });
  return res.status;
}

// ---------------------------------------------------------------- HTTP

const read = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => r(d)); });
const send = (res, status, data, type = 'application/json') => {
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(typeof data === 'string' ? data : JSON.stringify(data));
};

createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const parts = url.pathname.split('/').filter(Boolean);
  try {
    // Result files of bulk operations
    if (parts[0] === 'files') {
      const s = store(parts[1]);
      const op = [...s.ops.values()].find((o) => o.url === `${BASE}${url.pathname}`);
      return op ? send(res, 200, op.file, 'application/jsonl') : send(res, 404, 'no file', 'text/plain');
    }
    // Test controls
    if (parts[0] === '_control') {
      const [, domain, action] = parts;
      if (domain === 'session-token') return send(res, 200, sessionToken(url.searchParams.get('shop')), 'text/plain');
      const s = store(domain);
      const b = req.method === 'POST' ? JSON.parse((await read(req)) || '{}') : {};
      const p = (id) => s.products.find((x) => x.legacyResourceId === String(id));
      switch (action) {
        case 'stats': return send(res, 200, s.stats);
        case 'set': Object.assign(s, b); return send(res, 200, { ok: true });
        case 'price': { const v = p(b.product).variants.find((x) => x.legacyResourceId === String(b.variant)); v.price = b.price; return send(res, 200, { status: await webhook(domain, 'products/update', { id: Number(b.product), admin_graphql_api_id: p(b.product).id }) }); }
        case 'soldout': { const v = p(b.product).variants.find((x) => x.legacyResourceId === String(b.variant)); v.availableForSale = false; return send(res, 200, { status: await webhook(domain, 'inventory_levels/update', { inventory_item_id: v.inventoryItem, location_id: 1, available: 0 }) }); }
        case 'delete': s.products = s.products.filter((x) => x.legacyResourceId !== String(b.product)); return send(res, 200, { status: await webhook(domain, 'products/delete', { id: Number(b.product) }) });
        case 'expire': for (const k of s.access.keys()) s.access.set(k, Date.now() - 1000); return send(res, 200, { ok: true });
        case 'uninstall': s.access.clear(); s.refresh.clear(); s.installed = false; return send(res, 200, { status: await webhook(domain, 'app/uninstalled', { id: 1, domain }) });
        case 'webhook': return send(res, 200, { status: await webhook(domain, b.topic, b.payload ?? {}, { secret: b.secret ?? SECRET }) });
        default: return send(res, 404, { error: 'unknown control' });
      }
    }
    // Shopify: /{shop}/admin/oauth/access_token and /{shop}/admin/api/{version}/graphql.json
    const domain = parts[0];
    if (!/^[a-z0-9-]+\.myshopify\.com$/.test(domain ?? '')) return send(res, 404, { errors: 'Not Found' });
    const s = store(domain);
    if (url.pathname === `/${domain}/admin/oauth/access_token` && req.method === 'POST') {
      const b = JSON.parse(await read(req));
      if (b.client_id !== CLIENT_ID || b.client_secret !== SECRET) return send(res, 401, { error: 'invalid_client' });
      if (b.grant_type === 'urn:ietf:params:oauth:grant-type:token-exchange') {
        const claims = verifyJwt(b.subject_token);
        if (!claims || new URL(claims.dest).hostname !== domain || claims.exp < Date.now() / 1000) return send(res, 400, { error: 'invalid_subject_token' });
        if (b.requested_token_type !== 'urn:shopify:params:oauth:token-type:offline-access-token' || b.subject_token_type !== 'urn:ietf:params:oauth:token-type:id_token') return send(res, 400, { error: 'invalid_request' });
        if (b.expiring !== '1') return send(res, 400, { error: 'expiring_tokens_required' });
        s.stats.exchanges++; s.stats.expiringRequested++; s.installed = true;
        return send(res, 200, issueTokens(s));
      }
      if (b.grant_type === 'refresh_token') {
        if (!s.refresh.get(b.refresh_token)) { s.stats.failedRefreshes++; return send(res, 400, { error: 'invalid_grant' }); }
        s.refresh.delete(b.refresh_token); // single use
        s.stats.refreshes++;
        await new Promise((r) => setTimeout(r, 150)); // makes concurrent refreshes overlap in the test
        return send(res, 200, issueTokens(s));
      }
      return send(res, 400, { error: 'unsupported_grant_type' });
    }
    if (url.pathname === `/${domain}/admin/api/${VERSION}/graphql.json` && req.method === 'POST') {
      const exp = s.access.get(req.headers['x-shopify-access-token']);
      if (!exp || exp < Date.now()) return send(res, 401, { errors: '[API] Invalid API key or access token (unrecognized login or wrong password)' });
      const { query, variables } = JSON.parse(await read(req));
      return send(res, 200, await graphql(s, query, variables ?? {}));
    }
    send(res, 404, { errors: 'Not Found' });
  } catch (e) {
    console.error(e);
    send(res, 500, { errors: String(e) });
  }
}).listen(PORT, () => console.log(`mock Shopify on ${BASE} (Tagora: ${TAGORA})`));
