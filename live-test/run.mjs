// Live test of tagora.online, run on GitHub's servers (.github/workflows/live-test.yml).
// phase "signup": checks real shops through the live API, then signs the best one up
//                 through the real form (pending; an admin approves it).
// phase "verify": checks search, product pages and health on the live site.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const SITE = 'https://tagora.online';
const OUT = 'live-test/out';
mkdirSync(OUT, { recursive: true });
const plan = JSON.parse(readFileSync('live-test/plan.json', 'utf8'));
const log = (...a) => console.log(...a);
const save = (name, data) => writeFileSync(`${OUT}/${name}`, JSON.stringify(data, null, 2));

async function api(path, body) {
  const t = Date.now();
  const res = await fetch(SITE + '/api' + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: res.status, ms: Date.now() - t, json };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('tagora_consent', JSON.stringify({ analytics: false, ts: Date.now() })));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

if (plan.phase === 'signup') {
  log('health', JSON.stringify((await api('/health')).json));
  const checks = [];
  for (const c of plan.candidates) {
    const r = await api('/shops/check', { sourceType: c.type, sourceUrl: c.url });
    const j = r.json;
    const row = { ...c, status: r.status, ms: r.ms, ok: j.ok, code: j.code, message: j.message, format: j.format, found: j.found, ready: j.ready,
      issues: (j.issues || []).map((i) => `${i.code}:${i.count}`), sample: (j.sample || []).map((s) => `${s.title} | ${s.price}`) };
    checks.push(row);
    log('check', c.url, '->', r.status, `${r.ms}ms`, j.ok ? `found=${j.found} ready=${j.ready} format=${j.format}` : `${j.code} ${j.message ?? ''}`);
  }
  save('checks.json', checks);
  const results = [];
  for (const pick of checks.filter((c) => c.ok)) {
    const n = results.length + 1;
    await page.goto(SITE + '/gr/shops', { waitUntil: 'networkidle' });
    if (n === 1) await page.screenshot({ path: `${OUT}/1-shops.png` });
    const idx = { feed: 1, shopify: 2, woocommerce: 3 }[pick.type];
    await page.click(`label.source:nth-child(${idx})`);
    await page.fill('#source-url', pick.url);
    await page.click('.field-row .btn');
    await page.waitForSelector('.check', { timeout: 120000 });
    log('form check:', pick.name, (await page.textContent('.check-title')).trim());
    await page.locator('#apply').screenshot({ path: `${OUT}/2-check-${n}.png` });
    await page.fill('#f-name', pick.name);
    await page.fill('#f-web', pick.website);
    await page.fill('#f-contact', 'Tagora live test');
    await page.fill('#f-email', 'hello@tagora.online');
    await page.check('.consent input');
    await page.click('form.form button[type=submit]');
    await page.waitForSelector('.done, .form-error', { timeout: 180000 });
    const done = await page.$('.done');
    log('signup:', pick.name, done ? (await page.textContent('.done h2')).trim() : 'ERROR ' + (await page.textContent('.form-error')));
    await page.locator('#apply').screenshot({ path: `${OUT}/3-signup-${n}.png` });
    results.push({ name: pick.name, signedUp: !!done });
  }
  save('signup.json', { results, errors });
}

if (plan.phase === 'verify') {
  const out = { health: (await api('/health')).json, mode: (await api('/catalogue/mode')).json, searches: [] };
  for (const q of plan.queries) {
    const r = await api(`/catalogue/search?country=gr&limit=5&q=${encodeURIComponent(q)}`);
    out.searches.push({ q, status: r.status, ms: r.ms, total: r.json.total, hits: (r.json.hits || []).map((h) => `${typeof h.title === 'string' ? h.title : h.title?.el} | ${h.price} | ${h.shop}`) });
    log('search', q, '->', r.json.total, `${r.ms}ms`);
  }
  out.stats = (await api('/catalogue/stats?country=gr')).json;
  await page.goto(`${SITE}/gr?catalogue=live`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${OUT}/4-home-live.png` });
  await page.goto(`${SITE}/gr/products?q=${encodeURIComponent(plan.queries[0])}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.hit, .empty, .notice', { timeout: 30000 });
  await page.screenshot({ path: `${OUT}/5-results-live.png` });
  out.resultsCount = (await page.textContent('.results-count').catch(() => '')).trim();
  if (await page.$('.hit-title a')) {
    await page.click('.hit-title a');
    await page.waitForSelector('.product-info', { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/6-product-live.png`, fullPage: true });
    out.productUrl = page.url();
  }
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await m.newPage();
  await mp.goto(`${SITE}/gr/products?catalogue=live&q=${encodeURIComponent(plan.queries[0])}`, { waitUntil: 'networkidle' });
  await mp.screenshot({ path: `${OUT}/7-results-mobile.png` });
  out.mobileOverflow = await mp.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  out.errors = errors;
  save('verify.json', out);
  log(JSON.stringify(out, null, 2));
}

await browser.close();
