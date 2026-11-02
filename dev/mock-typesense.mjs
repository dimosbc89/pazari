// A tiny in-memory stand-in for Typesense, for local development only. It supports
// just what Pazari uses: collections, JSONL import, delete by filter and multi_search
// (text match on a few fields, := / != filters, facets, sorting, paging).
// Run: node dev/mock-typesense.mjs   (port 8108, any API key)
import http from 'node:http';

const PORT = Number(process.env.PORT || 8108);
const collections = new Map(); // name -> { schema, docs: Map }

const fold = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ς/g, 'σ');

/** Parses "a:=[`x`,`y`] && b:!=`z` && c:=`w`" */
function parseFilter(f) {
  if (!f) return [];
  return f.split(/\s*&&\s*/).map((part) => {
    const m = part.match(/^(\w+):(!=|=)?(\[.*\]|`[^`]*`|[^\s]+)$/);
    if (!m) throw new Error(`mock: unsupported filter ${part}`);
    const [, field, op = '=', raw] = m;
    const values = raw.startsWith('[') ? [...raw.matchAll(/`([^`]*)`|([^,\[\]\s`]+)/g)].map((x) => x[1] ?? x[2]) : [raw.replace(/^`|`$/g, '')];
    return { field, not: op === '!=', values };
  });
}
const matches = (doc, filters) => filters.every(({ field, not, values }) => {
  const v = doc[field];
  const hit = Array.isArray(v) ? v.some((x) => values.includes(String(x))) : values.includes(String(v));
  return not ? !hit : hit;
});

function search(col, s) {
  const filters = parseFilter(s.filter_by);
  const tokens = s.q && s.q !== '*' ? fold(s.q).split(/\s+/).filter(Boolean) : [];
  const fields = (s.query_by || 'title').split(',');
  let docs = [...col.docs.values()].filter((d) => matches(d, filters));
  if (tokens.length) docs = docs.filter((d) => tokens.every((t) => fields.some((f) => fold(d[f]).includes(t))));
  const facet_counts = (s.facet_by ? s.facet_by.split(',') : []).map((field) => {
    const counts = new Map();
    for (const d of docs) for (const v of [].concat(d[field] ?? [])) counts.set(String(v), (counts.get(String(v)) || 0) + 1);
    return { field_name: field, counts: [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count) };
  });
  const [sortField, dir] = (s.sort_by || '').split(',')[0].split(':');
  if (sortField && sortField !== '_text_match') docs.sort((a, b) => (dir === 'desc' ? -1 : 1) * ((a[sortField] ?? 0) - (b[sortField] ?? 0)));
  const per = Number(s.per_page ?? 10), page = Number(s.page ?? 1);
  return { found: docs.length, page, facet_counts, hits: docs.slice((page - 1) * per, page * per).map((document) => ({ document })) };
}

const body = (req) => new Promise((r) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => r(b)); });
const send = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-TYPESENSE-API-KEY', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS' });
  res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  const parts = u.pathname.split('/').filter(Boolean);
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '');
    if (u.pathname === '/health') return send(res, 200, { ok: true });
    if (u.pathname === '/multi_search' && req.method === 'POST') {
      const { searches } = JSON.parse(await body(req));
      return send(res, 200, { results: searches.map((s) => { const c = collections.get(s.collection); return c ? search(c, s) : { error: 'Not found.', code: 404 }; }) });
    }
    if (parts[0] === 'collections') {
      const name = parts[1];
      if (!name && req.method === 'POST') { const schema = JSON.parse(await body(req)); collections.set(schema.name, { schema, docs: new Map() }); return send(res, 201, schema); }
      const col = collections.get(name);
      if (!col) return send(res, 404, { message: 'Not Found' });
      if (parts.length === 2 && req.method === 'GET') return send(res, 200, { ...col.schema, num_documents: col.docs.size });
      if (parts.length === 2 && req.method === 'PATCH') { const { fields } = JSON.parse(await body(req)); col.schema.fields.push(...fields); return send(res, 200, { fields }); }
      if (parts[2] === 'documents' && parts[3] === 'import') {
        const lines = (await body(req)).split('\n').filter(Boolean);
        const out = lines.map((l) => { const d = JSON.parse(l); if (!d.id) return { success: false, error: 'no id' }; col.docs.set(d.id, d); return { success: true }; });
        return send(res, 200, out.map((o) => JSON.stringify(o)).join('\n'));
      }
      if (parts[2] === 'documents' && req.method === 'DELETE') {
        const filters = parseFilter(u.searchParams.get('filter_by'));
        let n = 0;
        for (const [id, d] of col.docs) if (matches(d, filters)) { col.docs.delete(id); n++; }
        return send(res, 200, { num_deleted: n });
      }
      if (parts[2] === 'documents' && req.method === 'GET') return send(res, 200, { found: col.docs.size, docs: [...col.docs.values()] });
    }
    send(res, 404, { message: 'Not Found' });
  } catch (e) {
    send(res, 400, { message: String(e.message || e) });
  }
}).listen(PORT, () => console.log(`mock Typesense on http://localhost:${PORT}`));
