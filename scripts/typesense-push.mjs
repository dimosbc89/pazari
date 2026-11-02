// Creates the Typesense collection and uploads a catalogue file.
//
//   TYPESENSE_HOST=xxx.a1.typesense.net TYPESENSE_ADMIN_KEY=... node scripts/typesense-push.mjs \
//     [--file data/catalogue.json] [--lang el] [--recreate] [--search-key]
//
// --file        catalogue to upload (default: the demo catalogue)
// --lang        language to keep when a field has several (the demo is bilingual)
// --recreate    drop and recreate the collection first
// --search-key  also create a search-only API key for the website (VITE_TYPESENSE_SEARCH_KEY)
// The admin key stays on your machine; never put it in VITE_ variables.
import fs from 'node:fs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };

const host = process.env.TYPESENSE_HOST || process.env.VITE_TYPESENSE_HOST;
const key = process.env.TYPESENSE_ADMIN_KEY;
const port = process.env.TYPESENSE_PORT || '443';
const protocol = process.env.TYPESENSE_PROTOCOL || 'https';
const collection = process.env.TYPESENSE_COLLECTION || 'products';
if (!host || !key) {
  console.error('Set TYPESENSE_HOST and TYPESENSE_ADMIN_KEY (see .env.example).');
  process.exit(1);
}
const base = `${protocol}://${host}:${port}`;
const api = async (method, p, body, raw = false) => {
  const res = await fetch(base + p, {
    method,
    headers: { 'X-TYPESENSE-API-KEY': key, 'Content-Type': raw ? 'text/plain' : 'application/json' },
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const textBody = await res.text();
  if (!res.ok && !(method === 'DELETE' && res.status === 404)) throw new Error(`${method} ${p}: ${res.status} ${textBody}`);
  return raw ? textBody : textBody ? JSON.parse(textBody) : null;
};

import shared from '../shared/typesense-schema.json' with { type: 'json' };
const schema = { name: collection, ...shared };

const lang = opt('lang', 'el');
const pick = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v[lang] ?? v.en ?? Object.values(v)[0] : v);
const file = opt('file', 'public/demo/products.json');
const docs = JSON.parse(fs.readFileSync(file, 'utf8')).map((p) => {
  const d = { ...p };
  for (const k of ['title', 'summary', 'description', 'size']) if (d[k] !== undefined) d[k] = pick(d[k]);
  d.discountPct ??= 0;
  d.rank ??= 0;
  for (const k of Object.keys(d)) if (d[k] === undefined || d[k] === null) delete d[k];
  return d;
});

if (flag('recreate')) { await api('DELETE', `/collections/${collection}`); console.log('dropped', collection); }
const exists = await fetch(`${base}/collections/${collection}`, { headers: { 'X-TYPESENSE-API-KEY': key } }).then((r) => r.ok);
if (!exists) { await api('POST', '/collections', schema); console.log('created', collection); }

const jsonl = docs.map((d) => JSON.stringify(d)).join('\n');
const result = await api('POST', `/collections/${collection}/documents/import?action=upsert`, jsonl, true);
const lines = result.split('\n').map((l) => JSON.parse(l));
const failed = lines.filter((l) => !l.success);
console.log(`imported ${lines.length - failed.length}/${lines.length} documents from ${file} (lang: ${lang})`);
if (failed.length) console.log('first errors:', failed.slice(0, 3));

if (flag('search-key')) {
  const k = await api('POST', '/keys', { description: 'Pazari website (search only)', actions: ['documents:search'], collections: [collection] });
  console.log(`\nSearch-only key (put it in VITE_TYPESENSE_SEARCH_KEY): ${k.value}`);
}
