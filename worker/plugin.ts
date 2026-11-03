// The Tagora plugin for WooCommerce sends the shop's products here, so it works even when the
// shop's firewall would block Tagora from reading them. The plugin authenticates with the shop's
// connection key ("Authorization: Bearer tgr_…"); only its SHA-256 is stored.
//
//   POST /api/plugin/hello     who am I, is a full sync needed            (every hour)
//   POST /api/plugin/products  a batch of products, and/or ids to remove  (full sync, or one product changed)
//   POST /api/plugin/finish    end of a full sync: every product id sent   (removes the rest)
import { normalize, type Issue, type SourceItem } from '../sync/index.ts';
import { slug } from '../sync/text.ts';
import { sha256 } from './auth.ts';
import { removeProducts, removeProductsExcept, upsertProducts } from './catalogue.ts';
import type { Env } from './env.ts';
import { addHours, body, HttpError, json, nowIso } from './http.ts';
import { intervalHours, shopConfig, siteLink, type ShopRow } from './shops.ts';

export const PLUGIN_FORMAT = 'woocommerce-plugin';
const MAX_ITEMS = 500;
const MAX_BODY = 8 * 1024 * 1024;

/** A new connection key. Shown to the shop once; we keep only its hash. */
export function newPluginKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return 'tgr_' + [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function setPluginKey(env: Env, shopId: string): Promise<string> {
  const key = newPluginKey();
  await env.DB.prepare('UPDATE shops SET plugin_key_hash = ? WHERE id = ?').bind(await sha256(key), shopId).run();
  return key;
}

async function pluginShop(env: Env, req: Request): Promise<ShopRow> {
  const key = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!/^tgr_[0-9a-f]{48}$/.test(key)) throw new HttpError(401, 'bad_key', 'This connection key is not valid. Copy it again from your Tagora dashboard.');
  const shop = await env.DB.prepare('SELECT * FROM shops WHERE plugin_key_hash = ?').bind(await sha256(key)).first<ShopRow>();
  if (!shop) throw new HttpError(401, 'bad_key', 'This connection key is not valid. Copy it again from your Tagora dashboard.');
  if (shop.status === 'rejected') throw new HttpError(403, 'shop_rejected', `Your application was not approved${shop.status_reason ? `: ${shop.status_reason}` : '.'}`);
  if (shop.status === 'paused') throw new HttpError(403, 'shop_paused', `Your shop is paused on Tagora${shop.status_reason ? `: ${shop.status_reason}` : '.'}`);
  return shop;
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
const number = (v: unknown) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** What the plugin sends for one product, checked field by field. */
function toItem(raw: unknown): SourceItem {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: text(String(r.id ?? ''), 120) ?? '',
    groupId: text(r.groupId === undefined ? undefined : String(r.groupId), 120),
    title: text(r.title, 300),
    description: text(r.description, 5000),
    url: text(r.url, 1000),
    image: text(r.image, 1000),
    images: Array.isArray(r.images) ? r.images.map((i) => text(i, 1000)).filter((i): i is string => !!i).slice(0, 10) : undefined,
    price: number(r.price),
    oldPrice: number(r.oldPrice),
    shipping: number(r.shipping),
    brand: text(r.brand, 120),
    category: text(r.category, 300),
    color: text(r.color, 60),
    size: text(r.size, 60),
    mpn: text(r.mpn, 80),
    gtin: text(r.gtin, 40),
    inStock: r.inStock !== false,
  };
}

function mergeIssues(a: Issue[], b: Issue[]): Issue[] {
  const all = new Map(a.map((i) => [i.code, { ...i, examples: [...i.examples] }]));
  for (const i of b) {
    const cur = all.get(i.code);
    if (!cur) all.set(i.code, { ...i, examples: [...i.examples] });
    else { cur.count += i.count; cur.examples = [...cur.examples, ...i.examples].slice(0, 5); }
  }
  return [...all.values()];
}

const touch = (env: Env, shop: ShopRow) => env.DB.prepare('UPDATE shops SET plugin_seen_at = ? WHERE id = ?').bind(nowIso(), shop.id).run();

export async function pluginHello(env: Env, req: Request, origin: string) {
  const shop = await pluginShop(env, req);
  const b = await body(req);
  const info = { site: text(b.site, 300), plugin: text(b.plugin, 20), woocommerce: text(b.woocommerce, 20), wordpress: text(b.wordpress, 20), php: text(b.php, 20), products: number(b.products) };
  await env.DB.prepare('UPDATE shops SET plugin_seen_at = ?, plugin_info = ? WHERE id = ?').bind(nowIso(), JSON.stringify(info), shop.id).run();
  // A full sync when the shop has nothing online (just connected, approved or resumed),
  // or when the last one is older than the sync interval.
  const stale = !shop.last_sync_at || Date.now() - Date.parse(shop.last_sync_at) > intervalHours(env) * 3_600_000;
  return json({
    ok: true,
    shop: { id: shop.id, name: shop.name, status: shop.status, countries: JSON.parse(shop.countries || '[]'), productCount: shop.product_count, lastSyncAt: shop.last_sync_at },
    fullSync: shop.product_count === 0 || stale,
    batchSize: 200,
    dashboard: siteLink(env, shop, '/merchant', origin),
  });
}

export async function pluginProducts(env: Env, req: Request) {
  const shop = await pluginShop(env, req);
  const b = await body(req, MAX_BODY);
  const items = Array.isArray(b.items) ? b.items : [];
  const remove = Array.isArray(b.remove) ? b.remove.map((x) => String(x)).slice(0, 5000) : [];
  if (items.length > MAX_ITEMS) throw new HttpError(413, 'too_many', `Send at most ${MAX_ITEMS} products per request.`);
  const syncId = text(b.syncId, 64);

  const report = normalize({ format: PLUGIN_FORMAT, items: items.map(toItem), truncated: false }, shopConfig(shop), syncId ?? 'live');
  const { written } = await upsertProducts(env, shop.id, report.products, shop.status === 'active');
  // Products the shop deleted, or that no longer pass the checks (e.g. sold out).
  const gone = [...remove.map((id) => `${shop.id}-${slug(id)}`), ...report.skippedIds];
  if (gone.length) await removeProducts(env, gone);

  if (syncId) {
    // Part of a full sync: add this batch to the sync run.
    const run = await env.DB.prepare('SELECT id, found, imported, skipped, issues FROM sync_runs WHERE shop_id = ? AND ext_id = ?').bind(shop.id, syncId)
      .first<{ id: number; found: number; imported: number; skipped: number; issues: string | null }>();
    const issues = mergeIssues(run?.issues ? JSON.parse(run.issues) as Issue[] : [], report.issues);
    if (run) {
      await env.DB.prepare('UPDATE sync_runs SET found = ?, imported = ?, skipped = ?, issues = ? WHERE id = ?')
        .bind(run.found + report.found, run.imported + report.products.length, run.skipped + report.skipped, JSON.stringify(issues), run.id).run();
    } else {
      await env.DB.prepare("INSERT INTO sync_runs (shop_id, trigger, started_at, status, found, imported, skipped, removed, issues, ext_id) VALUES (?, 'plugin', ?, 'running', ?, ?, ?, 0, ?, ?)")
        .bind(shop.id, nowIso(), report.found, report.products.length, report.skipped, JSON.stringify(issues), syncId).run();
    }
  }
  await touch(env, shop);
  return json({ ok: true, accepted: report.products.length, written, skipped: report.skipped, issues: report.issues });
}

export async function pluginFinish(env: Env, req: Request) {
  const shop = await pluginShop(env, req);
  const b = await body(req, MAX_BODY);
  const syncId = text(b.syncId, 64);
  if (!syncId) throw new HttpError(400, 'missing_sync_id');
  const ids = Array.isArray(b.ids) ? b.ids.map((x) => `${shop.id}-${slug(String(x))}`).slice(0, 100_000) : [];
  const run = await env.DB.prepare('SELECT * FROM sync_runs WHERE shop_id = ? AND ext_id = ?').bind(shop.id, syncId)
    .first<{ id: number; found: number; imported: number; skipped: number; issues: string | null }>();
  if (!run) throw new HttpError(404, 'unknown_sync', 'No products were received for this sync.');

  // Everything not sent in this sync is gone from the shop (or was skipped by the checks).
  const removed = await removeProductsExcept(env, shop.id, ids);
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE shop_id = ?').bind(shop.id).first<{ n: number }>();
  const issues = run.issues ? (JSON.parse(run.issues) as Issue[]) : [];
  const soldOut = issues.find((i) => i.code === 'out_of_stock')?.count ?? 0;
  const skippedShare = run.found ? (run.skipped - soldOut) / run.found : 0;
  const status = run.imported === 0 ? 'error' : skippedShare > 0.1 ? 'warning' : 'ok';
  const message = run.imported === 0 ? `None of the ${run.found} products passed the checks (price, link, stock). See the issues list.` : null;
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare('UPDATE sync_runs SET finished_at = ?, status = ?, removed = ?, message = ? WHERE id = ?').bind(now, status, removed, message, run.id),
    env.DB.prepare('UPDATE shops SET last_sync_at = ?, last_sync_status = ?, last_sync_message = ?, last_issues = ?, product_count = ?, source_format = ?, plugin_seen_at = ?, next_sync_at = ? WHERE id = ?')
      .bind(now, status, message, JSON.stringify(issues), count?.n ?? 0, PLUGIN_FORMAT, now, addHours(intervalHours(env)), shop.id),
    env.DB.prepare('DELETE FROM sync_runs WHERE shop_id = ? AND id NOT IN (SELECT id FROM sync_runs WHERE shop_id = ? ORDER BY id DESC LIMIT 50)').bind(shop.id, shop.id),
  ]);
  return json({ ok: true, result: { status, found: run.found, imported: run.imported, skipped: run.skipped, removed, message, issues } });
}
