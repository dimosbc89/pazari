import { COUNTRIES } from '../shared/markets.ts';
import { buildReport, checkUrl, SyncError, type Issue, type SourceType } from '../sync/index.ts';
import { slug } from '../sync/text.ts';
import { createLoginToken, endSession, getSession, redeemLoginToken, requireSession, type Session } from './auth.ts';
import { mailFor, sendMail } from './email.ts';
import { adminEmails, isDev, type Env } from './env.ts';
import { body, checkSameOrigin, errorResponse, HttpError, isEmail, json, nowIso, num, str } from './http.ts';
import { getShop, intervalHours, shopDto, siteLink, syncShop, unlistShop, type ShopRow, type ShopStatus } from './shops.ts';

const SOURCE_TYPES: SourceType[] = ['feed', 'shopify', 'woocommerce'];
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
  const raw = str(b.sourceUrl, 1000);
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

  const check = await preview(env, type, url, name, countries);
  if (!check.ok) throw new HttpError(422, check.code ?? 'source_failed', check.message ?? 'We could not read your products.');

  const id = await uniqueId(env, name);
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO shops (id, name, website, email, contact_name, phone, company, vat, countries, lang, source_type, source_url, source_format, default_shipping, free_shipping_over, status, created_at, terms_version, terms_accepted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`)
    .bind(id, name, website, email, str(b.contactName, 120) ?? null, str(b.phone, 40) ?? null, str(b.company, 160) ?? null, str(b.vat, 30) ?? null,
      JSON.stringify(countries), lang, type, url, check.format ?? null, num(b.defaultShipping), num(b.freeShippingOver), now, SHOP_TERMS_VERSION, now)
    .run();

  const shop = { countries: JSON.stringify(countries) };
  await sendMail(env, mailFor('received', lang, email, { shop: name }, siteLink(env, shop, '/merchant/login', origin)));
  const admins = adminEmails(env);
  if (admins.length) {
    await sendMail(env, mailFor('newShop', 'el', admins, { shop: name, website, source: `${type} ${url}`, count: check.ready ?? 0 }, siteLink(env, shop, '/admin', origin)));
  }
  return json({ ok: true, id, ready: check.ready });
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
  if ('sourceType' in b || 'sourceUrl' in b) {
    const { type, url } = sourceFrom({ sourceType: b.sourceType ?? shop.source_type, sourceUrl: b.sourceUrl ?? shop.source_url }, env);
    if (type !== shop.source_type || url !== shop.source_url) {
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
  return json({ ok: true, shop: shopDto(await getShop(env, shop.id)) });
};

// ---------------------------------------------------------------- admin

const adminList: Handler = async ({ req, env }) => {
  await requireAdmin(env, req);
  const since = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(`SELECT s.*, COALESCE((SELECT SUM(clicks) FROM clicks c WHERE c.shop_id = s.id AND c.day >= ?), 0) AS clicks30
    FROM shops s ORDER BY CASE s.status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END, s.created_at DESC`).bind(since).all<ShopRow & { clicks30: number }>();
  return json({ ok: true, shops: results.map((r) => ({ ...shopDto(r), clicks30: r.clicks30 })) });
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
    const result = await syncShop(env, { ...shop, status: 'active' }, 'approve', origin);
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
  ['GET', /^\/admin\/shops$/, adminList],
  ['POST', /^\/admin\/shops\/([a-z0-9-]+)\/(approve|reject|pause|resume)$/, adminAction],
];

export async function handleApi(req: Request, env: Env, exec: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '');
  try {
    if (path === '/click' && req.method === 'POST') return await click({ req, env, params: [], origin: url.origin, exec });
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
