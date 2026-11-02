// Imports one shop from the command line (the website does the same on a schedule).
//
//   node scripts/import.ts --type feed --url https://shop.gr/skroutz.xml --shop "Shop name" --countries gr,cy
//   node scripts/import.ts --type shopify --url https://shop.gr --shop "Shop name" --countries gr --shipping 3.5 --free-over 50
//   node scripts/import.ts --type woocommerce --url https://shop.gr --shop "Shop name" --countries gr --push
//
// --type        feed (XML/CSV: Google, Skroutz, BestPrice…), shopify or woocommerce
// --out         catalogue file to update (default data/catalogue.json); this shop's items are replaced
// --push        also upload to Typesense (TYPESENSE_HOST + TYPESENSE_ADMIN_KEY) and remove items the shop no longer has
// --allow-private  allow localhost addresses (testing)
// Needs Node 22.18+ (runs TypeScript directly).
import fs from 'node:fs';
import path from 'node:path';
import { buildReport, SyncError, typesenseClient, type ShopConfig, type SourceType } from '../sync/index.ts';
import { slug } from '../sync/text.ts';

const argv = process.argv.slice(2);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (n: string) => argv.includes(`--${n}`);

const type = (opt('type') || 'feed') as SourceType;
const url = opt('url');
const name = opt('shop');
const countries = (opt('countries') || '').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
if (!url || !name || !countries.length || !['feed', 'shopify', 'woocommerce'].includes(type)) {
  console.error('Usage: node scripts/import.ts --type feed|shopify|woocommerce --url <url> --shop "Name" --countries gr,cy [--shipping 3.5 --free-over 50] [--out file] [--push]');
  process.exit(1);
}
const num = (v?: string) => (v === undefined ? null : Number(v.replace(',', '.')));
const shop: ShopConfig = { id: opt('id') || slug(name), name, countries, sourceType: type, sourceUrl: url, defaultShipping: num(opt('shipping')), freeShippingOver: num(opt('free-over')) };
const syncId = new Date().toISOString();

try {
  const report = await buildReport(shop, syncId, { allowPrivate: flag('allow-private') });
  console.log(`${name}: read ${report.found} items (${report.format}), ${report.products.length} ready, ${report.skipped} left out.`);
  for (const i of report.issues) console.log(`  - ${i.code}: ${i.count}${i.examples.length ? `  e.g. ${i.examples.slice(0, 2).join(' | ')}` : ''}`);

  const out = path.resolve(opt('out') || 'data/catalogue.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const existing = fs.existsSync(out) ? (JSON.parse(fs.readFileSync(out, 'utf8')) as { shopId?: string; shop: string }[]) : [];
  const kept = existing.filter((p) => (p.shopId ?? slug(p.shop)) !== shop.id);
  fs.writeFileSync(out, JSON.stringify([...kept, ...report.products]));
  console.log(`Wrote ${out} (${kept.length + report.products.length} offers in total).`);

  if (flag('push')) {
    const host = process.env.TYPESENSE_HOST, apiKey = process.env.TYPESENSE_ADMIN_KEY;
    if (!host || !apiKey) throw new Error('Set TYPESENSE_HOST and TYPESENSE_ADMIN_KEY to use --push.');
    const ts = typesenseClient({ host, apiKey, port: process.env.TYPESENSE_PORT, protocol: process.env.TYPESENSE_PROTOCOL, collection: process.env.TYPESENSE_COLLECTION });
    await ts.ensureCollection();
    const { failed, errors } = await ts.upsert(report.products);
    const removed = await ts.deleteStale(shop.id, syncId);
    console.log(`Typesense: ${report.products.length - failed} uploaded, ${failed} failed, ${removed} old items removed.${errors.length ? `\n  ${errors.join('\n  ')}` : ''}`);
  }
} catch (e) {
  console.error(e instanceof SyncError ? `Could not read the shop: ${e.message}` : e);
  process.exit(1);
}
