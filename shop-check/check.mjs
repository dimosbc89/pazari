// Runs tagora.online's own shop check (POST /api/shops/check) from GitHub's servers.
// Nothing is saved on Tagora; the result is written to shop-check/out/result.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const req = JSON.parse(readFileSync('shop-check/request.json', 'utf8'));
mkdirSync('shop-check/out', { recursive: true });
const out = [];
for (const c of req.candidates) {
  const t = Date.now();
  const res = await fetch('https://tagora.online/api/shops/check', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceType: c.type, sourceUrl: c.url }),
  });
  const json = await res.json().catch(() => ({}));
  const row = { ...c, status: res.status, ms: Date.now() - t, ok: json.ok, code: json.code, message: json.message, format: json.format,
    found: json.found, ready: json.ready, skipped: json.skipped, issues: json.issues, sample: json.sample };
  out.push(row);
  console.log(c.type, res.status, `${row.ms}ms`, json.ok ? `found=${json.found} ready=${json.ready}` : `${json.code}: ${json.message}`);
}
writeFileSync('shop-check/out/result.json', JSON.stringify(out, null, 2));
