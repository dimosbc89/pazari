import { COUNTRIES } from '../shared/markets.ts';
import { buildReport, checkUrl, SyncError, type Issue, type SourceType } from '../sync/index.ts';
import { slug } from '../sync/text.ts';
import { FACETS, SORTS, type Refinements, type SortKey } from '../src/search/types.ts';
import { catalogueMode, getOffers, getProduct, getSetting, getStats, getVariants, listShopProducts, searchCatalogue, setSetting } from './catalogue.ts';
import { PLUGIN_FORMAT, pluginFinish, pluginHello, pluginProducts, setPluginKey } from './plugin.ts';
import { createLoginToken, endSession, getSession, redeemLoginToken, requireSession, type Session } from './auth.ts';
import { mailFor, sendMail } from './email.ts';
import { adminEmails, isDev, type Env } from './env.ts';
import { body, checkSameOrigin, errorResponse, HttpError, isEmail, json, nowIso, num, str } from './http.ts';
import { getShop, intervalHours, shopDto, siteLink, syncShop, unlistShop, type ShopRow, type ShopStatus } from './shops.ts';

const SOURCE_TYPES: SourceType[] = ['feed', 'shopify', 'woocommerce', 'plugin'];
/** Bump when the shop terms (src/content/terms.ts) change, and email shops 15 days before. */
const SHOP_TERMS_VERSION = '2026-11';
const MARKETS = COUNTRIES.map((c) => c.code);

type Handler = (ctx: { req: Request; env: Env; params: string[]; origin: string; exec: ExecutionContext }) => Promise<Response>;

interface Preview {
  ok: boolean;
  code?: string;
  message?: string;
  format?: string;
  found?: number;
  ready?: number;
  skipped?: number;
  issues?: Issue[];
  sample?: { title: unknown; price: number; oldPrice?: number; image: string; brand: string; shipping?: number }[];
}

/** Reads a source and summarises what was found (used by the sign-up form and settings). */
async function preview(env: Env, type: SourceType, url: string, name = 'preview', countries = ['gr']): Promise<Preview> {
  try {
    const report = await buildReport({ id: 'preview', name, countries, sourceType: type, sourceUrl: url }, 'preview', { allowPrivate: isDev(env), timeoutMs: 45_000 });
    return {
      ok: report.products.length > 0,
      format: report.format,
      found: report.found,
      ready: report.products.length,
      skipped: report.skipped,
      issues: report.issues,
      sample: report.products.slice(0, 4).map((p) => ({ title: p.title, price: p.price, oldPrice: p.oldPrice, image: p.image, brand: p.brand, shipping: p.shipping })),
      ...(report.products.length ? {} : { code: 'no_products', message: 'No product passed the checks (price, link, stock).' }),
    };
  } catch (e) {
    if (e instanceof SyncError) return { ok: false, code: e.code, message: e.message };
    throw e;
  }
}

function sourceFrom(b: Record<string, unknown>, env: Env): { type: SourceType; url: string } {
  const type = b.sourceType as SourceType;
  if (!SOURCE_TYPES.includes(type)) throw new HttpError(400, 'bad_source_type');
  // The plugin sends the products itself; the "source" is just the shop's website.
  const raw = type === 'plugin' ? str(b.sourceUrl ?? b.website, 1000) : str(b.sourceUrl, 1000);
  if (!raw) throw new HttpError(400, 'missing_source_url', 'Enter the address of your feed or shop.');
  try {
    return { type, url: checkUrl(raw, { allowPrivate: isDev(env) }).toString() };
  } catch (e) {
    throw new HttpError(400, 'bad_url', e instanceof Error ? e.message : 'Bad address');
  }
}

function countriesFrom(v: unknown): string[] {
  const list = Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string' && MARKETS.includes(c)) : [];
  if (!list.length) throw new HttpError(400, 'missing_countries', 'Choose at least one country you deliver to.');
  return [...new Set(list)];
}

async function uniqueId(env: Env, name: string): Promise<string> {
  const base = slug(name).slice(0, 40);
  for (let i = 1; i < 50; i++) {
    const id = i === 1 ? base : `${base}-${i}`;
    if (!(await env.DB.prepare('SELECT 1 FROM shops WHERE id = ?').bind(id).first())) return id;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

/** The shop, if the session may manage it (its own email, or an admin). */
async function ownedShop(env: Env, s: Session, id: string): Promise<ShopRow> {
  const shop = await getShop(env, id);
  if (!s.admin && shop.email !== s.email) throw new HttpError(404, 'not_found', 'Shop not found.');
  return shop;
}

async function requireAdmin(env: Env, req: Request): Promise<Session> {
  const s = await requireSession(env, req);
  if (!s.admin) throw new HttpError(403, 'admins_only');
  return s;
}

// ---------------------------------------------------------------- public

const checkSource: Handler = async ({ req, env }) => {
  const b = await body(req);
  const { type, url } = sourceFrom(b, env);
  return json(await preview(env, type, url));
};

const signup: Handler = async ({ req, env, origin }) => {
  const b = await body(req);
  if (b.website2) return json({ ok: true }); // honeypot field, filled only by bots
  const name = str(b.name, 80);
  const email = str(b.email, 200)?.toLowerCase();
  const websiteRaw = str(b.website, 300);
  if (!name) throw new HttpError(400, 'missing_name', 'Enter the shop name.');
  if (!isEmail(email)) throw new HttpError(400, 'bad_email', 'Enter a valid email.');
  if (!websiteRaw) throw new HttpError(400, 'missing_website', 'Enter the shop website.');
  if (b.consent !== true) throw new HttpError(400, 'missing_consent');
  const website = checkUrl(websiteRaw, { allowPrivate: isDev(env) }).origin;
  const countries = countriesFrom(b.countries);
  const { type, url } = sourceFrom(b, env);
  const lang = b.lang === 'en' ? 'en' : 'el';

  const dupe = await env.DB.prepare('SELECT id FROM shops WHERE website = ? AND status != ?').bind(website, 'rejected').first();
  if (dupe) throw new HttpError(409, 'already_registered', 'This website is already registered. Sign in instead.');

  const check: Preview = type === 'plugin' ? { ok: true, format: PLUGIN_FORMAT } : await preview(env, type, url, name, countries);
  if (!check.ok) throw new HttpError(422, check.code ?? 'source_failed', check.message ?? 'We could not read your products.');

  const id = await uniqueId(env, name);
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO shops (id, name, website, email, contact_name, phone, company, vat, countries, lang, source_type, source_url, source_format, default_shipping, free_shipping_over, status, created_at, terms_version, terms_accepted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`)
    .bind(id, name, website, email, str(b.contactName, 120) ?? null, str(b.phone, 40) ?? null, str(b.company, 160) ?? null, str(b.vat, 30) ?? null,
      JSON.stringify(countries), lang, type, url, check.format ?? null, num(b.defaultShipping), num(b.freeShippingOver), now, SHOP_TERMS_VERSION, now)
    .run();

  // Plugin shops get their connection key now, shown once on the confirmation screen.
  const pluginKey = type === 'plugin' ? await setPluginKey(env, id) : undefined;
  const shop = { countries: JSON.stringify(countries) };
  await sendMail(env, mailFor('received', lang, email, { shop: name }, siteLink(env, shop, '/merchant/login', origin)));
  const admins = adminEmails(env);
  if (admins.length) {
    await sendMail(env, mailFor('newShop', 'el', admins, { shop: name, website, source: `${type} ${url}`, count: check.ready ?? 0 }, siteLink(env, shop, '/admin', origin)));
  }
  return json({ ok: true, id, ready: check.ready, ...(pluginKey ? { pluginKey } : {}) });
};

const login: Handler = async ({ req, env, origin }) => {
  const b = await body(req);
  const email = str(b.email, 200)?.toLowerCase();
  if (!isEmail(email)) throw new HttpError(400, 'bad_email', 'Enter a valid email.');
  const country = MARKETS.includes(String(b.country)) ? String(b.country) : 'gr';
  const lang = b.lang === 'en' ? 'en' : 'el';
  const known = adminEmails(env).includes(email) || (await env.DB.prepare('SELECT 1 FROM shops WHERE email = ?').bind(email).first());
  let devLink: string | undefined;
  if (known) {
    const token = await createLoginToken(env, email);
    if (token) {
      const link = `${(env.SITE_URL || origin).replace(/\/$/, '')}/${country}/merchant/login?token=${encodeURIComponent(token)}`;
      const sent = await sendMail(env, mailFor('login', lang, email, {}, link));
      if (!sent && isDev(env)) devLink = link;
    }
  }
  // Same answer whether or not the email is known, so it can't be used to list shops.
  return json({ ok: true, ...(devLink ? { devLink } : {}) });
};

const verify: Handler = async ({ req, env }) => {
  const b = await body(req);
  const token = str(b.token, 200);
  if (!token) throw new HttpError(400, 'link_invalid', 'This sign-in link is not valid.');
  const { email, cookie } = await redeemLoginToken(env, token);
  return json({ ok: true, ...(await me(env, email)) }, 200, { 'Set-Cookie': cookie });
};

async function me(env: Env, email: string) {
  const { results } = await env.DB.prepare('SELECT id, name, status FROM shops WHERE email = ? ORDER BY created_at').bind(email).all<{ id: string; name: string; status: ShopStatus }>();
  return { email, admin: adminEmails(env).includes(email), shops: results };
}

const whoami: Handler = async ({ req, env }) => {
  const s = await getSession(env, req);
  if (!s) return json({ ok: false, code: 'signed_out' }, 401);
  return json({ ok: true, ...(await me(env, s.email)) });
};

const logout: Handler = async ({ req, env }) => json({ ok: true }, 200, { 'Set-Cookie': await endSession(env, req) });

/** Click-out counter (sent with navigator.sendBeacon). Stores only shop + day. */
const click: Handler = async ({ req, env }) => {
  let shopId = '';
  try { shopId = String((JSON.parse(await req.text()) as { shopId?: unknown }).shopId ?? ''); } catch { /* ignore */ }
  if (/^[a-z0-9-]{1,90}$/.test(shopId)) {
    await env.DB.prepare(`INSERT INTO clicks (shop_id, day, clicks) SELECT id, ?, 1 FROM shops WHERE id = ? AND status = 'active'
      ON CONFLICT (shop_id, day) DO UPDATE SET clicks = clicks + 1`).bind(nowIso().slice(0, 10), shopId).run();
  }
  return new Response(null, { status: 204 });
};

// ---------------------------------------------------------------- shop owner (or admin)

const shopDetail: Handler = async ({ req, env, params }) => {
  const s = await requireSession(env, req);
  const shop = await ownedShop(env, s, params[0]);
  const since = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  const [runs, clicks] = await Promise.all([
    env.DB.prepare('SELECT id, trigger, started_at, finished_at, status, found, imported, skipped, removed, message FROM sync_runs WHERE shop_id = ? ORDER BY id DESC LIMIT 10').bind(shop.id).all(),
    env.DB.prepare('SELECT day, clicks FROM clicks WHERE shop_id = ? AND day >= ? ORDER BY day').bind(shop.id, since).all<{ day: string; clicks: number }>(),
  ]);
  return json({ ok: true, shop: shopDto(shop), runs: runs.results, clicks: clicks.results, syncEveryHours: intervalHours(env) });
};

const syncNow: Handler = async ({ req, env, params, origin }) => {
  const s = await requireSession(env, req);
  const shop = await ownedShop(env, s, params[0]);
  if (shop.status !== 'active') throw new HttpError(409, 'not_active', 'Only approved shops can sync.');
  if (shop.source_type === 'plugin') throw new HttpError(409, 'plugin_shop', 'This shop sends its products with the Tagora plugin: use "Sync now" in WordPress → WooCommerce → Tagora.');
  if (!s.admin && shop.last_manual_sync_at && Date.now() - Date.parse(shop.last_manual_sync_at) < 5 * 60_000) {
    throw new HttpError(429, 'too_soon', 'You can sync again in a few minutes.');
  }
  await env.DB.prepare('UPDATE shops SET last_manual_sync_at = ? WHERE id = ?').bind(nowIso(), shop.id).run();
  const result = await syncShop(env, shop, 'manual', origin);
  return json({ ok: true, result });
};

const updateShop: Handler = async ({ req, env, params }) => {
  const s = await requireSession(env, req);
  const shop = await ownedShop(env, s, params[0]);
  const b = await body(req);
  const sets: string[] = [];
  const vals: unknown[] = [];
  const set = (col: string, v: unknown) => { sets.push(`${col} = ?`); vals.push(v); };
  let pluginKey: string | undefined;
  if ('sourceType' in b || 'sourceUrl' in b) {
    const { type, url } = sourceFrom({ sourceType: b.sourceType ?? shop.source_type, sourceUrl: b.sourceUrl ?? shop.source_url }, env);
    if (type === 'plugin' && shop.source_type !== 'plugin') {
      set('source_type', type); set('source_url', url); set('source_format', PLUGIN_FORMAT);
      pluginKey = await setPluginKey(env, shop.id);
    } else if (type !== 'plugin' && (type !== shop.source_type || url !== shop.source_url)) {
      const check = await preview(env, type, url, shop.name);
      if (!check.ok) throw new HttpError(422, check.code ?? 'source_failed', check.message ?? 'We could not read your products.');
      set('source_type', type); set('source_url', url); set('source_format', check.format ?? null);
      set('next_sync_at', nowIso()); // pick up the new source on the next scheduled run
    }
  }
  if ('defaultShipping' in b) set('default_shipping', num(b.defaultShipping));
  if ('freeShippingOver' in b) set('free_shipping_over', num(b.freeShippingOver));
  if ('countries' in b) set('countries', JSON.stringify(countriesFrom(b.countries)));
  if ('contactName' in b) set('contact_name', str(b.contactName, 120) ?? null);
  if ('phone' in b) set('phone', str(b.phone, 40) ?? null);
  if (sets.length) await env.DB.prepare(`UPDATE shops SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, shop.id).run();
  return json({ ok: true, shop: shopDto(await getShop(env, shop.id)), ...(pluginKey ? { pluginKey } : {}) });
};

/** A new connection key for the WooCommerce plugin (the old one stops working). */
const newPluginKeyRoute: Handler = async ({ req, env, params }) => {
  const s = await requireSession(env, req);
  const shop = await ownedShop(env, s, params[0]);
  if (shop.source_type !== 'plugin') throw new HttpError(409, 'not_plugin_shop', 'This shop is not connected with the plugin.');
  return json({ ok: true, pluginKey: await setPluginKey(env, shop.id) });
};

// ---------------------------------------------------------------- admin

const adminList: Handler = async ({ req, env }) => {
  await requireAdmin(env, req);
  const since = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(`SELECT s.*, COALESCE((SELECT SUM(clicks) FROM clicks c WHERE c.shop_id = s.id AND c.day >= ?), 0) AS clicks30
    FROM shops s ORDER BY CASE s.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END, s.created_at DESC`).bind(since).all<ShopRow & { clicks30: number }>();
  const [mode, live] = await Promise.all([catalogueMode(env), env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE listed = 1').first<{ n: number }>()]);
  return json({ ok: true, shops: results.map((r) => ({ ...shopDto(r), clicks30: r.clicks30 })), catalogue: { mode, products: live?.n ?? 0 } });
};

/** Switches the website between the demo catalogue and the partner shops' products. */
const adminCatalogue: Handler = async ({ req, env, origin }) => {
  await requireAdmin(env, req);
  const b = await body(req);
  if (b.mode !== 'demo' && b.mode !== 'live') throw new HttpError(400, 'bad_field');
  await setSetting(env, 'catalogue', b.mode);
  // Clears the cached answer here at once; other Cloudflare locations follow within 30 seconds.
  await (caches as unknown as { default: Cache }).default.delete(new Request(`${origin}/api/catalogue/mode`));
  return json({ ok: true, mode: b.mode });
};

const adminAction: Handler = async ({ req, env, params, origin }) => {
  await requireAdmin(env, req);
  const [id, action] = params;
  const shop = await getShop(env, id);
  const b = await body(req);
  const reason = str(b.reason, 500) ?? null;
  const lang = shop.lang as 'el' | 'en';

  if (action === 'approve' || action === 'resume') {
    await env.DB.prepare("UPDATE shops SET status = 'active', status_reason = NULL, approved_at = COALESCE(approved_at, ?), next_sync_at = ? WHERE id = ?").bind(nowIso(), nowIso(), id).run();
    // Plugin shops: show what the plugin already sent; an empty shop gets a full sync at the plugin's next hourly check.
    const result = shop.source_type === 'plugin'
      ? await (async () => {
          const n = await listShopProducts(env, id);
          await env.DB.prepare('UPDATE shops SET product_count = ? WHERE id = ?').bind(n, id).run();
          return { status: 'ok' as const, found: n, imported: n, skipped: 0, removed: 0, message: n ? null : 'Waiting for the plugin to send the products (within the hour).', issues: [] };
        })()
      : await syncShop(env, { ...shop, status: 'active' }, 'approve', origin);
    // A shop that was paused hears it is back; a pending one hears it was approved.
    const kind = action === 'approve' ? 'approved' : shop.status === 'paused' ? 'resumed' : null;
    if (kind) {
      await sendMail(env, mailFor(kind, lang, shop.email, { shop: shop.name, count: result.imported, hours: intervalHours(env) }, siteLink(env, shop, '/merchant/login', origin)));
    }
    return json({ ok: true, result });
  }
  if (action === 'reject' || action === 'pause') {
    await env.DB.prepare('UPDATE shops SET status = ?, status_reason = ? WHERE id = ?').bind(action === 'reject' ? 'rejected' : 'paused', reason, id).run();
    await unlistShop(env, id);
    // Shops are always told why (EU Regulation 2019/1150, art. 4).
    if (action === 'reject') await sendMail(env, mailFor('rejected', lang, shop.email, { shop: shop.name, reason: reason ?? '-' }));
    else await sendMail(env, mailFor('paused', lang, shop.email, { shop: shop.name, reason: reason ?? '-' }, siteLink(env, shop, '/merchant/login', origin)));
    return json({ ok: true });
  }
  throw new HttpError(404, 'not_found');
};

// ---------------------------------------------------------------- catalogue (public, cached)

/** Serves a GET from Cloudflare's edge cache for `seconds`, so busy pages don't query D1 every time. */
async function cached(req: Request, exec: ExecutionContext, seconds: number, make: () => Promise<Response>) {
  const cache = (caches as unknown as { default: Cache }).default;
  // Only the parameters we use make up the cache key, so extra ones can't bypass the cache.
  const url = new URL(req.url);
  const known = new URLSearchParams();
  for (const k of [...CACHE_PARAMS].sort()) for (const v of url.searchParams.getAll(k)) known.append(k, v);
  url.search = known.toString();
  const key = new Request(url.toString(), { method: 'GET' });
  const hit = await cache.match(key);
  if (hit) return hit;
  const res = await make();
  if (!res.ok) return res;
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', `public, max-age=${seconds}`);
  exec.waitUntil(cache.put(key, out.clone()));
  return out;
}

const CACHE_PARAMS = new Set<string>(['q', 'country', 'sort', 'limit', 'group', 'key', ...FACETS]);

const market = (url: URL) => {
  const c = url.searchParams.get('country') ?? '';
  if (!MARKETS.includes(c)) throw new HttpError(400, 'bad_country');
  return c;
};

const catalogueSearch: Handler = ({ req, env, exec }) => cached(req, exec, 300, async () => {
  const url = new URL(req.url);
  const refinements: Refinements = {};
  for (const f of FACETS) {
    const values = url.searchParams.getAll(f).filter(Boolean).map((v) => v.slice(0, 120));
    if (values.length) refinements[f] = values;
  }
  const sort = url.searchParams.get('sort') as SortKey;
  const result = await searchCatalogue(env, {
    query: (url.searchParams.get('q') ?? '').slice(0, 200),
    country: market(url),
    refinements,
    sort: SORTS.includes(sort) ? sort : 'relevance',
    limit: Number(url.searchParams.get('limit')) || 24,
  });
  return json({ ok: true, ...result });
});

const catalogueProduct: Handler = ({ req, env, params, exec }) => cached(req, exec, 300, async () => {
  const product = await getProduct(env, decodeURIComponent(params[0]));
  if (!product) throw new HttpError(404, 'not_found');
  return json({ ok: true, product });
});

const catalogueVariants: Handler = ({ req, env, exec }) => cached(req, exec, 300, async () => {
  const url = new URL(req.url);
  return json({ ok: true, products: await getVariants(env, url.searchParams.get('group') ?? '', market(url)) });
});

const catalogueOffers: Handler = ({ req, env, exec }) => cached(req, exec, 300, async () => {
  const url = new URL(req.url);
  return json({ ok: true, products: await getOffers(env, url.searchParams.get('key') ?? '', market(url)) });
});

const catalogueStats: Handler = ({ req, env, exec }) => cached(req, exec, 300, async () => {
  return json({ ok: true, ...(await getStats(env, market(new URL(req.url)))) });
});

const catalogueModeRoute: Handler = ({ req, env, exec }) => cached(req, exec, 30, async () => json({ ok: true, mode: await catalogueMode(env) }));

/** For uptime monitors: 200 when the database answers and the scheduled sync ran in the last 30 minutes. */
const health: Handler = async ({ env }) => {
  let db = false;
  let lastCron: string | null = null;
  try {
    lastCron = await getSetting(env, 'last_cron_at');
    db = true;
  } catch (e) {
    console.error('health: database', e);
  }
  const cron = !!lastCron && Date.now() - Date.parse(lastCron) < 30 * 60_000;
  const ok = db && cron;
  return json({ ok, db, cron, lastCron }, ok ? 200 : 503);
};

// ---------------------------------------------------------------- router

const ROUTES: [string, RegExp, Handler][] = [
  ['POST', /^\/shops\/check$/, checkSource],
  ['POST', /^\/shops\/signup$/, signup],
  ['POST', /^\/auth\/login$/, login],
  ['POST', /^\/auth\/verify$/, verify],
  ['POST', /^\/auth\/logout$/, logout],
  ['GET', /^\/auth\/me$/, whoami],
  ['GET', /^\/shops\/([a-z0-9-]+)$/, shopDetail],
  ['PATCH', /^\/shops\/([a-z0-9-]+)$/, updateShop],
  ['POST', /^\/shops\/([a-z0-9-]+)\/sync$/, syncNow],
  ['POST', /^\/shops\/([a-z0-9-]+)\/plugin-key$/, newPluginKeyRoute],
  ['GET', /^\/admin\/shops$/, adminList],
  ['POST', /^\/admin\/shops\/([a-z0-9-]+)\/(approve|reject|pause|resume)$/, adminAction],
  ['POST', /^\/admin\/catalogue$/, adminCatalogue],
  ['GET', /^\/catalogue\/search$/, catalogueSearch],
  ['GET', /^\/catalogue\/products\/([^/]+)$/, catalogueProduct],
  ['GET', /^\/catalogue\/variants$/, catalogueVariants],
  ['GET', /^\/catalogue\/offers$/, catalogueOffers],
  ['GET', /^\/catalogue\/stats$/, catalogueStats],
  ['GET', /^\/catalogue\/mode$/, catalogueModeRoute],
  ['GET', /^\/health$/, health],
];

export async function handleApi(req: Request, env: Env, exec: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '');
  try {
    if (path === '/click' && req.method === 'POST') return await click({ req, env, params: [], origin: url.origin, exec });
    // Called by the WooCommerce plugin from the shop's server, authenticated by its connection key.
    if (req.method === 'POST' && path === '/plugin/hello') return await pluginHello(env, req, url.origin);
    if (req.method === 'POST' && path === '/plugin/products') return await pluginProducts(env, req);
    if (req.method === 'POST' && path === '/plugin/finish') return await pluginFinish(env, req);
    checkSameOrigin(req);
    for (const [method, re, handler] of ROUTES) {
      const m = path.match(re);
      if (m && req.method === method) return await handler({ req, env, params: m.slice(1), origin: url.origin, exec });
    }
    throw new HttpError(404, 'not_found');
  } catch (e) {
    if (e instanceof HttpError) return errorResponse(e);
    console.error('api error', req.method, path, e);
    return json({ ok: false, code: 'server_error', message: 'Something went wrong. Please try again.' }, 500);
  }
}
