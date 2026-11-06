// The product catalogue in D1: saved by the sync, searched by /api/catalogue/*.
// Search uses SQLite full-text search (FTS5) over folded text plus its Latin spelling,
// so "akoustika" finds "ακουστικά". Filter counts are "disjunctive": each filter's
// counts ignore that filter's own selection, like the demo and Typesense backends.
import { hash as fnv, oneEdit, toLatin, tokens, words } from '../shared/searchtext.ts';
import { categorySuggestions } from '../shared/category-suggestions.ts';
import { matchingOffers } from '../shared/offer-comparison.ts';
import { FACETS, type CatalogueStats, type FacetKey, type FacetValue, type Product, type Refinements, type SearchResult, type SortKey } from '../src/search/types.ts';
import type { Env } from './env.ts';
import { nowIso } from './http.ts';

// ---------------------------------------------------------------- saving (sync)

const text = (v: unknown): string =>
  typeof v === 'string' ? v : v && typeof v === 'object' ? Object.values(v as Record<string, string>).join(' ') : '';
const first = (v: unknown): string | null =>
  typeof v === 'string' ? v || null : v && typeof v === 'object' ? (Object.values(v as Record<string, string>).find(Boolean) ?? null) : null;
const searchable = (s: string) => words(s.replace(/<[^>]+>/g, ' ')).join(' ');

async function sha1(s: string) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface Row {
  id: string; shop_id: string; group_id: string; match_key: string | null; shop: string; brand: string; category: string;
  color: string | null; size: string | null; discount: string | null; discount_pct: number; price: number; rank: number;
  shuffle: number; countries: string; doc: string; hash: string; listed: number;
  t_title: string; t_brand: string; t_color: string; t_category: string; t_other: string; updated_at: string;
}

async function toRow(p: Product, shopId: string, now: string, listed: boolean): Promise<Row> {
  // syncId changes on every sync; leaving it out lets unchanged products be skipped.
  const doc = JSON.stringify({ ...p, syncId: undefined, shopId });
  return {
    id: p.id, shop_id: shopId, group_id: p.groupId, match_key: p.matchKey ?? p.mpn ?? null, shop: p.shop, brand: p.brand,
    category: p.category, color: p.color || null, size: first(p.size), discount: p.discount || null, discount_pct: p.discountPct ?? 0,
    price: p.price, rank: p.rank ?? 0, shuffle: fnv(p.id), countries: `,${p.countries.join(',')},`, doc, hash: await sha1(doc), listed: listed ? 1 : 0,
    t_title: searchable(text(p.title)), t_brand: searchable(p.brand), t_color: searchable(p.color ?? ''), t_category: searchable(p.category),
    t_other: searchable(`${text(p.summary)} ${p.shop} ${text(p.size)} ${p.mpn ?? ''} ${text(p.description).slice(0, 1500)}`),
    updated_at: now,
  };
}

const COLUMNS = ['id', 'shop_id', 'group_id', 'match_key', 'shop', 'brand', 'category', 'color', 'size', 'discount', 'discount_pct', 'price', 'rank',
  'shuffle', 'countries', 'doc', 'hash', 'listed', 't_title', 't_brand', 't_color', 't_category', 't_other', 'updated_at'] as const;

// Rows travel as one JSON parameter (D1 allows 100 bound parameters, not thousands),
// so a shop of 5,000 products takes a few dozen queries instead of thousands.
const UPSERT = `INSERT INTO products (${COLUMNS.join(', ')})
  SELECT ${COLUMNS.map((c) => `json_extract(value, '$.${c}')`).join(', ')} FROM json_each(?) WHERE true
  ON CONFLICT (id) DO UPDATE SET ${COLUMNS.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ')}`;

const MAX_CHUNK_BYTES = 700_000;

/** Saves a shop's products and removes the ones that are gone. Unchanged products are not rewritten. */
export async function saveShopProducts(env: Env, shopId: string, products: Product[]) {
  const { written } = await upsertProducts(env, shopId, products, true);
  const removed = await removeProductsExcept(env, shopId, products.map((p) => p.id));
  return { written, removed };
}

/**
 * Inserts or updates products (one batch, or a whole catalogue). Products whose content and
 * visibility did not change are skipped. listed = false keeps them hidden (shop not approved yet).
 */
export async function upsertProducts(env: Env, shopId: string, products: Product[], listed: boolean) {
  const existing = new Map<string, string>();
  for (let i = 0; i < products.length; i += 2000) {
    const ids = JSON.stringify(products.slice(i, i + 2000).map((p) => p.id));
    const { results } = await env.DB.prepare('SELECT id, hash, listed FROM products WHERE shop_id = ? AND id IN (SELECT value FROM json_each(?))')
      .bind(shopId, ids).all<{ id: string; hash: string; listed: number }>();
    for (const r of results) existing.set(r.id, `${r.hash}:${r.listed}`);
  }
  const now = nowIso();

  let chunk: Row[] = [];
  let size = 0;
  let written = 0;
  const flush = async () => {
    if (!chunk.length) return;
    await env.DB.prepare(UPSERT).bind(JSON.stringify(chunk)).run();
    written += chunk.length;
    chunk = [];
    size = 0;
  };
  for (const p of products) {
    const row = await toRow(p, shopId, now, listed);
    if (existing.get(row.id) === `${row.hash}:${row.listed}`) continue;
    const bytes = row.doc.length * 2 + row.t_other.length + row.t_title.length + 500;
    if (size + bytes > MAX_CHUNK_BYTES) await flush();
    chunk.push(row);
    size += bytes;
  }
  await flush();
  return { written };
}

/** Removes a shop's products whose ids are not in keep (deleted, sold out). Returns how many. */
export async function removeProductsExcept(env: Env, shopId: string, keep: string[]) {
  const { results } = await env.DB.prepare('SELECT id FROM products WHERE shop_id = ?').bind(shopId).all<{ id: string }>();
  const keepSet = new Set(keep);
  const stale = results.map((r) => r.id).filter((id) => !keepSet.has(id));
  await removeProducts(env, stale);
  return stale.length;
}

export async function removeProducts(env: Env, ids: string[]) {
  for (let i = 0; i < ids.length; i += 2000) {
    await env.DB.prepare('DELETE FROM products WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids.slice(i, i + 2000))).run();
  }
}

/** Shows a shop's hidden products (on approval). Returns how many products the shop has online. */
export async function listShopProducts(env: Env, shopId: string) {
  await env.DB.prepare('UPDATE products SET listed = 1 WHERE shop_id = ? AND listed = 0').bind(shopId).run();
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE shop_id = ?').bind(shopId).first<{ n: number }>();
  return r?.n ?? 0;
}

/** Takes all of a shop's products off the site. */
export async function deleteShopProducts(env: Env, shopId: string) {
  const r = await env.DB.prepare('DELETE FROM products WHERE shop_id = ?').bind(shopId).run();
  return r.meta.changes ?? 0;
}

// ---------------------------------------------------------------- settings

export async function getSetting(env: Env, key: string): Promise<string | null> {
  const r = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<{ value: string }>();
  return r?.value ?? null;
}

export async function setSetting(env: Env, key: string, value: string) {
  await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind(key, value).run();
}

export type CatalogueMode = 'demo' | 'live';
export const catalogueMode = async (env: Env): Promise<CatalogueMode> => ((await getSetting(env, 'catalogue')) === 'live' ? 'live' : 'demo');

// ---------------------------------------------------------------- search

const COLUMN: Record<FacetKey, string> = { category: 'category', shop: 'shop', brand: 'brand', size: 'size', color: 'color', discount: 'discount' };
const WEIGHTS = 'bm25(products_fts, 10.0, 6.0, 5.0, 3.0, 1.0)';
const MAX_FACET_VALUES = 200;

export interface CatalogueQuery {
  query: string;
  country: string;
  refinements: Refinements;
  sort: SortKey;
  limit: number;
}

/** FTS5 expression: every word must match (as a prefix), in Greek or in its Latin spelling. */
function matchExpr(qTokens: string[], alternatives = new Map<string, string[]>()) {
  return qTokens
    .map((t) => {
      const forms = new Set([t, toLatin(t), ...(alternatives.get(t) ?? [])]);
      const terms = [...forms].map((f) => `"${f}"*`);
      return terms.length > 1 ? `(${terms.join(' OR ')})` : terms[0];
    })
    .join(' AND ');
}

/** For words that match nothing, the indexed words one typo away (same first two letters). */
async function typoAlternatives(env: Env, qTokens: string[]) {
  const alt = new Map<string, string[]>();
  for (const t of qTokens) {
    if (t.length < 4) continue;
    const from = t.slice(0, 2);
    const to = from.slice(0, -1) + String.fromCodePoint(from.codePointAt(1)! + 1);
    const { results } = await env.DB.prepare('SELECT term FROM products_terms WHERE term >= ? AND term < ? LIMIT 5000').bind(from, to).all<{ term: string }>();
    const close = results
      .map((r) => r.term)
      .filter((w) => w !== t && (oneEdit(w, t) || (t.length >= 5 && w.length > t.length && oneEdit(w.slice(0, t.length + 1), t))))
      .slice(0, 12);
    if (close.length) alt.set(t, close);
  }
  return alt;
}

export async function searchCatalogue(env: Env, q: CatalogueQuery): Promise<SearchResult> {
  const qTokens = tokens(q.query).slice(0, 8);
  let result = await runSearch(env, q, qTokens.length ? matchExpr(qTokens) : null);
  if (result.total === 0 && qTokens.length) {
    const alt = await typoAlternatives(env, qTokens);
    if (alt.size) result = await runSearch(env, q, matchExpr(qTokens, alt));
  }
  return result;
}

async function runSearch(env: Env, q: CatalogueQuery, match: string | null): Promise<SearchResult> {
  const from = match ? 'products_fts JOIN products p ON p.rid = products_fts.rowid' : 'products p';
  const where = (except?: FacetKey) => {
    const parts = ['p.listed = 1', 'p.countries LIKE ?'];
    const args: unknown[] = [`%,${q.country},%`];
    if (match) { parts.unshift('products_fts MATCH ?'); args.unshift(match); }
    for (const f of FACETS) {
      const sel = (q.refinements[f] ?? []).slice(0, 20);
      if (f === except || sel.length === 0) continue;
      parts.push(`p.${COLUMN[f]} IN (${sel.map(() => '?').join(', ')})`);
      args.push(...sel);
    }
    return { sql: parts.join(' AND '), args };
  };
  const order = (() => {
    switch (q.sort) {
      case 'price_asc': return 'p.price ASC';
      case 'price_desc': return 'p.price DESC';
      case 'discount': return 'p.discount_pct DESC, p.price ASC';
      default: return match ? `${WEIGHTS}, p.rank, p.price` : 'p.shuffle';
    }
  })();

  const all = where();
  const statements = [
    env.DB.prepare(`SELECT p.doc FROM ${from} WHERE ${all.sql} ORDER BY ${order} LIMIT ?`).bind(...all.args, Math.min(Math.max(q.limit, 1), 200)),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ${from} WHERE ${all.sql}`).bind(...all.args),
    ...FACETS.map((f) => {
      const w = where(f);
      const col = `p.${COLUMN[f]}`;
      return env.DB.prepare(`SELECT ${col} AS v, COUNT(*) AS n FROM ${from} WHERE ${w.sql} AND ${col} IS NOT NULL AND ${col} != '' GROUP BY ${col} ORDER BY n DESC LIMIT ${MAX_FACET_VALUES}`).bind(...w.args);
    }),
  ];
  const [hits, count, ...facetRows] = await env.DB.batch(statements);

  const facets = {} as Record<FacetKey, FacetValue[]>;
  FACETS.forEach((f, i) => {
    const values = (facetRows[i].results as { v: string; n: number }[]).map((r) => ({ value: r.v, count: r.n }));
    // Keep selected values visible even when their count drops to 0.
    for (const v of q.refinements[f] ?? []) if (!values.some((x) => x.value === v)) values.push({ value: v, count: 0 });
    facets[f] = values.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  });
  return {
    hits: (hits.results as { doc: string }[]).map((r) => JSON.parse(r.doc) as Product),
    total: (count.results[0] as { n: number } | undefined)?.n ?? 0,
    facets,
  };
}

export async function getProduct(env: Env, id: string): Promise<Product | null> {
  const r = await env.DB.prepare('SELECT doc FROM products WHERE id = ? AND listed = 1').bind(id).first<{ doc: string }>();
  return r ? (JSON.parse(r.doc) as Product) : null;
}

export async function getVariants(env: Env, groupId: string, country: string): Promise<Product[]> {
  const { results } = await env.DB.prepare('SELECT doc FROM products WHERE group_id = ? AND listed = 1 AND countries LIKE ? ORDER BY rank, price LIMIT 200')
    .bind(groupId, `%,${country},%`).all<{ doc: string }>();
  return results.map((r) => JSON.parse(r.doc) as Product);
}

/** The same product in every shop, cheapest total (price + delivery) first. */
export async function getOffers(env: Env, key: string, country: string, referenceId?: string, size?: string): Promise<Product[]> {
  if (!referenceId) return [];
  const reference = await getProduct(env, referenceId);
  if (!reference || !reference.countries.includes(country) || (reference.matchKey ?? reference.mpn) !== key) return [];
  const { results } = await env.DB.prepare('SELECT doc FROM products WHERE match_key = ? AND listed = 1 AND countries LIKE ? LIMIT 100')
    .bind(key, `%,${country},%`).all<{ doc: string }>();
  return matchingOffers(reference, results.map((r) => JSON.parse(r.doc) as Product), size)
    .sort((a, b) => a.price + (a.shipping ?? 0) - (b.price + (b.shipping ?? 0)));
}

export async function getStats(env: Env, country: string): Promise<CatalogueStats> {
  const market = `%,${country},%`;
  const [totals, categories] = await env.DB.batch([
    env.DB.prepare('SELECT COUNT(*) AS offers, COUNT(DISTINCT shop_id) AS shops, COUNT(DISTINCT brand) AS brands FROM products WHERE listed = 1 AND countries LIKE ?').bind(market),
    // Prefer categories across several shops, then offer volume. A large single feed cannot dominate every shortcut.
    env.DB.prepare(`SELECT category AS value, COUNT(*) AS count FROM products
      WHERE listed = 1 AND countries LIKE ? AND category IS NOT NULL AND TRIM(category) != ''
      GROUP BY category ORDER BY COUNT(DISTINCT shop_id) DESC, count DESC, category ASC LIMIT 100`).bind(market),
  ]);
  const counts = totals.results[0] as CatalogueStats | undefined;
  return { ...(counts ?? { offers: 0, shops: 0, brands: 0 }),
    categories: categorySuggestions(categories.results as FacetValue[], undefined, 20) };
}
