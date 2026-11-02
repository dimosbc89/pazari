// Imports a merchant's Google Merchant Center feed into Pazari's catalogue format.
//
//   node scripts/import-feed.mjs --feed <file or URL> --shop "Shop name" --countries gr,cy [--out data/catalogue.json]
//
// Accepts the two standard feed formats: XML (RSS 2.0 with the g: namespace) and
// tab-separated text with a header row. Run once per merchant; items from the same
// shop are replaced, other shops are kept. Then load the file into Typesense with
// scripts/typesense-push.mjs --file data/catalogue.json
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true]] : acc), []),
);
if (!args.feed || !args.shop || !args.countries) {
  console.error('Usage: node scripts/import-feed.mjs --feed <file|url> --shop "Shop name" --countries gr,cy [--out data/catalogue.json]');
  process.exit(1);
}
const OUT = path.resolve(args.out || 'data/catalogue.json');
const countries = String(args.countries).split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const shopSlug = slug(args.shop);

const raw = /^https?:\/\//.test(args.feed) ? await (await fetch(args.feed)).text() : fs.readFileSync(args.feed, 'utf8');

/** @returns {Record<string, any>[]} items with keys like "id", "price", "image_link" (g: prefix removed) */
function parse(text) {
  if (text.trimStart().startsWith('<')) {
    const xml = new XMLParser({ ignoreAttributes: true, removeNSPrefix: true, isArray: (name) => ['item', 'entry', 'additional_image_link'].includes(name) }).parse(text);
    return xml.rss?.channel?.item ?? xml.feed?.entry ?? [];
  }
  const [head, ...rows] = text.split(/\r?\n/).filter(Boolean);
  const cols = head.split('\t').map((c) => c.trim().replace(/^g:/, ''));
  return rows.map((r) => Object.fromEntries(r.split('\t').map((v, i) => [cols[i], v.trim()])));
}

const money = (v) => {
  if (v == null || v === '') return undefined;
  const s = typeof v === 'object' ? v.price ?? Object.values(v)[0] : v;
  // "19.90 EUR", "1,234.50 EUR" and the European "1.234,50 EUR" all work.
  let n = String(s).replace(/[^\d.,]/g, '');
  const dot = n.lastIndexOf('.'), comma = n.lastIndexOf(',');
  if (dot > -1 && comma > -1) n = dot > comma ? n.replace(/,/g, '') : n.replace(/\./g, '').replace(',', '.');
  else if (comma > -1) n = /,\d{1,2}$/.test(n) ? n.replace(',', '.') : n.replace(/,/g, '');
  const v2 = parseFloat(n);
  return Number.isFinite(v2) ? v2 : undefined;
};
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Feed descriptions are plain text: escape them and keep paragraph breaks. */
const toHtml = (s) => (s ? s.split(/\n\s*\n/).map((p) => `<p>${escape(p.trim()).replace(/\n/g, '<br>')}</p>`).join('') : undefined);
const text = (v) => (v == null ? undefined : String(typeof v === 'object' ? Object.values(v)[0] : v).trim() || undefined);

const items = parse(raw);
const out = [];
const groupRank = new Map();
let skipped = 0;
for (const it of items) {
  const availability = (text(it.availability) || 'in_stock').toLowerCase().replace(/ /g, '_');
  const price = money(it.price);
  if (!text(it.id) || !price || availability === 'out_of_stock') { skipped++; continue; }
  const sale = money(it.sale_price);
  const now = sale && sale < price ? sale : price;
  const oldPrice = sale && sale < price ? price : undefined;
  const pct = oldPrice ? Math.round((1 - now / oldPrice) * 100) : 0;
  const group = text(it.item_group_id) || text(it.id);
  const rank = groupRank.get(group) ?? 0;
  groupRank.set(group, rank + 1);
  const shipping = it.shipping ? money(it.shipping) : undefined;
  const category = (text(it.google_product_category) || text(it.product_type) || 'Other').split('>').pop().trim();
  out.push({
    id: `${shopSlug}-${slug(text(it.id))}`,
    groupId: `${shopSlug}-${slug(group)}`,
    title: text(it.title),
    brand: text(it.brand) || args.shop,
    summary: text(it.short_title) || undefined,
    description: toHtml(text(it.description)),
    url: text(it.link),
    image: text(it.image_link),
    images: (it.additional_image_link || []).map(text).filter(Boolean).slice(0, 8),
    price: now,
    ...(oldPrice ? { oldPrice } : {}),
    ...(shipping !== undefined ? { shipping } : {}),
    shop: args.shop,
    category,
    ...(text(it.color) ? { color: text(it.color) } : {}),
    ...(text(it.size) ? { size: text(it.size) } : {}),
    ...(text(it.mpn) || text(it.gtin) ? { mpn: text(it.mpn) || text(it.gtin) } : {}),
    ...(text(it.gtin) ? { gtin: text(it.gtin) } : {}),
    countries,
    ...(pct ? { discount: pct < 20 ? 'upto20' : pct < 35 ? '20to35' : '35plus' } : {}),
    discountPct: pct,
    rank,
  });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const existing = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).filter((p) => p.shop !== args.shop) : [];
fs.writeFileSync(OUT, JSON.stringify([...existing, ...out]));
console.log(`${args.shop}: ${out.length} offers imported, ${skipped} skipped (no id/price or out of stock). ${OUT} now has ${existing.length + out.length} offers.`);
