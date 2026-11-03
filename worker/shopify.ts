// The Tagora app for Shopify. It runs inside the Shopify admin (the page at /shopify, see
// shopify-page.ts) and keeps the store's products on Tagora: a full sync with a bulk operation,
// then a webhook for every change. Setup: README → "Tagora app for Shopify".
//
//   GET  /api/shopify/app/state   the store and its Tagora status           (session token)
//   POST /api/shopify/app/apply   apply to Tagora from inside Shopify       (session token)
//   POST /api/shopify/app/sync    full sync now                             (session token)
//   POST /api/shopify/webhooks    every webhook, including the privacy ones (HMAC)
//
// Authentication follows Shopify's current rules for public apps: the page sends a session
// token (a JWT signed with the app secret, from App Bridge); the first time, it is exchanged for
// an expiring offline access token (1 hour) plus a refresh token, stored encrypted.
import { adminProductItems, checkUrl, normalize, type AdminProduct, type AdminVariant, type Issue } from '../sync/index.ts';
import { slug } from '../sync/text.ts';
import { deleteShopProducts, removeProducts, removeProductsExcept, upsertProducts } from './catalogue.ts';
import { mailFor, sendMail } from './email.ts';
import { adminEmails, isDev, type Env } from './env.ts';
import { addHours, body, HttpError, isEmail, json, nowIso, num, str } from './http.ts';
import { countriesFrom, MARKETS, SHOP_TERMS_VERSION, shopConfig, siteLink, uniqueId, unlistShop, type ShopRow } from './shops.ts';

export const SHOPIFY_API_VERSION = '2026-07';
export const SHOPIFY_FORMAT = 'shopify-app';
export const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
/** Full sync once a day; webhooks keep the products current in between. */
const FULL_SYNC_HOURS = 24;

export const shopifyConfigured = (env: Env) => !!(env.SHOPIFY_API_KEY && env.SHOPIFY_API_SECRET);

function appSecret(env: Env): string {
  if (!shopifyConfigured(env)) throw new HttpError(503, 'shopify_not_configured', 'The Tagora app for Shopify is not set up yet.');
  return env.SHOPIFY_API_SECRET!;
}

/** Where the store's Admin API is (a test server in development). */
function adminBase(env: Env, shop: string) {
  return isDev(env) && env.SHOPIFY_TEST_ORIGIN ? `${env.SHOPIFY_TEST_ORIGIN.replace(/\/$/, '')}/${shop}` : `https://${shop}`;
}

const enc = new TextEncoder();
const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const fromBase64Url = (s: string) => {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return fromBase64(b + '==='.slice((b.length + 3) % 4));
};
function toBase64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const hmacKey = (env: Env) => crypto.subtle.importKey('raw', enc.encode(appSecret(env)), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);

// ---------------------------------------------------------------- session tokens (from the app page)

const invalidSession = () => new HttpError(401, 'invalid_session', 'Your Shopify session expired. Reload the app.');

/** Checks a session token from App Bridge. Returns the store it was issued for. */
export async function verifySessionToken(env: Env, token: string): Promise<{ shop: string }> {
  const parts = token.split('.');
  if (parts.length !== 3) throw invalidSession();
  let header: { alg?: string };
  let claims: { exp?: number; nbf?: number; aud?: string; iss?: string; dest?: string };
  try {
    header = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(fromBase64Url(parts[1])));
  } catch {
    throw invalidSession();
  }
  if (header.alg !== 'HS256') throw invalidSession();
  const signed = await crypto.subtle.verify('HMAC', await hmacKey(env), fromBase64Url(parts[2]), enc.encode(`${parts[0]}.${parts[1]}`));
  if (!signed) throw invalidSession();
  const now = Date.now() / 1000;
  const leeway = 10;
  if (typeof claims.exp !== 'number' || claims.exp < now - leeway) throw invalidSession();
  if (typeof claims.nbf === 'number' && claims.nbf > now + leeway) throw invalidSession();
  if (claims.aud !== env.SHOPIFY_API_KEY) throw invalidSession();
  const host = (u?: string) => { try { return u ? new URL(u).hostname : ''; } catch { return ''; } };
  const shop = host(claims.dest);
  if (!SHOP_DOMAIN.test(shop) || host(claims.iss) !== shop) throw invalidSession();
  return { shop };
}

/** Webhooks are signed with the app secret (base64 HMAC-SHA256 of the raw body). */
async function validWebhook(env: Env, raw: string, signature: string): Promise<boolean> {
  let sig: Uint8Array;
  try { sig = fromBase64(signature); } catch { return false; }
  return crypto.subtle.verify('HMAC', await hmacKey(env), sig, enc.encode(raw));
}

// ---------------------------------------------------------------- access tokens (stored encrypted)

interface Tokens { access: string; expires: number | null; refresh: string | null; refreshExpires: number | null; scope: string }

export interface StoreRow {
  shop_domain: string; shop_id: string | null; token: string | null; info: string | null;
  installed_at: string; uninstalled_at: string | null; paused_by_uninstall: number;
  bulk_id: string | null; bulk_started_at: string | null; bulk_trigger: string | null; bulk_claimed_at: string | null;
  last_webhook_at: string | null;
}

export interface StoreInfo {
  name: string; email: string; website: string; currency: string; taxesIncluded: boolean; country: string | null; at: string;
}

class ShopifyAuthError extends Error {}

async function tokenKey(env: Env) {
  const base = await crypto.subtle.importKey('raw', enc.encode(appSecret(env)), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('tagora-shopify-tokens'), info: enc.encode('v1') },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}

async function seal(env: Env, t: Tokens): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await tokenKey(env), enc.encode(JSON.stringify(t))));
  return `v1.${toBase64(iv)}.${toBase64(data)}`;
}

/** null when it can't be read (e.g. the app secret was changed): the store reconnects on its next visit. */
async function unseal(env: Env, sealed: string | null): Promise<Tokens | null> {
  if (!sealed) return null;
  try {
    const [, iv, data] = sealed.split('.');
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, await tokenKey(env), fromBase64(data));
    return JSON.parse(new TextDecoder().decode(plain)) as Tokens;
  } catch {
    return null;
  }
}

async function tokenRequest(env: Env, shop: string, params: Record<string, string>): Promise<Tokens> {
  const res = await fetch(`${adminBase(env, shop)}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.SHOPIFY_API_KEY, client_secret: appSecret(env), ...params }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; scope?: string; expires_in?: number; refresh_token?: string; refresh_token_expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) throw new ShopifyAuthError(`token request failed (${res.status} ${data.error ?? ''})`.trim());
  const now = Date.now();
  return {
    access: data.access_token,
    scope: data.scope ?? '',
    expires: data.expires_in ? now + data.expires_in * 1000 : null,
    refresh: data.refresh_token ?? null,
    refreshExpires: data.refresh_token_expires_in ? now + data.refresh_token_expires_in * 1000 : null,
  };
}

/** Session token → offline access token that expires (required for new public apps since April 2026). */
function exchangeToken(env: Env, shop: string, sessionToken: string) {
  return tokenRequest(env, shop, {
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: sessionToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token',
    expiring: '1',
  });
}

export async function getStore(env: Env, shop: string) {
  return env.DB.prepare('SELECT * FROM shopify_stores WHERE shop_domain = ?').bind(shop).first<StoreRow>();
}

/** A working access token, refreshed when it expires within 5 minutes (or when force is set). */
async function accessToken(env: Env, store: StoreRow, force = false): Promise<string> {
  const t = await unseal(env, store.token);
  if (!t) throw new ShopifyAuthError('not connected');
  if (!force && (!t.expires || t.expires - Date.now() > 5 * 60_000)) return t.access;
  if (!t.refresh || (t.refreshExpires && t.refreshExpires < Date.now())) {
    await dropToken(env, store);
    throw new ShopifyAuthError('refresh token expired');
  }
  const old = store.token;
  try {
    const fresh = await tokenRequest(env, store.shop_domain, { grant_type: 'refresh_token', refresh_token: t.refresh });
    const sealed = await seal(env, fresh);
    await env.DB.prepare('UPDATE shopify_stores SET token = ? WHERE shop_domain = ?').bind(sealed, store.shop_domain).run();
    store.token = sealed;
    return fresh.access;
  } catch (e) {
    // Refresh tokens are single-use: another request may be refreshing at this moment. Use its token.
    for (let i = 0; i < 6; i++) {
      const now = await getStore(env, store.shop_domain);
      const other = now?.token && now.token !== old ? await unseal(env, now.token) : null;
      if (other) { store.token = now!.token; return other.access; }
      await sleep(500);
    }
    await dropToken(env, store);
    throw e instanceof ShopifyAuthError ? e : new ShopifyAuthError(String(e));
  }
}

/** Forget a token that no longer works: the store reconnects when someone opens the app. */
async function dropToken(env: Env, store: StoreRow) {
  await env.DB.prepare('UPDATE shopify_stores SET token = NULL WHERE shop_domain = ? AND token IS ?').bind(store.shop_domain, store.token).run();
  store.token = null;
}

/** One Admin GraphQL API call, with retries when Shopify asks us to slow down. */
async function adminQuery<T>(env: Env, store: StoreRow, query: string, variables?: Record<string, unknown>): Promise<T> {
  let refreshed = false;
  for (let attempt = 0; ; attempt++) {
    const token = await accessToken(env, store);
    const res = await fetch(`${adminBase(env, store.shop_domain)}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401) {
      // Shopify no longer takes it (expired early, or revoked): refresh once, then give up.
      if (!refreshed) { refreshed = true; await accessToken(env, store, true); continue; }
      await dropToken(env, store);
      throw new ShopifyAuthError('Shopify refused the access token (401)');
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 3) { await sleep(1000 * 2 ** attempt); continue; }
    const data = (await res.json().catch(() => ({}))) as { data?: T; errors?: { message: string; extensions?: { code?: string } }[] };
    if (data.errors?.some((e) => e.extensions?.code === 'THROTTLED') && attempt < 3) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok || data.errors?.length || !data.data) {
      throw new Error(`Shopify API ${res.status}: ${data.errors?.map((e) => e.message).join('; ') || 'no data'}`);
    }
    return data.data;
  }
}

// ---------------------------------------------------------------- what we read from Shopify

const PRODUCT_FIELDS = 'id legacyResourceId title handle status vendor productType description onlineStoreUrl category { fullName } featuredMedia { preview { image { url } } }';
const VARIANT_FIELDS = 'id legacyResourceId title price compareAtPrice barcode availableForSale selectedOptions { name value } image { url }';
const MEDIA_FIELDS = '... on MediaImage { id image { url } }';

/** Every active product, prepared by Shopify as a file (bulk operation). */
const BULK_QUERY = `{ products(query: "status:active") { edges { node { ${PRODUCT_FIELDS}
  variants { edges { node { ${VARIANT_FIELDS} } } }
  media { edges { node { ${MEDIA_FIELDS} } } } } } } }`;
const BULK_RUN = 'mutation run($query: String!) { bulkOperationRunQuery(query: $query) { bulkOperation { id status } userErrors { field message } } }';
const BULK_STATUS = 'query op($id: ID!) { node(id: $id) { ... on BulkOperation { id status errorCode objectCount url } } }';
const PRODUCT_QUERY = `query product($id: ID!) { product(id: $id) { ${PRODUCT_FIELDS}
  variants(first: 250) { nodes { ${VARIANT_FIELDS} } }
  media(first: 10) { nodes { ${MEDIA_FIELDS} } } } }`;
const INVENTORY_QUERY = 'query item($id: ID!) { inventoryItem(id: $id) { variant { product { id } } } }';
const SHOP_QUERY = '{ shop { name email currencyCode taxesIncluded primaryDomain { url } billingAddress { countryCodeV2 } } }';

type RawProduct = Omit<AdminProduct, 'variants' | 'images'> & { variants: { nodes: AdminVariant[] }; media: { nodes: { image?: { url: string } }[] } };

/** Prices without VAT get it added, at the rate of the store's country. */
const VAT: Record<string, number> = { GR: 1.24, CY: 1.19, IE: 1.23, MT: 1.18 };
const vatFactor = (info: StoreInfo | null) => (!info || info.taxesIncluded ? 1 : VAT[info.country ?? ''] ?? 1);

const parseInfo = (s: string | null): StoreInfo | null => { try { return s ? (JSON.parse(s) as StoreInfo) : null; } catch { return null; } };

async function refreshInfo(env: Env, store: StoreRow): Promise<StoreInfo> {
  const { shop } = await adminQuery<{ shop: { name: string; email: string; currencyCode: string; taxesIncluded: boolean; primaryDomain: { url: string }; billingAddress: { countryCodeV2: string | null } | null } }>(env, store, SHOP_QUERY);
  const info: StoreInfo = {
    name: shop.name, email: shop.email, website: shop.primaryDomain.url, currency: shop.currencyCode,
    taxesIncluded: shop.taxesIncluded, country: shop.billingAddress?.countryCodeV2 ?? null, at: nowIso(),
  };
  await env.DB.prepare('UPDATE shopify_stores SET info = ? WHERE shop_domain = ?').bind(JSON.stringify(info), store.shop_domain).run();
  store.info = JSON.stringify(info);
  return info;
}

/** Reads the result file of a bulk operation (JSON lines; variants and images point to their product). */
async function readBulk(url: string): Promise<AdminProduct[]> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Could not download the product list from Shopify (${res.status}).`);
  const products = new Map<string, AdminProduct>();
  const variants: [string, AdminVariant][] = [];
  const images: [string, string][] = [];
  const handle = (line: string) => {
    if (!line.trim()) return;
    const o = JSON.parse(line) as Record<string, unknown> & { id?: string; __parentId?: string; image?: { url?: string } };
    const id = String(o.id ?? '');
    if (!o.__parentId) {
      if (id.includes('/Product/')) products.set(id, { ...(o as unknown as AdminProduct), variants: [], images: [] });
    } else if (id.includes('/ProductVariant/')) {
      variants.push([o.__parentId, o as unknown as AdminVariant]);
    } else if (o.image?.url) {
      images.push([o.__parentId, o.image.url]);
    }
  };
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += value;
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) { handle(buf.slice(0, nl)); buf = buf.slice(nl + 1); }
  }
  handle(buf);
  for (const [p, v] of variants) products.get(p)?.variants.push(v);
  for (const [p, url] of images) products.get(p)?.images.push(url);
  return [...products.values()];
}

// ---------------------------------------------------------------- full sync (bulk operation)

/** Asks Shopify to prepare the product list. The result arrives with the bulk_operations/finish webhook. */
async function startBulk(env: Env, store: StoreRow, trigger: string) {
  if (store.bulk_id && store.bulk_started_at && store.bulk_started_at > minutesAgo(60)) return; // one at a time
  const data = await adminQuery<{ bulkOperationRunQuery: { bulkOperation: { id: string } | null; userErrors: { message: string }[] } }>(env, store, BULK_RUN, { query: BULK_QUERY });
  const op = data.bulkOperationRunQuery.bulkOperation;
  if (!op) throw new Error(`Shopify did not start the sync: ${data.bulkOperationRunQuery.userErrors.map((e) => e.message).join('; ')}`);
  await env.DB.prepare('UPDATE shopify_stores SET bulk_id = ?, bulk_started_at = ?, bulk_trigger = ?, bulk_claimed_at = NULL WHERE shop_domain = ?')
    .bind(op.id, nowIso(), trigger, store.shop_domain).run();
  store.bulk_id = op.id;
}

/** Full sync for a Tagora shop connected with the app (dashboard, approval, admin). */
export async function startShopifySync(env: Env, shopId: string, trigger: string) {
  const store = await env.DB.prepare('SELECT * FROM shopify_stores WHERE shop_id = ? AND uninstalled_at IS NULL').bind(shopId).first<StoreRow>();
  if (!store) throw new HttpError(409, 'shopify_not_installed', 'The Tagora app is not installed on this Shopify store.');
  try {
    await startBulk(env, store, trigger);
  } catch (e) {
    if (e instanceof ShopifyAuthError) throw new HttpError(409, 'shopify_reconnect', 'Open the Tagora app in your Shopify admin once to reconnect it.');
    throw e;
  }
}

/** Saves the result of a finished bulk operation (from the webhook, or the cron if that was missed). */
async function checkBulk(env: Env, domain: string, opId?: string) {
  const store = await getStore(env, domain);
  if (!store?.bulk_id || (opId && opId !== store.bulk_id)) return;
  const { node: op } = await adminQuery<{ node: { status: string; errorCode: string | null; url: string | null } | null }>(env, store, BULK_STATUS, { id: store.bulk_id });
  if (op && ['CREATED', 'RUNNING', 'CANCELING'].includes(op.status) && store.bulk_started_at! > minutesAgo(24 * 60)) return;
  // Only one worker saves the result; another may take over if this one dies (after 15 minutes).
  const claim = await env.DB.prepare('UPDATE shopify_stores SET bulk_claimed_at = ? WHERE shop_domain = ? AND bulk_id = ? AND (bulk_claimed_at IS NULL OR bulk_claimed_at < ?)')
    .bind(nowIso(), domain, store.bulk_id, minutesAgo(15)).run();
  if (!claim.meta.changes) return;
  const shop = store.shop_id ? await env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(store.shop_id).first<ShopRow>() : null;
  const trigger = store.bulk_trigger ?? 'schedule';
  if (shop && shop.status !== 'rejected') {
    if (op?.status === 'COMPLETED') {
      await saveFullSync(env, store, shop, op.url ? await readBulk(op.url) : [], trigger);
    } else {
      await saveRun(env, shop, trigger, null, `Shopify could not prepare the product list (${op?.errorCode ?? op?.status ?? 'not found'}). We will try again.`);
    }
  }
  await env.DB.prepare('UPDATE shopify_stores SET bulk_id = NULL, bulk_claimed_at = NULL WHERE shop_domain = ? AND bulk_id = ?').bind(domain, store.bulk_id).run();
}

async function saveFullSync(env: Env, store: StoreRow, shop: ShopRow, products: AdminProduct[], trigger: string) {
  const items = products.flatMap((p) => adminProductItems(p, vatFactor(parseInfo(store.info))));
  const report = normalize({ format: SHOPIFY_FORMAT, items, truncated: false }, shopConfig(shop), crypto.randomUUID());
  await upsertProducts(env, shop.id, report.products, shop.status === 'active');
  const removed = await removeProductsExcept(env, shop.id, report.products.map((p) => p.id));
  await saveRun(env, shop, trigger, { found: report.found, imported: report.products.length, skipped: report.skipped, removed, issues: report.issues });
}

/** Records a full sync (or its failure) like the other connection types, for the dashboards. */
async function saveRun(env: Env, shop: ShopRow, trigger: string, r: { found: number; imported: number; skipped: number; removed: number; issues: Issue[] } | null, failure?: string) {
  const now = nowIso();
  let status: 'ok' | 'warning' | 'error' = 'error';
  let message = failure ?? null;
  if (r) {
    const soldOut = r.issues.find((i) => i.code === 'out_of_stock')?.count ?? 0;
    const skippedShare = r.found ? (r.skipped - soldOut) / r.found : 0;
    status = r.imported === 0 ? 'error' : skippedShare > 0.1 ? 'warning' : 'ok';
    if (r.imported === 0) {
      message = r.found
        ? `None of the ${r.found} products passed the checks (price, link, stock). See the issues list.`
        : 'No active products on the Online Store sales channel.';
    }
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO sync_runs (shop_id, trigger, started_at, finished_at, status, found, imported, skipped, removed, message, issues) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(shop.id, trigger, now, now, status, r?.found ?? 0, r?.imported ?? 0, r?.skipped ?? 0, r?.removed ?? 0, message, JSON.stringify(r?.issues ?? [])),
    r
      ? env.DB.prepare('UPDATE shops SET last_sync_at = ?, last_sync_status = ?, last_sync_message = ?, last_issues = ?, product_count = (SELECT COUNT(*) FROM products WHERE shop_id = ?), source_format = ?, next_sync_at = ? WHERE id = ?')
          .bind(now, status, message, JSON.stringify(r.issues), shop.id, SHOPIFY_FORMAT, addHours(FULL_SYNC_HOURS), shop.id)
      : env.DB.prepare('UPDATE shops SET last_sync_at = ?, last_sync_status = ?, last_sync_message = ?, next_sync_at = ? WHERE id = ?')
          .bind(now, 'error', message, addHours(1), shop.id),
    env.DB.prepare('DELETE FROM sync_runs WHERE shop_id = ? AND id NOT IN (SELECT id FROM sync_runs WHERE shop_id = ? ORDER BY id DESC LIMIT 50)').bind(shop.id, shop.id),
  ]);
}

// ---------------------------------------------------------------- one product changed (webhooks)

async function linkedShop(env: Env, store: StoreRow): Promise<ShopRow | null> {
  if (!store.shop_id) return null;
  const shop = await env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(store.shop_id).first<ShopRow>();
  return shop && shop.source_type === 'shopify-app' && shop.status !== 'rejected' ? shop : null;
}

const countProducts = (env: Env, shopId: string) =>
  env.DB.prepare('UPDATE shops SET product_count = (SELECT COUNT(*) FROM products WHERE shop_id = ?) WHERE id = ?').bind(shopId, shopId).run();

/** Reads one product again and updates its offers (one per variant) on Tagora. */
async function refreshProduct(env: Env, store: StoreRow, productGid: string) {
  const shop = await linkedShop(env, store);
  if (!shop || shop.status === 'paused') return;
  const { product } = await adminQuery<{ product: RawProduct | null }>(env, store, PRODUCT_QUERY, { id: productGid });
  const items = product
    ? adminProductItems({ ...product, variants: product.variants.nodes, images: product.media.nodes.flatMap((m) => (m.image?.url ? [m.image.url] : [])) }, vatFactor(parseInfo(store.info)))
    : [];
  const report = normalize({ format: SHOPIFY_FORMAT, items, truncated: false }, shopConfig(shop), 'live');
  await upsertProducts(env, shop.id, report.products, shop.status === 'active');
  // Offers of this product that are gone: deleted variants, sold out, unpublished, archived.
  const keep = new Set(report.products.map((p) => p.id));
  const { results } = await env.DB.prepare('SELECT id FROM products WHERE shop_id = ? AND group_id = ?').bind(shop.id, `${shop.id}-${slug(productGid.split('/').pop() ?? '')}`).all<{ id: string }>();
  await removeProducts(env, results.map((r) => r.id).filter((id) => !keep.has(id)));
  await countProducts(env, shop.id);
}

async function removeProduct(env: Env, store: StoreRow, productId: string) {
  const shop = await linkedShop(env, store);
  if (!shop) return;
  await env.DB.prepare('DELETE FROM products WHERE shop_id = ? AND group_id = ?').bind(shop.id, `${shop.id}-${slug(productId)}`).run();
  await countProducts(env, shop.id);
}

async function onInventory(env: Env, store: StoreRow, inventoryItemId: unknown) {
  if (!store.shop_id) return;
  const { inventoryItem } = await adminQuery<{ inventoryItem: { variant: { product: { id: string } } | null } | null }>(env, store, INVENTORY_QUERY, { id: `gid://shopify/InventoryItem/${String(inventoryItemId)}` });
  const productGid = inventoryItem?.variant?.product.id;
  if (productGid) await refreshProduct(env, store, productGid);
}

// ---------------------------------------------------------------- install / uninstall / privacy

async function uninstalled(env: Env, store: StoreRow) {
  await env.DB.prepare('UPDATE shopify_stores SET uninstalled_at = ?, token = NULL, bulk_id = NULL, bulk_claimed_at = NULL WHERE shop_domain = ?').bind(nowIso(), store.shop_domain).run();
  const shop = await linkedShop(env, store);
  if (!shop) return;
  if (shop.status === 'active') {
    const reason = shop.lang === 'en'
      ? 'The Tagora app was removed from your Shopify store. Install it again to bring your products back.'
      : 'Η εφαρμογή Tagora αφαιρέθηκε από το κατάστημα Shopify. Εγκατάστησέ τη ξανά για να επιστρέψουν τα προϊόντα σου.';
    await env.DB.batch([
      env.DB.prepare("UPDATE shops SET status = 'paused', status_reason = ? WHERE id = ?").bind(reason, shop.id),
      env.DB.prepare('UPDATE shopify_stores SET paused_by_uninstall = 1 WHERE shop_domain = ?').bind(store.shop_domain),
    ]);
    await unlistShop(env, shop.id);
  } else {
    await deleteShopProducts(env, shop.id);
    await countProducts(env, shop.id);
  }
}

/** Installed again: a shop we paused because the app was removed comes back by itself. */
async function reinstalled(env: Env, store: StoreRow) {
  const shop = await linkedShop(env, store);
  if (!shop) return;
  if (shop.status === 'paused' && store.paused_by_uninstall) {
    await env.DB.batch([
      env.DB.prepare("UPDATE shops SET status = 'active', status_reason = NULL WHERE id = ?").bind(shop.id),
      env.DB.prepare('UPDATE shopify_stores SET paused_by_uninstall = 0 WHERE shop_domain = ?').bind(store.shop_domain),
    ]);
  }
  if (shop.status !== 'paused' || store.paused_by_uninstall) await startBulk(env, store, 'install');
}

/** shop/redact: 48 hours after the app was removed, delete what we keep about the store. */
async function redact(env: Env, domain: string) {
  const store = await getStore(env, domain);
  if (!store) return;
  if (store.shop_id) {
    await deleteShopProducts(env, store.shop_id);
    await countProducts(env, store.shop_id);
  }
  await env.DB.prepare('DELETE FROM shopify_stores WHERE shop_domain = ?').bind(domain).run();
}

// ---------------------------------------------------------------- the app page's API

/** The store behind a request from the app page, connected (token exchange) when needed. */
async function appStore(env: Env, req: Request): Promise<StoreRow> {
  const sessionToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!sessionToken) throw invalidSession();
  const { shop } = await verifySessionToken(env, sessionToken);
  let store = await getStore(env, shop);
  const tokens = store && !store.uninstalled_at ? await unseal(env, store.token) : null;
  const usable = !!tokens && (!tokens.refreshExpires || tokens.refreshExpires > Date.now() + 60_000);
  if (!usable) {
    let fresh: Tokens;
    try {
      fresh = await exchangeToken(env, shop, sessionToken);
    } catch (e) {
      console.error('shopify token exchange failed', shop, e);
      throw invalidSession();
    }
    const wasRemoved = !!store?.uninstalled_at;
    const now = nowIso();
    await env.DB.prepare(`INSERT INTO shopify_stores (shop_domain, token, installed_at) VALUES (?, ?, ?)
      ON CONFLICT (shop_domain) DO UPDATE SET token = excluded.token, uninstalled_at = NULL,
        installed_at = CASE WHEN shopify_stores.uninstalled_at IS NULL THEN shopify_stores.installed_at ELSE excluded.installed_at END`)
      .bind(shop, await seal(env, fresh), now).run();
    store = (await getStore(env, shop))!;
    await refreshInfo(env, store);
    if (wasRemoved) await reinstalled(env, store);
  } else if (!store!.info || (parseInfo(store!.info)?.at ?? '') < minutesAgo(60)) {
    await refreshInfo(env, store!);
  }
  return store!;
}

const TERMS_PATH = '/pages/shop-terms';

async function appStateOf(env: Env, store: StoreRow, origin: string) {
  const info = parseInfo(store.info);
  const shop = store.shop_id ? await env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(store.shop_id).first<ShopRow>() : null;
  const site = (env.SITE_URL || origin).replace(/\/$/, '');
  return {
    ok: true,
    store: { domain: store.shop_domain, name: info?.name ?? '', email: info?.email ?? '', website: info?.website ?? '', currency: info?.currency ?? '', taxesIncluded: info?.taxesIncluded ?? true },
    syncing: !!store.bulk_id,
    markets: MARKETS,
    termsUrl: `${site}/gr${TERMS_PATH}`,
    tagora: shop && {
      id: shop.id, name: shop.name, status: shop.status, statusReason: shop.status_reason, productCount: shop.product_count,
      lastSyncAt: shop.last_sync_at, lastSyncStatus: shop.last_sync_status, lastSyncMessage: shop.last_sync_message,
      issues: shop.last_issues ? (JSON.parse(shop.last_issues) as Issue[]) : [],
      dashboard: siteLink(env, shop, '/merchant/login', origin),
    },
  };
}

export async function shopifyAppState(env: Env, req: Request, origin: string) {
  const store = await appStore(env, req);
  return json(await appStateOf(env, store, origin));
}

export async function shopifyAppApply(env: Env, req: Request, origin: string) {
  const store = await appStore(env, req);
  if (store.shop_id) throw new HttpError(409, 'already_applied', 'This store has already applied to Tagora.');
  const info = parseInfo(store.info);
  if (!info) throw new HttpError(503, 'shopify_unavailable', 'Could not read your store details from Shopify. Try again.');
  const b = await body(req);
  const name = str(b.name, 80);
  const email = str(b.email, 200)?.toLowerCase();
  if (!name) throw new HttpError(400, 'missing_name', 'Enter the shop name.');
  if (!isEmail(email)) throw new HttpError(400, 'bad_email', 'Enter a valid email.');
  if (b.consent !== true) throw new HttpError(400, 'missing_consent', 'Accept the terms for shops to continue.');
  if (info.currency !== 'EUR') throw new HttpError(422, 'currency', `Tagora shows prices in euro; your store's currency is ${info.currency}.`);
  const countries = countriesFrom(b.countries);
  const lang = b.lang === 'en' ? 'en' : 'el';
  const website = checkUrl(info.website).origin;
  const dupe = await env.DB.prepare('SELECT id FROM shops WHERE website = ? AND status != ?').bind(website, 'rejected').first();
  if (dupe) throw new HttpError(409, 'already_registered', 'This website is already registered on Tagora. Write to us to connect it with the app.');

  const id = await uniqueId(env, name);
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO shops (id, name, website, email, phone, countries, lang, source_type, source_url, source_format, default_shipping, free_shipping_over, status, created_at, terms_version, terms_accepted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'shopify-app', ?, ?, ?, ?, 'pending', ?, ?, ?)`)
      .bind(id, name, website, email, str(b.phone, 40) ?? null, JSON.stringify(countries), lang, `https://${store.shop_domain}`, SHOPIFY_FORMAT,
        num(b.defaultShipping), num(b.freeShippingOver), now, SHOP_TERMS_VERSION, now),
    env.DB.prepare('UPDATE shopify_stores SET shop_id = ? WHERE shop_domain = ?').bind(id, store.shop_domain),
  ]);
  store.shop_id = id;

  const link = { countries: JSON.stringify(countries) };
  await sendMail(env, mailFor('received', lang, email, { shop: name }, siteLink(env, link, '/merchant/login', origin)));
  const admins = adminEmails(env);
  if (admins.length) {
    await sendMail(env, mailFor('newShop', 'el', admins, { shop: name, website, source: `Shopify app (${store.shop_domain})`, count: '-' }, siteLink(env, link, '/admin', origin)));
  }
  // Products arrive in a minute or two; they stay hidden until the shop is approved.
  try {
    await startBulk(env, store, 'apply');
  } catch (e) {
    console.error('shopify first sync failed to start', store.shop_domain, e);
  }
  return json(await appStateOf(env, store, origin));
}

export async function shopifyAppSync(env: Env, req: Request, origin: string) {
  const store = await appStore(env, req);
  const shop = await linkedShop(env, store);
  if (!shop) throw new HttpError(409, 'not_applied', 'Apply to Tagora first.');
  if (shop.status === 'paused') throw new HttpError(409, 'not_active', shop.status_reason ?? 'Your shop is paused on Tagora.');
  if (shop.last_manual_sync_at && shop.last_manual_sync_at > minutesAgo(5)) throw new HttpError(429, 'too_soon', 'You can sync again in a few minutes.');
  await env.DB.prepare('UPDATE shops SET last_manual_sync_at = ? WHERE id = ?').bind(nowIso(), shop.id).run();
  await startBulk(env, store, 'manual');
  return json(await appStateOf(env, store, origin));
}

// ---------------------------------------------------------------- webhooks

const ok = () => new Response(null, { status: 200 });

export async function shopifyWebhook(env: Env, req: Request, exec: ExecutionContext): Promise<Response> {
  if (!shopifyConfigured(env)) return new Response('Not configured', { status: 503 });
  const raw = await req.text();
  if (!(await validWebhook(env, raw, req.headers.get('X-Shopify-Hmac-Sha256') ?? ''))) return new Response('Invalid signature', { status: 401 });
  const topic = (req.headers.get('X-Shopify-Topic') ?? '').toLowerCase();
  const domain = (req.headers.get('X-Shopify-Shop-Domain') ?? '').toLowerCase();
  if (!SHOP_DOMAIN.test(domain)) return new Response('Unknown shop', { status: 400 });
  let payload: Record<string, unknown> = {};
  try { payload = JSON.parse(raw) as Record<string, unknown>; } catch { /* privacy webhooks are JSON; others too */ }

  // Privacy (compliance) webhooks. We keep no customer data: only the store's products and details.
  if (topic === 'customers/data_request' || topic === 'customers/redact') return ok();
  if (topic === 'shop/redact') { await redact(env, domain); return ok(); }

  const store = await getStore(env, domain);
  if (!store || (store.uninstalled_at && topic !== 'app/uninstalled')) return ok();
  await env.DB.prepare('UPDATE shopify_stores SET last_webhook_at = ? WHERE shop_domain = ?').bind(nowIso(), domain).run();
  // Shopify waits 5 seconds for an answer, so the work continues after it.
  const later = (what: string, p: Promise<unknown>) => exec.waitUntil(p.catch((e) => console.error(`shopify ${what} failed`, domain, e)));
  switch (topic) {
    case 'app/uninstalled': await uninstalled(env, store); break;
    case 'products/create':
    case 'products/update': later(topic, refreshProduct(env, store, `gid://shopify/Product/${String(payload.id)}`)); break;
    case 'products/delete': await removeProduct(env, store, String(payload.id)); break;
    case 'inventory_levels/update': later(topic, onInventory(env, store, payload.inventory_item_id)); break;
    case 'bulk_operations/finish': later(topic, checkBulk(env, domain, String(payload.admin_graphql_api_id ?? ''))); break;
  }
  return ok();
}

// ---------------------------------------------------------------- schedule (cron, every 10 minutes)

export async function shopifyCron(env: Env) {
  if (!shopifyConfigured(env)) return;
  // Finished full syncs whose webhook was missed (or whose saving failed).
  const { results: running } = await env.DB.prepare('SELECT shop_domain FROM shopify_stores WHERE bulk_id IS NOT NULL AND bulk_started_at < ? LIMIT 5')
    .bind(minutesAgo(isDev(env) ? 0 : 3)).all<{ shop_domain: string }>();
  for (const r of running) await checkBulk(env, r.shop_domain).catch((e) => console.error('shopify bulk check failed', r.shop_domain, e));

  // The daily full sync, which also catches any missed webhook.
  const { results: due } = await env.DB.prepare(`SELECT st.* FROM shopify_stores st JOIN shops s ON s.id = st.shop_id
      WHERE s.status = 'active' AND s.source_type = 'shopify-app' AND st.uninstalled_at IS NULL AND st.bulk_id IS NULL
        AND (s.next_sync_at IS NULL OR s.next_sync_at <= ?) LIMIT 5`).bind(nowIso()).all<StoreRow>();
  for (const store of due) {
    try {
      await startBulk(env, store, 'schedule');
    } catch (e) {
      const message = e instanceof ShopifyAuthError
        ? 'Tagora lost access to the Shopify store. Open the Tagora app in the Shopify admin once to reconnect it.'
        : `Could not start the sync: ${e instanceof Error ? e.message : String(e)}`;
      console.error('shopify scheduled sync failed', store.shop_domain, e);
      await env.DB.prepare("UPDATE shops SET last_sync_status = 'error', last_sync_message = ?, next_sync_at = ? WHERE id = ?")
        .bind(message, addHours(6), store.shop_id).run();
    }
  }
}
