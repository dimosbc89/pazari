// Offline integration validation against an ephemeral, real workerd D1 database.
// Usage: node scripts/validate-catalogue.ts [snapshot directory] [report directory]
// This never connects to Cloudflare, writes a remote database, or sends email.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { buildReport, type ShopConfig, type SyncReport } from '../sync/index.ts';
import { getProduct, getStats, listShopProducts, removeProductsExcept, saveShopProducts, searchCatalogue, upsertProducts } from '../worker/catalogue.ts';
import type { Env } from '../worker/env.ts';
import type { Product } from '../src/search/types.ts';
import type { D1Database as CloudflareD1Database, D1PreparedStatement, Fetcher as CloudflareFetcher } from '@cloudflare/workers-types';

declare global {
  interface D1Database extends CloudflareD1Database {}
  interface Fetcher extends CloudflareFetcher {}
}

const repo = fileURLToPath(new URL('..', import.meta.url));
const feedDir = path.resolve(process.argv[2] || path.join(repo, '../feeds'));
const outDir = path.resolve(process.argv[3] || path.join(repo, '..'));
const names: Record<string, string> = {
  'des-to-tsantaki-mou': 'Des to Tsantaki Mou',
  leatherbrands: 'LeatherBrands',
  'amazon-beauty': 'Amazon Beauty',
  melimpampa: 'Melimpampa',
  ellinoekdotiki: 'Ελληνοεκδοτική',
};
type Metadata = { slug: string; url: string; final_url: string; content_type: string; sha256: string; bytes: number; status: number };
const metadata: Metadata[] = JSON.parse(await fs.readFile(path.join(feedDir, 'fetch-metadata.json'), 'utf8'));
assert.deepEqual(new Set(metadata.map((m) => m.slug)), new Set(Object.keys(names)));
const snapshots = new Map<string, { bytes: Uint8Array; contentType: string }>();
const configs: ShopConfig[] = [];
for (const m of metadata) {
  const bytes = await fs.readFile(path.join(feedDir, `${m.slug}.xml`));
  assert.equal(m.status, 200);
  assert.equal(bytes.length, m.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), m.sha256, `Snapshot changed: ${m.slug}`);
  snapshots.set(m.url, { bytes, contentType: m.content_type });
  configs.push({ id: m.slug, name: names[m.slug], countries: ['gr'], sourceType: 'feed', sourceUrl: m.url, defaultShipping: null, freeShippingOver: null });
}

const realFetch = globalThis.fetch;
let interceptedFetches = 0;
// All source fetches read snapshots through the production fetch/decode/parse path.
globalThis.fetch = (async (input: string | URL | Request) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const snapshot = snapshots.get(url);
  assert.ok(snapshot, `Unexpected network request prohibited by offline validation: ${url}`);
  interceptedFetches++;
  return new Response(new Uint8Array(snapshot.bytes).buffer, { status: 200, headers: { 'content-type': snapshot.contentType } });
}) as typeof fetch;

const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true,
  script: 'export default { fetch() { return new Response("Offline validation only"); } }',
  d1Databases: ['DB', 'REPLAY_DB'],
  compatibilityDate: '2026-11-01',
}));

type CapturedStatement = { sql: string; params: unknown[] };
const importStatements: CapturedStatement[] = [];
let capture = false;
// Record exact prepared writes produced by the production catalogue function.
function recordingDb(db: Env['DB']): Env['DB'] {
  const statement = (target: D1PreparedStatement, sql: string, params: unknown[] = []): D1PreparedStatement => new Proxy(target, {
    get(t, property) {
      if (property === 'bind') return (...values: unknown[]) => statement(t.bind(...values), sql, values);
      if (property === 'run') return async () => {
        if (capture) importStatements.push({ sql, params });
        return t.run();
      };
      const value = Reflect.get(t, property, t);
      return typeof value === 'function' ? value.bind(t) : value;
    },
  });
  return new Proxy(db, {
    get(target, property) {
      if (property === 'prepare') return (sql: string) => statement(target.prepare(sql), sql);
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

try {
  const db = await mf.getD1Database('DB') as unknown as Env['DB'];
  const env = { DB: recordingDb(db) } as Env;
  const migrate = async (target: Env['DB']) => {
    for (const name of (await fs.readdir(path.join(repo, 'migrations'))).filter((n) => n.endsWith('.sql')).sort()) {
      const sql = await fs.readFile(path.join(repo, 'migrations', name), 'utf8');
      for (const statement of unstable_splitSqlQuery(sql)) await target.prepare(statement).run();
    }
  };
  await migrate(db);

  const protectedIds = ['tandem-concept', 'danaos-stores'];
  const allShops = [
    ...protectedIds.map((id, i): ShopConfig => ({ id, name: ['Tandem Concept', 'Danaos Stores'][i], countries: ['gr'], sourceType: 'feed', sourceUrl: `https://${id}.invalid/feed` })),
    ...configs,
  ];
  for (const shop of allShops) {
    await db.prepare('INSERT INTO shops (id, name, website, email, countries, source_type, source_url, status, created_at, product_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(shop.id, shop.name, new URL(shop.sourceUrl).origin, `${shop.id}@validation.invalid`, JSON.stringify(shop.countries), shop.sourceType, shop.sourceUrl, protectedIds.includes(shop.id) ? 'active' : 'pending', '2026-01-01T00:00:00.000Z', protectedIds.includes(shop.id) ? 1 : 0).run();
  }
  for (const id of protectedIds) {
    const shop = allShops.find((s) => s.id === id)!;
    const sentinel: Product = { id: `${id}-sentinel`, groupId: `${id}-sentinel`, title: `Protected ${shop.name}`, brand: 'Sentinel brand', url: `https://${id}.invalid/sentinel`, image: '', price: 91.23, shop: shop.name, shopId: id, category: 'Sentinel category', countries: ['gr'], rank: 0 };
    await upsertProducts(env, id, [sentinel], true);
    await db.prepare("INSERT INTO sync_runs (shop_id, trigger, started_at, finished_at, status, found, imported) VALUES (?, 'schedule', '2026-01-01', '2026-01-01', 'ok', 1, 1)").bind(id).run();
  }
  const protectedSnapshot = async () => {
    const ids = JSON.stringify(protectedIds);
    const result: Record<string, unknown> = {};
    for (const [table, column] of [['shops', 'id'], ['products', 'shop_id'], ['sync_runs', 'shop_id']]) {
      result[table] = (await db.prepare(`SELECT * FROM ${table} WHERE ${column} IN (SELECT value FROM json_each(?)) ORDER BY ${column}, rowid`).bind(ids).all()).results;
    }
    return JSON.stringify(result);
  };
  const protectedBefore = await protectedSnapshot();
  const baselineStats = await getStats(env, 'gr');
  assert.equal(baselineStats.offers, 2);
  const reports = new Map<string, SyncReport>();
  const results: Record<string, unknown>[] = [];

  for (const shop of configs) {
    const report = await buildReport(shop, 'offline-first-sync');
    assert.ok(report.products.length > 0, `${shop.id} must import products`);
    assert.equal(report.found, report.products.length + report.skipped);
    assert.equal(new Set(report.products.map((p) => p.id)).size, report.products.length);
    for (const p of report.products) {
      assert.ok(p.id.startsWith(`${shop.id}-`) && p.id.length > shop.id.length + 1);
      assert.equal(p.shopId, shop.id);
      assert.equal(p.shop, shop.name);
      assert.ok(p.title && p.brand && p.category && p.groupId);
      assert.ok(Number.isFinite(p.price) && p.price > 0);
      assert.ok(['https:', 'http:'].includes(new URL(p.url).protocol));
      assert.deepEqual(p.countries, ['gr']);
      if (p.oldPrice !== undefined) assert.ok(p.oldPrice > p.price);
      if (p.shipping !== undefined) assert.ok(Number.isFinite(p.shipping) && p.shipping >= 0);
    }
    if (shop.id === 'ellinoekdotiki') {
      const expected: { id: string; list_price: string; discount: string; retail_price: string }[] = JSON.parse(await fs.readFile(path.join(feedDir, 'ellino-retail-prices.json'), 'utf8'));
      const expectedById = new Map(expected.map((p) => [`ellinoekdotiki-${p.id}`, p]));
      for (const product of report.products) {
        const price = expectedById.get(product.id);
        assert.ok(price, `Missing independent expected price: ${product.id}`);
        assert.equal(product.price, Number(price.retail_price), `Retail price mismatch: ${product.id}`);
        assert.equal(product.oldPrice, Number(price.discount) > 0 ? Number(price.list_price) : undefined, `Original price mismatch: ${product.id}`);
      }
    }
    const statementStart = importStatements.length;
    capture = true;
    const first = await upsertProducts(env, shop.id, report.products, false);
    capture = false;
    assert.equal(first.written, report.products.length);
    assert.equal(await removeProductsExcept(env, shop.id, report.products.map((p) => p.id)), 0);
    const stored = await db.prepare('SELECT id, doc, listed FROM products WHERE shop_id = ?').bind(shop.id).all<{ id: string; doc: string; listed: number }>();
    assert.equal(stored.results.length, report.products.length);
    const expectedById = new Map(report.products.map((p) => [p.id, JSON.parse(JSON.stringify({ ...p, syncId: undefined }))]));
    for (const row of stored.results) {
      assert.equal(row.listed, 0);
      assert.deepEqual(JSON.parse(row.doc), expectedById.get(row.id), `Stored document differs: ${row.id}`);
    }
    assert.equal(await getProduct(env, report.products[0].id), null);
    assert.deepEqual(await getStats(env, 'gr'), baselineStats);
    const hiddenSearch = await searchCatalogue(env, { query: '', country: 'gr', refinements: { shop: [shop.name] }, sort: 'relevance', limit: 200 });
    assert.equal(hiddenSearch.total, 0);
    reports.set(shop.id, report);
    results.push({ shopId: shop.id, shopName: shop.name, format: report.format, found: report.found, imported: report.products.length, skipped: report.skipped, issues: report.issues, firstWritten: first.written, hiddenBeforeActivation: true, capturedStatements: importStatements.length - statementStart });
  }
  const total = [...reports.values()].reduce((sum, r) => sum + r.products.length, 0);
  assert.equal(await protectedSnapshot(), protectedBefore, 'Protected shops changed during staging');

  for (const [index, shop] of configs.entries()) {
    const report = reports.get(shop.id)!;
    assert.equal(await listShopProducts(env, shop.id), report.products.length);
    await db.prepare("UPDATE shops SET status = 'active', product_count = ? WHERE id = ? AND status = 'pending'").bind(report.products.length, shop.id).run();
    const browse = await searchCatalogue(env, { query: '', country: 'gr', refinements: { shop: [shop.name] }, sort: 'price_asc', limit: 200 });
    assert.equal(browse.total, report.products.length);
    assert.ok(browse.hits.length > 0 && browse.hits.every((p) => p.shopId === shop.id));
    const sample = report.products[0];
    const search = await searchCatalogue(env, { query: String(sample.title), country: 'gr', refinements: { shop: [shop.name] }, sort: 'relevance', limit: 200 });
    assert.ok(search.total > 0, `FTS lookup failed: ${shop.id}`);
    assert.ok(search.hits.some((p) => p.id === sample.id), `FTS lookup did not return sample: ${shop.id}`);
    const product = await getProduct(env, sample.id);
    assert.equal(product?.id, sample.id);
    assert.equal(product?.price, sample.price);

    const repeat = await buildReport(shop, 'offline-second-sync');
    const second = await saveShopProducts(env, shop.id, repeat.products);
    assert.deepEqual(second, { written: 0, removed: 0 }, `Second sync must be idempotent: ${shop.id}`);
    Object.assign(results[index], { secondWritten: second.written, secondRemoved: second.removed, publicBrowseCount: browse.total, publicSearchPassed: true, productLookupPassed: true });
  }

  assert.equal(await protectedSnapshot(), protectedBefore, 'Protected shops changed during activation/repeat');
  const stats = await getStats(env, 'gr');
  assert.equal(stats.offers, total + 2);
  assert.equal(stats.shops, 7);
  // D1 disallows PRAGMA integrity_check, so verify document/index invariants directly.
  const ftsCount = await db.prepare('SELECT COUNT(*) AS n FROM products_fts').first<{ n: number }>();
  assert.equal(ftsCount?.n, total + 2);
  await db.prepare("INSERT INTO products_fts (products_fts, rank) VALUES ('integrity-check', 1)").run();
  let capturedRows = 0;
  for (const statement of importStatements) {
    assert.ok(statement.sql.startsWith('INSERT INTO products'));
    assert.equal(statement.params.length, 1);
    for (const row of JSON.parse(String(statement.params[0]))) {
      assert.ok(Object.hasOwn(names, row.shop_id), 'Import plan must never write a protected shop');
      assert.equal(row.listed, 0, 'Import plan must stage hidden products');
      capturedRows++;
    }
  }
  assert.equal(capturedRows, total);
  const validation = {
    success: true,
    generatedAt: new Date().toISOString(),
    database: 'ephemeral local Miniflare D1; all repository migrations applied',
    source: 'verified feed snapshots through production buildReport, fetch/decode, parser and normalizer',
    protectedShopsUnchanged: true,
    protectedRowsCompared: ['shops', 'products', 'sync_runs'],
    protectedSnapshotSha256: createHash('sha256').update(protectedBefore).digest('hex'),
    documentChecks: 'Every stored document equals its validated normalized product',
    ftsIntegrity: 'ok',
    realEmailsUsed: false,
    emailSent: false,
    remoteWrites: false,
    interceptedFeedFetches: interceptedFetches,
    totalImported: total,
    importStatements: importStatements.length,
    independentEllinoPricesChecked: reports.get('ellinoekdotiki')!.products.length,
    shops: results,
    snapshots: metadata.map(({ slug, sha256, bytes }) => ({ slug, sha256, bytes })),
  };
  const productHashes = (await db.prepare('SELECT id, shop_id, hash FROM products WHERE shop_id IN (SELECT value FROM json_each(?)) ORDER BY shop_id, id').bind(JSON.stringify(Object.keys(names))).all()).results;
  // --file execution has a SQL length limit, independent of the bound-parameter limit.
  // Rebatch the exact production rows into small SQL statements; data values stay escaped literals.
  const sqlStatements: string[] = [];
  for (const statement of importStatements) {
    let rows: unknown[] = [];
    const asSql = (values: unknown[]) => statement.sql.replace('?', `'${JSON.stringify(values).replaceAll("'", "''")}'`) + ';';
    for (const row of JSON.parse(String(statement.params[0]))) {
      if (rows.length && Buffer.byteLength(asSql([...rows, row])) > 40_000) {
        sqlStatements.push(asSql(rows));
        rows = [];
      }
      rows.push(row);
      assert.ok(Buffer.byteLength(asSql(rows)) < 90_000, 'An individual product exceeds D1 SQL length limit');
    }
    if (rows.length) sqlStatements.push(asSql(rows));
  }
  const replay = await mf.getD1Database('REPLAY_DB') as unknown as Env['DB'];
  await migrate(replay);
  for (const sql of sqlStatements) await replay.prepare(sql).run();
  assert.deepEqual((await replay.prepare('SELECT id, shop_id, hash FROM products ORDER BY shop_id, id').all()).results, productHashes, 'SQL export replay does not match production-function result');
  const replayCounts = await replay.prepare('SELECT COUNT(*) AS n, SUM(listed) AS listed FROM products').first<{ n: number; listed: number }>();
  assert.equal(replayCounts?.n, total);
  assert.equal(replayCounts?.listed, 0);
  await replay.prepare("INSERT INTO products_fts (products_fts, rank) VALUES ('integrity-check', 1)").run();
  const sqlInfo = { exportedSqlStatements: sqlStatements.length, exportedSqlMaxBytes: Math.max(...sqlStatements.map((s) => Buffer.byteLength(s))), exportedSqlReplayedAndHashesVerified: true };
  Object.assign(validation, sqlInfo);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'validation-report.json'), `${JSON.stringify(validation, null, 2)}\n`);
  await fs.writeFile(path.join(outDir, 'import-plan.json'), JSON.stringify({ generatedAt: validation.generatedAt, validatedLocally: true, listed: false, totalRows: capturedRows, shops: Object.keys(names), statements: importStatements }));
  await fs.writeFile(path.join(outDir, 'validation-product-hashes.json'), `${JSON.stringify(productHashes)}\n`);
  await fs.writeFile(path.join(outDir, 'import-staged-products.sql'), `${sqlStatements.join('\n')}\n`);
  console.log(`Prepared hidden-product SQL: ${sqlStatements.length} statements; maximum ${Math.max(...sqlStatements.map((s) => Buffer.byteLength(s)))} bytes.`);
  console.log(JSON.stringify(validation, null, 2));
} finally {
  capture = false;
  globalThis.fetch = realFetch;
  await mf.dispose();
}
