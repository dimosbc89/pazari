// One-off shop check from GitHub's servers, always as "TagoraBot" (Tagora's own name).
// mode "discover": reads the home page and robots.txt for the platform and feed links,
// tries the usual feed addresses, and runs Tagora's live check on any feed found.
// Otherwise: runs Tagora's live check on each candidate.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const req = JSON.parse(readFileSync('shop-check/request.json', 'utf8'));
mkdirSync('shop-check/out', { recursive: true });
const UA = 'TagoraBot/1.0 (+https://tagora.online/gr/shops; product sync)';
const get = async (url) => {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const text = await r.text();
    return { status: r.status, final: r.url, type: r.headers.get('content-type'), server: r.headers.get('server'), poweredBy: r.headers.get('x-powered-by'), text };
  } catch (e) { return { error: String(e) }; }
};
const tagoraCheck = async (type, url) => {
  const res = await fetch('https://tagora.online/api/shops/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceType: type, sourceUrl: url }) });
  const j = await res.json().catch(() => ({}));
  return { type, url, status: res.status, ok: j.ok, code: j.code, message: j.message, format: j.format, found: j.found, ready: j.ready, skipped: j.skipped, issues: j.issues, sample: j.sample };
};

const out = {};
if (req.mode === 'discover') {
  const base = req.shop.replace(/\/$/, '');
  const home = await get(base + '/');
  const html = home.text || '';
  const hints = {
    wordpress: /wp-content|wp-includes/.test(html), woocommerce: /woocommerce/i.test(html), shopify: /cdn\.shopify\.com/.test(html),
    opencart: /catalog\/view\/theme|route=common\/home/i.test(html), magento: /mage\/|Magento|static\/version/i.test(html),
    prestashop: /prestashop/i.test(html), generator: (html.match(/<meta[^>]+name=["']generator["'][^>]*>/i) || [''])[0],
  };
  const links = [...new Set([...html.matchAll(/(?:href|src)=["']([^"']*(?:\.xml|feed|skroutz|bestprice)[^"']*)["']/gi)].map((m) => m[1]))].slice(0, 40);
  out.home = { status: home.status, final: home.final, server: home.server, poweredBy: home.poweredBy, error: home.error, hints, links, title: (html.match(/<title>([^<]*)/i) || [])[1] };
  const robots = await get(base + '/robots.txt');
  out.robots = { status: robots.status, lines: (robots.text || '').split('\n').filter((l) => /sitemap|xml|feed|disallow/i.test(l)).slice(0, 30) };
  out.paths = [];
  const feeds = [];
  for (const p of req.paths) {
    const r = await get(base + p);
    const head = (r.text || '').slice(0, 300);
    const looksFeed = r.status === 200 && /<(products|mywebstore|rss|feed|store)\b/i.test(head);
    out.paths.push({ path: p, status: r.status, type: r.type, looksFeed, error: r.error, head: looksFeed ? head.replace(/\s+/g, ' ').slice(0, 160) : undefined });
    console.log(p, r.status ?? r.error, looksFeed ? 'FEED' : '');
    if (looksFeed) feeds.push(r.final || base + p);
  }
  for (const l of out.home.links) if (/\.xml/i.test(l) && /skroutz|bestprice|feed|google|product/i.test(l)) feeds.push(new URL(l, base).toString());
  out.checks = [];
  for (const f of [...new Set(feeds)].slice(0, 5)) out.checks.push(await tagoraCheck('feed', f));
  console.log(JSON.stringify({ home: { ...out.home, links: out.home.links.length }, robots: out.robots, checks: out.checks.map((c) => [c.url, c.ok, c.found, c.ready, c.code]) }, null, 2));
} else {
  out.checks = [];
  for (const c of req.candidates) out.checks.push(await tagoraCheck(c.type, c.url));
}
writeFileSync('shop-check/out/result.json', JSON.stringify(out, null, 2));
