// Shop records, syncing a shop into the search index, and the schedule.
import { buildReport, SyncError, typesenseClient, type Issue, type ShopConfig, type SourceType } from '../sync/index.ts';
import { deleteShopProducts, saveShopProducts } from './catalogue.ts';
import { mailFor, sendMail } from './email.ts';
import { isDev, type Env } from './env.ts';
import { addHours, HttpError, nowIso } from './http.ts';

export type ShopStatus = 'pending' | 'active' | 'paused' | 'rejected';

export interface ShopRow {
  id: string; name: string; website: string; email: string; contact_name: string | null; phone: string | null;
  company: string | null; vat: string | null; countries: string; lang: string;
  source_type: SourceType; source_url: string; source_format: string | null;
  default_shipping: number | null; free_shipping_over: number | null;
  status: ShopStatus; status_reason: string | null; created_at: string; approved_at: string | null;
  last_sync_at: string | null; last_sync_status: string | null; last_sync_message: string | null; last_issues: string | null;
  product_count: number; next_sync_at: string | null; last_manual_sync_at: string | null;
  terms_version: string | null; terms_accepted_at: string | null;
  plugin_key_hash: string | null; plugin_seen_at: string | null; plugin_info: string | null;
}

export interface RunResult {
  status: 'ok' | 'warning' | 'error';
  found: number;
  imported: number;
  skipped: number;
  removed: number;
  message: string | null;
  issues: Issue[];
}

const parse = <T>(s: string | null, fallback: T): T => { try { return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; } };

/** What the API returns for a shop. */
export function shopDto(r: ShopRow) {
  return {
    id: r.id, name: r.name, website: r.website, email: r.email, contactName: r.contact_name, phone: r.phone,
    company: r.company, vat: r.vat, countries: parse<string[]>(r.countries, []), lang: r.lang,
    sourceType: r.source_type, sourceUrl: r.source_url, sourceFormat: r.source_format,
    defaultShipping: r.default_shipping, freeShippingOver: r.free_shipping_over,
    status: r.status, statusReason: r.status_reason, createdAt: r.created_at, approvedAt: r.approved_at,
    lastSyncAt: r.last_sync_at, lastSyncStatus: r.last_sync_status, lastSyncMessage: r.last_sync_message,
    lastIssues: parse<Issue[]>(r.last_issues, []), productCount: r.product_count, nextSyncAt: r.next_sync_at,
    termsVersion: r.terms_version, termsAcceptedAt: r.terms_accepted_at,
    pluginConnected: !!r.plugin_key_hash, pluginSeenAt: r.plugin_seen_at, pluginInfo: parse<Record<string, unknown> | null>(r.plugin_info, null),
  };
}

export function shopConfig(r: ShopRow): ShopConfig {
  return {
    id: r.id, name: r.name, countries: parse<string[]>(r.countries, []), sourceType: r.source_type, sourceUrl: r.source_url,
    defaultShipping: r.default_shipping, freeShippingOver: r.free_shipping_over,
  };
}

export async function getShop(env: Env, id: string): Promise<ShopRow> {
  const r = await env.DB.prepare('SELECT * FROM shops WHERE id = ?').bind(id).first<ShopRow>();
  if (!r) throw new HttpError(404, 'not_found', 'Shop not found.');
  return r;
}

export const intervalHours = (env: Env) => Math.max(1, Number(env.SYNC_INTERVAL_HOURS || 6));

/**
 * Optional: a Typesense index kept in step with D1, for when the catalogue outgrows D1 search.
 * Only used when TYPESENSE_HOST and TYPESENSE_ADMIN_KEY are set.
 */
function typesense(env: Env) {
  if (!env.TYPESENSE_HOST || !env.TYPESENSE_ADMIN_KEY || env.TYPESENSE_HOST.startsWith('xxx')) return null;
  return typesenseClient({ host: env.TYPESENSE_HOST, port: env.TYPESENSE_PORT, protocol: env.TYPESENSE_PROTOCOL, apiKey: env.TYPESENSE_ADMIN_KEY, collection: env.TYPESENSE_COLLECTION });
}

/** Link to a page of the site in the shop's market, e.g. https://tagora.online/gr/merchant */
export function siteLink(env: Env, shop: Pick<ShopRow, 'countries'>, path: string, origin?: string) {
  const base = (env.SITE_URL || origin || '').replace(/\/$/, '');
  const country = parse<string[]>(shop.countries, [])[0] || 'gr';
  return `${base}/${country}${path}`;
}

/**
 * Reads the shop's source, uploads the products that pass the checks, and removes the
 * shop's products that are gone. On failure, the products already online stay online.
 */
export async function syncShop(env: Env, shop: ShopRow, trigger: 'schedule' | 'manual' | 'approve', origin?: string): Promise<RunResult> {
  const started = nowIso();
  const syncId = crypto.randomUUID();
  const run = await env.DB.prepare("INSERT INTO sync_runs (shop_id, trigger, started_at, status) VALUES (?, ?, ?, 'running') RETURNING id")
    .bind(shop.id, trigger, started).first<{ id: number }>();
  let result: RunResult;
  let format: string | null = shop.source_format;
  try {
    const report = await buildReport(shopConfig(shop), syncId, { allowPrivate: isDev(env) });
    format = report.format;
    if (report.products.length === 0) {
      throw new SyncError('no_products', `None of the ${report.found} products passed the checks (price, link, stock). See the issues list.`);
    }
    const { removed } = await saveShopProducts(env, shop.id, report.products);
    const ts = typesense(env);
    if (ts) {
      try {
        await ts.ensureCollection();
        const { failed, errors } = await ts.upsert(report.products);
        if (failed) console.error(`typesense rejected ${failed} products of ${shop.id}: ${errors[0] ?? ''}`);
        await ts.deleteStale(shop.id, syncId);
      } catch (e) {
        console.error('typesense mirror failed', shop.id, e);
      }
    }
    const imported = report.products.length;
    // Sold-out items are left out on purpose; only other skips count as a problem.
    const soldOut = report.issues.find((i) => i.code === 'out_of_stock')?.count ?? 0;
    const skippedShare = report.found ? (report.skipped - soldOut) / report.found : 0;
    result = {
      status: skippedShare > 0.1 ? 'warning' : 'ok',
      found: report.found, imported, skipped: report.skipped, removed,
      message: null,
      issues: report.issues,
    };
  } catch (e) {
    const message = e instanceof SyncError ? e.message : `Unexpected error: ${e instanceof Error ? e.message : String(e)}`;
    if (!(e instanceof SyncError)) console.error('sync failed', shop.id, e);
    result = { status: 'error', found: 0, imported: 0, skipped: 0, removed: 0, message, issues: [] };
  }

  const finished = nowIso();
  const ok = result.status !== 'error';
  await env.DB.batch([
    env.DB.prepare('UPDATE sync_runs SET finished_at = ?, status = ?, found = ?, imported = ?, skipped = ?, removed = ?, message = ?, issues = ? WHERE id = ?')
      .bind(finished, result.status, result.found, result.imported, result.skipped, result.removed, result.message, JSON.stringify(result.issues), run!.id),
    ok
      ? env.DB.prepare('UPDATE shops SET last_sync_at = ?, last_sync_status = ?, last_sync_message = ?, last_issues = ?, product_count = ?, source_format = ?, next_sync_at = ? WHERE id = ?')
          .bind(finished, result.status, result.message, JSON.stringify(result.issues), result.imported, format, addHours(intervalHours(env)), shop.id)
      : env.DB.prepare('UPDATE shops SET last_sync_at = ?, last_sync_status = ?, last_sync_message = ?, next_sync_at = ? WHERE id = ?')
          .bind(finished, 'error', result.message, addHours(1), shop.id),
    // keep the last 50 runs per shop
    env.DB.prepare('DELETE FROM sync_runs WHERE shop_id = ? AND id NOT IN (SELECT id FROM sync_runs WHERE shop_id = ? ORDER BY id DESC LIMIT 50)').bind(shop.id, shop.id),
  ]);

  // Tell the shop when syncing starts failing (once, not on every retry).
  if (!ok && shop.last_sync_status !== 'error' && trigger === 'schedule') {
    await sendMail(env, mailFor('syncFailed', shop.lang as 'el' | 'en', shop.email, { shop: shop.name, message: result.message ?? '' }, siteLink(env, shop, '/merchant', origin)));
  }
  return result;
}

/** Runs from the cron trigger: syncs the shops that are due, a few at a time. */
export async function syncDueShops(env: Env) {
  const batch = Math.max(1, Number(env.SYNC_BATCH || 3));
  const { results } = await env.DB.prepare("SELECT * FROM shops WHERE status = 'active' AND source_type != 'plugin' AND (next_sync_at IS NULL OR next_sync_at <= ?) ORDER BY next_sync_at LIMIT ?")
    .bind(nowIso(), batch).all<ShopRow>();
  for (const shop of results) {
    const r = await syncShop(env, shop, 'schedule');
    console.log(`sync ${shop.id}: ${r.status} imported=${r.imported} removed=${r.removed}${r.message ? ` (${r.message})` : ''}`);
  }
}

/** Takes a shop's products off the site (pause / reject). */
export async function unlistShop(env: Env, shopId: string) {
  await deleteShopProducts(env, shopId);
  try {
    await typesense(env)?.deleteShop(shopId);
  } catch (e) {
    console.error('typesense unlist failed', shopId, e);
  }
  await env.DB.prepare('UPDATE shops SET product_count = 0 WHERE id = ?').bind(shopId).run();
}
