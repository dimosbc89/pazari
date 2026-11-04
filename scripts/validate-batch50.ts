// Offline, sequential integration validation. Never contacts Cloudflare or sends mail.
// node --max-old-space-size=12288 scripts/validate-batch50.ts --metadata ../batch50/feeds/metadata.json --approved ../batch50/approved-slugs.json --out ../batch50/validated [--resume]
// An explicit approved-slug JSON array is required. Approval here selects local tests only.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';
import { buildReport, type ShopConfig, type SyncReport } from '../sync/index.ts';
import { getProduct, getStats, listShopProducts, saveShopProducts, searchCatalogue, upsertProducts } from '../worker/catalogue.ts';
import type { Env } from '../worker/env.ts';
import type { Product } from '../src/search/types.ts';
import type { D1Database as CloudflareD1Database, D1PreparedStatement, Fetcher as CloudflareFetcher } from '@cloudflare/workers-types';

declare global {
  interface D1Database extends CloudflareD1Database {}
  interface Fetcher extends CloudflareFetcher {}
}

type FeedMetadata = {
  slug: string; shopName: string; url: string; filename: string; contentType: string; bytes: number; sha256: string;
  countries?: string[]; defaultShipping?: number | null; freeShippingOver?: number | null;
};
type ShopReport = {
  slug: string; shopName: string; sourceUrl: string; snapshotSha256: string; snapshotBytes: number; implementationSha256: string; configurationSha256: string;
  success: boolean; localOnly: true; startedAt: string; finishedAt?: string; seconds?: number;
  found?: number; imported?: number; skipped?: number; format?: string; issues?: SyncReport['issues'];
  nonStockSkipShare?: number; productionSyncStatus?: 'ok' | 'warning';
  firstWritten?: number; secondWritten?: number; secondRemoved?: number; hiddenBeforeActivation?: boolean;
  publicBrowseCount?: number; publicSearchPassed?: boolean; productLookupPassed?: boolean;
  storedDocumentsCompared?: number; ftsIntegrity?: string; protectedShopsUnchanged?: boolean;
  normalizedProductsFile?: string; hashesFile?: string; sqlFile?: string; preparedStatementsFile?: string;
  sqlStatements?: number; preparedStatements?: number; sqlMaxBytes?: number; samples?: Product[];
  preparedParameterMaxBytes?: number; sqlReplayPassed?: boolean; sqlReplayProducts?: number;
  error?: string; errorCode?: string; resumed?: boolean;
};
const argv = process.argv.slice(2);
const opt = (name: string) => { const i = argv.indexOf(`--${name}`); return i < 0 ? undefined : argv[i + 1]; };
for (const required of ['metadata', 'approved', 'out']) assert.ok(opt(required), `Required: --${required}`);
const repo = fileURLToPath(new URL('..', import.meta.url));
const metadataPath = path.resolve(opt('metadata')!);
const outDir = path.resolve(opt('out')!);
const rawMetadata: FeedMetadata[] | { feeds: FeedMetadata[] } = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
const metadata = Array.isArray(rawMetadata) ? rawMetadata : rawMetadata.feeds;
assert.ok(Array.isArray(metadata), 'Metadata must be an array or {feeds:[]}');
const approved: string[] = JSON.parse(await fs.readFile(path.resolve(opt('approved')!), 'utf8'));
assert.ok(Array.isArray(approved) && approved.length > 0 && approved.every((s) => typeof s === 'string'), 'Approved must be a nonempty JSON array of slugs');
assert.equal(new Set(approved).size, approved.length, 'Approved contains duplicate slugs');
const protectedShops = [
  ['tandem-concept', 'Tandem Concept'], ['danaos-stores', 'Danaos Stores'],
  ['des-to-tsantaki-mou', 'Des to Tsantaki Mou'], ['leatherbrands', 'LeatherBrands'],
  ['amazon-beauty', 'Amazon Beauty'], ['ellinoekdotiki', 'Ελληνοεκδοτική'],
];
for (const slug of approved) {
  assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Unsafe slug');
  assert.ok(!protectedShops.some(([id]) => id === slug), `Protected existing shop cannot be included: ${slug}`);
  assert.equal(metadata.filter((m) => m.slug === slug).length, 1, `Metadata must contain exactly one entry for ${slug}`);
}
await fs.mkdir(outDir, { recursive: true });

const migrations: string[] = [];
const implementationHash = createHash('sha256');
const files = [
  ...((await fs.readdir(path.join(repo, 'sync'))).filter((f) => f.endsWith('.ts')).map((f) => `sync/${f}`)),
  'worker/catalogue.ts', 'shared/searchtext.ts', 'package-lock.json', 'scripts/validate-batch50.ts',
];
for (const filename of files.sort()) implementationHash.update(filename).update(await fs.readFile(path.join(repo, filename)));
for (const filename of (await fs.readdir(path.join(repo, 'migrations'))).filter((f) => f.endsWith('.sql')).sort()) {
  const sql = await fs.readFile(path.join(repo, 'migrations', filename), 'utf8');
  implementationHash.update(filename).update(sql);
  migrations.push(...unstable_splitSqlQuery(sql));
}
const implementationSha256 = implementationHash.digest('hex');
const docOf = (p: Product) => JSON.stringify({ ...p, syncId: undefined });
const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex');
const realFetch = globalThis.fetch;

// Delegate every query to real D1. Capture only successful INSERTs generated by upsertProducts.
function recordWrites(db: Env['DB'], record: (sql: string, params: unknown[]) => Promise<void>, enabled: () => boolean): Env['DB'] {
  const wrap = (target: D1PreparedStatement, sql: string, params: unknown[] = []): D1PreparedStatement => new Proxy(target, {
    get(t, key) {
      if (key === 'bind') return (...values: unknown[]) => wrap(t.bind(...values), sql, values);
      if (key === 'run') return async () => { const result = await t.run(); if (enabled()) await record(sql, params); return result; };
      const value = Reflect.get(t, key, t);
      return typeof value === 'function' ? value.bind(t) : value;
    },
  });
  return new Proxy(db, {
    get(t, key) {
      if (key === 'prepare') return (sql: string) => wrap(t.prepare(sql), sql);
      const value = Reflect.get(t, key, t);
      return typeof value === 'function' ? value.bind(t) : value;
    },
  });
}

async function validate(m: FeedMetadata): Promise<ShopReport> {
  const started = Date.now();
  const configurationSha256 = createHash('sha256').update(JSON.stringify({ countries: m.countries || ['gr'], defaultShipping: m.defaultShipping ?? null, freeShippingOver: m.freeShippingOver ?? null })).digest('hex');
  const summary: ShopReport = {
    slug: m.slug, shopName: m.shopName, sourceUrl: m.url, snapshotSha256: m.sha256, snapshotBytes: m.bytes,
    implementationSha256, configurationSha256, success: false, localOnly: true, startedAt: new Date().toISOString(),
  };
  const shopDir = path.join(outDir, m.slug);
  if (argv.includes('--resume')) {
    try {
      const previous: ShopReport = JSON.parse(await fs.readFile(path.join(shopDir, 'report.json'), 'utf8'));
      if (previous.success && previous.snapshotSha256 === m.sha256 && previous.implementationSha256 === implementationSha256 && previous.configurationSha256 === configurationSha256 && previous.shopName === m.shopName && previous.sourceUrl === m.url) {
        for (const filename of ['products.json', 'hashes.jsonl', 'hidden-products.sql', 'statements.jsonl']) await fs.access(path.join(shopDir, filename));
        return { ...previous, resumed: true };
      }
    } catch { /* No complete matching result: perform the validation. */ }
  }
  const temporary = path.join(outDir, `.${m.slug}.validation-${process.pid}`);
  await fs.mkdir(temporary, { recursive: true });
  let mf: Miniflare | undefined;
  const handles: Awaited<ReturnType<typeof fs.open>>[] = [];
  try {
    assert.ok(m.shopName && m.url && m.filename && m.contentType, 'Incomplete metadata');
    const filename = path.resolve(path.dirname(metadataPath), m.filename);
    const bytes = await fs.readFile(filename);
    assert.equal(bytes.length, m.bytes, 'Snapshot byte count mismatch');
    assert.equal(sha256(bytes), m.sha256, 'Snapshot SHA-256 mismatch');
    const shop: ShopConfig = {
      id: m.slug, name: m.shopName, sourceType: 'feed', sourceUrl: m.url, countries: m.countries || ['gr'],
      defaultShipping: m.defaultShipping ?? null, freeShippingOver: m.freeShippingOver ?? null,
    };
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      assert.equal(url, m.url, 'Unexpected external request blocked by offline validator');
      return new Response(new Uint8Array(bytes).buffer, { status: 200, headers: { 'content-type': m.contentType, 'content-length': String(bytes.length) } });
    }) as typeof fetch;
    console.log(`[${m.slug}] parsing ${(m.bytes / 1048576).toFixed(1)} MiB snapshot through buildReport`);
    let report = await buildReport(shop, 'offline-batch50-first');
    Object.assign(summary, { found: report.found, imported: report.products.length, skipped: report.skipped, format: report.format, issues: report.issues });
    const nonStockSkipShare = report.found ? (report.skipped - (report.issues.find((i) => i.code === 'out_of_stock')?.count || 0)) / report.found : 0;
    Object.assign(summary, { nonStockSkipShare, productionSyncStatus: nonStockSkipShare > 0.1 ? 'warning' : 'ok' });
    assert.ok(report.products.length > 0, 'No products passed normalization');
    assert.equal(report.products.length + report.skipped, report.found);
    assert.equal(new Set(report.products.map((p) => p.id)).size, report.products.length, 'Duplicate normalized product IDs');
    const expectedCount = report.products.length;
    summary.samples = [...new Set(Array.from({ length: Math.min(10, expectedCount) }, (_, i) => Math.floor(i * (expectedCount - 1) / Math.max(1, Math.min(10, expectedCount) - 1))))].map((i) => JSON.parse(docOf(report.products[i])) as Product);
    mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("Offline only"); } }', d1Databases: ['DB', 'REPLAY_DB'], compatibilityDate: '2026-11-01' }));
    const db = await mf.getD1Database('DB') as unknown as Env['DB'];
    for (const sql of migrations) await db.prepare(sql).run();
    const sqlFile = await fs.open(path.join(temporary, 'hidden-products.sql'), 'w'); handles.push(sqlFile);
    const statementFile = await fs.open(path.join(temporary, 'statements.jsonl'), 'w'); handles.push(statementFile);
    const hashFile = await fs.open(path.join(temporary, 'hashes.jsonl'), 'w'); handles.push(hashFile);
    const productsFile = await fs.open(path.join(temporary, 'products.json'), 'w'); handles.push(productsFile);
    await productsFile.write('[\n');
    let capture = false, capturedRows = 0, sqlCount = 0, preparedCount = 0, maxSqlBytes = 0, maxPreparedParameterBytes = 0;
    const env = { DB: recordWrites(db, async (sql, params) => {
      assert.ok(sql.startsWith('INSERT INTO products'));
      assert.equal(params.length, 1);
      const parameterBytes = Buffer.byteLength(String(params[0]), 'utf8');
      assert.ok(parameterBytes < 2_000_000, `Prepared JSON parameter is ${parameterBytes} bytes; must be below 2,000,000`);
      maxPreparedParameterBytes = Math.max(maxPreparedParameterBytes, parameterBytes);
      preparedCount++;
      await statementFile.write(`${JSON.stringify({ sql, params })}\n`);
      const asSql = (rows: unknown[]) => sql.replace('?', `'${JSON.stringify(rows).replaceAll("'", "''")}'`) + ';\n';
      const flush = async (rows: unknown[]) => {
        const statement = asSql(rows), size = Buffer.byteLength(statement);
        assert.ok(size < 90_000, 'An individual product exceeds the D1 SQL statement limit');
        maxSqlBytes = Math.max(maxSqlBytes, size); sqlCount++;
        await sqlFile.write(statement);
      };
      let rows: unknown[] = [];
      for (const row of JSON.parse(String(params[0]))) {
        assert.equal(row.shop_id, m.slug, 'Export attempted to write another shop');
        assert.equal(row.listed, 0, 'Exported rows must be hidden');
        capturedRows++;
        if (rows.length && Buffer.byteLength(asSql([...rows, row])) > 40_000) { await flush(rows); rows = []; }
        rows.push(row);
      }
      if (rows.length) await flush(rows);
    }, () => capture) } as Env;
    for (const [id, name] of protectedShops) {
      await db.prepare("INSERT INTO shops (id,name,website,email,countries,source_type,source_url,status,created_at,product_count) VALUES (?,?,?,?,?,'feed',?,'active','2026-01-01',1)")
        .bind(id, name, `https://${id}.invalid`, `${id}@validation.invalid`, '["gr"]', `https://${id}.invalid/feed`).run();
      await upsertProducts(env, id, [{ id: `${id}-validation-sentinel`, groupId: `${id}-validation-sentinel`, shopId: id, shop: name, title: `Protected ${name}`, brand: 'Validation', category: 'Validation', price: 91.23, image: '', url: `https://${id}.invalid/product`, countries: ['gr'] }], true);
      await db.prepare("INSERT INTO sync_runs (shop_id,trigger,started_at,status,found,imported) VALUES (?,'schedule','2026-01-01','ok',1,1)").bind(id).run();
    }
    const protectedSnapshot = async () => {
      const results: unknown[] = [];
      for (const [table, column] of [['shops', 'id'], ['products', 'shop_id'], ['sync_runs', 'shop_id']]) {
        results.push((await db.prepare(`SELECT * FROM ${table} WHERE ${column} IN (SELECT value FROM json_each(?)) ORDER BY ${column},rowid`).bind(JSON.stringify(protectedShops.map(([id]) => id))).all()).results);
      }
      return JSON.stringify(results);
    };
    const protectedBefore = await protectedSnapshot();
    let written = 0, documentsCompared = 0;
    // Bounded DB reads/writes and file writes; only one shop's normalized result stays in memory.
    for (let start = 0; start < report.products.length; start += 500) {
      const products = report.products.slice(start, start + 500);
      const expected = new Map<string, string>();
      for (const p of products) {
        assert.ok(p.id.startsWith(`${m.slug}-`) && p.id.length > m.slug.length + 1);
        assert.equal(p.shopId, m.slug); assert.equal(p.shop, m.shopName);
        assert.ok(p.title && p.brand && p.groupId && p.category);
        assert.ok(Number.isFinite(p.price) && p.price > 0, `Invalid normalized price: ${p.id}`);
        assert.ok(['http:', 'https:'].includes(new URL(p.url).protocol));
        if (p.oldPrice !== undefined) assert.ok(p.oldPrice > p.price, `Invalid old price: ${p.id}`);
        if (p.shipping !== undefined) assert.ok(Number.isFinite(p.shipping) && p.shipping >= 0);
        assert.deepEqual(p.countries, shop.countries);
        expected.set(p.id, docOf(p));
      }
      capture = true;
      written += (await upsertProducts(env, m.slug, products, false)).written;
      capture = false;
      const rows = (await db.prepare('SELECT id,shop_id,hash,price,doc,listed FROM products WHERE shop_id = ? AND id IN (SELECT value FROM json_each(?)) ORDER BY id').bind(m.slug, JSON.stringify(products.map((p) => p.id))).all<{ id: string; shop_id: string; hash: string; price: number; doc: string; listed: number }>()).results;
      assert.equal(rows.length, products.length);
      for (const row of rows) {
        assert.equal(row.listed, 0);
        assert.equal(row.doc, expected.get(row.id), `Stored document mismatch: ${row.id}`);
        documentsCompared++;
        await hashFile.write(`${JSON.stringify({ id: row.id, shop_id: row.shop_id, hash: row.hash, price: row.price })}\n`);
      }
      await productsFile.write(`${start ? ',\n' : ''}${products.map(docOf).join(',\n')}`);
      if (start % 5000 === 0 || start + 500 >= expectedCount) console.log(`[${m.slug}] staged/checked ${Math.min(start + 500, expectedCount)}/${expectedCount}`);
    }
    await productsFile.write('\n]\n');
    assert.equal(written, expectedCount); assert.equal(capturedRows, expectedCount);
    assert.equal(await getProduct(env, report.products[0].id), null);
    assert.equal((await searchCatalogue(env, { query: '', country: shop.countries[0], refinements: { shop: [m.shopName] }, sort: 'relevance', limit: 1 })).total, 0);
    assert.equal((await getStats(env, 'gr')).offers, protectedShops.length);
    const originalSamples = summary.samples!;
    // Release the first normalized catalogue before reparsing for a fresh sync ID.
    report.products.length = 0;
    report = await buildReport(shop, 'offline-batch50-second');
    assert.equal(report.products.length, expectedCount);
    assert.equal(await listShopProducts(env, m.slug), expectedCount);
    const repeat = await saveShopProducts(env, m.slug, report.products);
    assert.deepEqual(repeat, { written: 0, removed: 0 }, 'Second complete sync is not idempotent');
    const browse = await searchCatalogue(env, { query: '', country: shop.countries[0], refinements: { shop: [m.shopName] }, sort: 'price_asc', limit: 200 });
    assert.equal(browse.total, expectedCount);
    assert.ok(browse.hits.length && browse.hits.every((p) => p.shopId === m.slug));
    for (const sample of originalSamples) {
      assert.deepEqual(await getProduct(env, sample.id), sample);
      const result = await searchCatalogue(env, { query: String(sample.title), country: shop.countries[0], refinements: { shop: [m.shopName] }, sort: 'relevance', limit: 200 });
      assert.ok(result.total > 0 && result.hits.every((p) => p.shopId === m.slug), `FTS query failed: ${sample.id}`);
      // Common titles can match >200 variants; direct lookup above checks the exact sample ID.
    }
    await db.prepare("INSERT INTO products_fts (products_fts,rank) VALUES ('integrity-check',1)").run();
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM products_fts').first<{ n: number }>())?.n, expectedCount + protectedShops.length);
    assert.equal(await protectedSnapshot(), protectedBefore, 'Existing-shop sentinels changed');
    // Replay the actual escaped SQL export in a second empty D1, with bounded memory.
    const replay = await mf.getD1Database('REPLAY_DB') as unknown as Env['DB'];
    for (const sql of migrations) await replay.prepare(sql).run();
    let pendingSql = '', replayedStatements = 0;
    let batch: D1PreparedStatement[] = [];
    const flushReplay = async () => {
      if (!batch.length) return;
      await replay.batch(batch);
      replayedStatements += batch.length;
      batch = [];
      if (replayedStatements % 500 === 0) console.log(`[${m.slug}] replayed ${replayedStatements}/${sqlCount} SQL statements`);
    };
    for await (const line of createInterface({ input: createReadStream(path.join(temporary, 'hidden-products.sql')), crlfDelay: Infinity })) {
      pendingSql += `${line}\n`;
      if (!line.trimEnd().endsWith(';')) continue;
      const statements = unstable_splitSqlQuery(pendingSql);
      assert.equal(statements.length, 1, 'An exported SQL statement did not round-trip through the SQL splitter');
      batch.push(replay.prepare(statements[0]));
      pendingSql = '';
      if (batch.length >= 20) await flushReplay();
    }
    assert.equal(pendingSql.trim(), '', 'Incomplete SQL export');
    await flushReplay();
    assert.equal(replayedStatements, sqlCount);
    type Fingerprint = { id: string; shop_id: string; hash: string; price: number };
    let fingerprints: Fingerprint[] = [], verifiedFingerprints = 0;
    const verifyFingerprints = async () => {
      if (!fingerprints.length) return;
      const byId = new Map(fingerprints.map((r) => [r.id, r]));
      const replayRows = (await replay.prepare('SELECT id,shop_id,hash,price FROM products WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(fingerprints.map((r) => r.id))).all<Fingerprint>()).results;
      assert.equal(replayRows.length, fingerprints.length);
      for (const row of replayRows) assert.deepEqual(row, byId.get(row.id), `SQL replay fingerprint differs: ${row.id}`);
      verifiedFingerprints += fingerprints.length;
      fingerprints = [];
    };
    for await (const line of createInterface({ input: createReadStream(path.join(temporary, 'hashes.jsonl')), crlfDelay: Infinity })) {
      fingerprints.push(JSON.parse(line) as Fingerprint);
      if (fingerprints.length >= 500) await verifyFingerprints();
    }
    await verifyFingerprints();
    assert.equal(verifiedFingerprints, expectedCount);
    const replayCounts = await replay.prepare('SELECT COUNT(*) AS n,SUM(listed) AS listed,COUNT(DISTINCT shop_id) AS shops FROM products').first<{ n: number; listed: number; shops: number }>();
    assert.deepEqual(replayCounts, { n: expectedCount, listed: 0, shops: 1 });
    await replay.prepare("INSERT INTO products_fts (products_fts,rank) VALUES ('integrity-check',1)").run();
    Object.assign(summary, {
      success: true, firstWritten: written, secondWritten: repeat.written, secondRemoved: repeat.removed,
      hiddenBeforeActivation: true, publicBrowseCount: browse.total, publicSearchPassed: true, productLookupPassed: true,
      storedDocumentsCompared: documentsCompared, ftsIntegrity: 'ok', protectedShopsUnchanged: true,
      normalizedProductsFile: 'products.json', hashesFile: 'hashes.jsonl', sqlFile: 'hidden-products.sql', preparedStatementsFile: 'statements.jsonl',
      sqlStatements: sqlCount, preparedStatements: preparedCount, sqlMaxBytes: maxSqlBytes,
      preparedParameterMaxBytes: maxPreparedParameterBytes, sqlReplayPassed: true, sqlReplayProducts: verifiedFingerprints,
    });
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error);
    if (error && typeof error === 'object' && 'code' in error) summary.errorCode = String(error.code);
  } finally {
    globalThis.fetch = realFetch;
    await Promise.all(handles.map((h) => h.close()));
    if (mf) await mf.dispose();
  }
  summary.finishedAt = new Date().toISOString(); summary.seconds = Math.round((Date.now() - started) / 1000);
  await fs.writeFile(path.join(temporary, 'report.json'), `${JSON.stringify(summary, null, 2)}\n`);
  if (summary.success) {
    // Publish export files only after the complete local validation passes.
    await fs.rm(shopDir, { recursive: true, force: true });
    await fs.rename(temporary, shopDir);
  } else {
    // Failed validations have no import artifacts at the final paths.
    await fs.rm(shopDir, { recursive: true, force: true });
    await fs.mkdir(shopDir, { recursive: true });
    await fs.copyFile(path.join(temporary, 'report.json'), path.join(shopDir, 'report.json'));
    await fs.rm(temporary, { recursive: true, force: true });
  }
  return summary;
}

const results: ShopReport[] = [];
for (const slug of approved) {
  const result = await validate(metadata.find((m) => m.slug === slug)!);
  results.push(result);
  console.log(`[${slug}] ${result.success ? 'PASS' : 'FAIL'} imported=${result.imported ?? 0} skipped=${result.skipped ?? 0}${result.error ? ` error=${result.error}` : ''}`);
  await fs.writeFile(path.join(outDir, 'report.json'), `${JSON.stringify({
    generatedAt: new Date().toISOString(), localOnly: true, remoteWrites: false, emailSent: false, realMerchantEmailsUsed: false,
    implementationSha256, metadataPath, approvedSlugs: approved, complete: results.length === approved.length,
    passed: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length,
    imported: results.filter((r) => r.success).reduce((n, r) => n + (r.imported || 0), 0),
    protectedShops: protectedShops.map(([id]) => id), shops: results,
  }, null, 2)}\n`);
}
if (results.some((r) => !r.success)) process.exitCode = 1;
