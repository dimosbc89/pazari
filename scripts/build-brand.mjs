// Builds every brand file from scripts/brand-geometry.mjs:
//   brand/   logo, reverse and mono logos, icons, lockup, PNG exports, brand sheet
//   public/  favicon.svg, favicon.ico, PNG app icons, og.png (social share image)
// PNG export uses Playwright's Chromium. Run: npm run brand
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { COLORS as C, wordmarkSVG, iconSVG, iconSmallSVG, awning, markInner } from './brand-geometry.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (...p) => path.join(root, ...p);
fs.mkdirSync(out('brand/png'), { recursive: true });
fs.mkdirSync(out('public'), { recursive: true });

const write = (file, text) => { fs.writeFileSync(out(file), text); console.log('wrote', file); };

// ---------- SVG files ----------
const logo = wordmarkSVG({ pad: 6 });
const logoReverse = wordmarkSVG({ color: C.cream, dotColor: C.paprika, pad: 6 });
const monoBlack = wordmarkSVG({ color: '#000', dotColor: '#000', pad: 6 });
const monoWhite = wordmarkSVG({ color: '#fff', dotColor: '#fff', pad: 6 });

function lockupSVG({ reverse = false } = {}) {
  // icon (512) + gap + wordmark scaled to the icon's height
  const wm = wordmarkSVG({ color: reverse ? C.cream : C.ink, dotColor: C.paprika });
  const inner = wm.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<title>.*?<\/title>/, '');
  const scale = 300 / 201; // wordmark box height 201 -> 300 px
  const icon = iconSVG().replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 512" role="img" aria-label="pazari"><title>pazari</title>` +
    `${icon}<g transform="translate(${620 + 2 * scale} ${106 + 51 * scale}) scale(${scale})">${inner}</g></svg>`;
}

write('brand/logo.svg', logo);
write('brand/logo-reverse.svg', logoReverse);
write('brand/logo-mono-black.svg', monoBlack);
write('brand/logo-mono-white.svg', monoWhite);
write('brand/icon.svg', iconSVG());
write('brand/icon-square.svg', iconSVG({ shape: 'square' }));
write('brand/icon-small.svg', iconSmallSVG({ size: 512 }));
write('brand/lockup.svg', lockupSVG());
write('brand/lockup-reverse.svg', lockupSVG({ reverse: true }));
write('public/favicon.svg', iconSmallSVG({ size: 32 }).replace(/ width="32" height="32"/, ''));

// ---------- Social share image (1200 x 630) ----------
const fontDir = out('node_modules/@fontsource-variable/commissioner/files');
// Fonts are inlined as data URIs: pages opened with setContent cannot load file:// fonts.
const fontFace = ['latin', 'latin-ext', 'greek'].map((s) => {
  const b64 = fs.readFileSync(`${fontDir}/commissioner-${s}-wght-normal.woff2`).toString('base64');
  return `@font-face{font-family:Commissioner;font-weight:100 900;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}).join('');

const ogHTML = `<!doctype html><meta charset="utf-8"><style>${fontFace}
html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:${C.cream};font-family:Commissioner,sans-serif}
.aw{position:absolute;top:0;left:0;width:1200px;height:120px}
.wm{position:absolute;left:50%;top:205px;transform:translateX(-50%);width:640px}
.tag{position:absolute;left:0;right:0;top:470px;text-align:center;font-size:44px;font-weight:650;color:${C.ink};letter-spacing:-.01em}
.tag b{color:${C.paprikaDeep};font-weight:750}
.sub{position:absolute;left:0;right:0;top:540px;text-align:center;font-size:24px;color:#5d5870;font-weight:500}
</style>
<svg class="aw" viewBox="0 0 1200 120">${awning({ w: 1200, n: 10, h: 78 })}</svg>
<div class="wm">${logo}</div>
<div class="tag">Όλα τα καταστήματα. <b>Μία αναζήτηση.</b></div>
<div class="sub">Σύγκρινε τιμές και βρες την καλύτερη προσφορά</div>`;

// ---------- Brand sheet ----------
const swatches = [
  ['Paprika', C.paprika, 'Primary. Logo dot, awning, highlights'],
  ['Paprika deep', C.paprikaDeep, 'Buttons and links (AA on white)'],
  ['Ink', C.ink, 'Text and wordmark'],
  ['Cream', C.cream, 'Warm backgrounds'],
  ['Saffron', C.saffron, 'Accent: deals, icon dot'],
  ['Mint', C.mint, 'Free shipping, success'],
  ['Plum', C.plum, 'Illustration accent'],
  ['Sky', C.sky, 'Illustration accent'],
];
const sheetHTML = `<!doctype html><meta charset="utf-8"><style>${fontFace}
body{margin:0;padding:56px;width:1288px;background:#fff;font-family:Commissioner,sans-serif;color:${C.ink}}
h1{font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#5d5870;margin:0 0 28px;font-weight:600}
h2{font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#5d5870;margin:48px 0 18px;font-weight:600}
.row{display:flex;gap:24px;align-items:stretch}
.card{border-radius:20px;padding:36px;display:flex;align-items:center;justify-content:center}
.sw{width:136px}.sw i{display:block;height:96px;border-radius:14px;border:1px solid #0001}.sw b{display:block;margin-top:10px;font-size:15px}.sw span{font-size:13px;color:#5d5870;display:block}
.type{font-size:64px;font-weight:700;letter-spacing:-.02em;line-height:1.05}
.type small{display:block;font-size:20px;font-weight:450;letter-spacing:0;margin-top:14px;color:#5d5870}
</style>
<h1>pazari · brand sheet</h1>
<div class="row">
  <div class="card" style="background:${C.cream};flex:1.4">${logo.replace('<svg ', '<svg width="520" ')}</div>
  <div class="card" style="background:${C.ink};flex:1">${logoReverse.replace('<svg ', '<svg width="340" ')}</div>
</div>
<h2>Icon</h2>
<div class="row" style="align-items:center">
  ${iconSVG({ size: 180 })}${iconSVG({ size: 96 })}${iconSVG({ size: 48 })}
  <span style="width:40px"></span>${iconSmallSVG({ size: 96 })}${iconSmallSVG({ size: 32 })}${iconSmallSVG({ size: 16 })}
  <span style="font-size:14px;color:#5d5870;max-width:260px;margin-left:12px">App icon: a market-stall awning over the “p”. Below 48 px use the simple paprika tile.</span>
</div>
<h2>Colour</h2>
<div class="row" style="gap:18px">${swatches.map(([n, h, u]) => `<div class="sw"><i style="background:${h}"></i><b>${n}</b><span>${h}</span><span>${u}</span></div>`).join('')}</div>
<h2>Type: Commissioner</h2>
<div class="type">Βρες την καλύτερη τιμή.<small>Commissioner (variable, Latin + Greek). Headings 700, body 450, UI labels 600.</small></div>`;

write('brand/brand-sheet.html', sheetHTML.replace(/@font-face\{[^}]*\}/g, '').replace('<style>', `<style>@import url('https://fonts.googleapis.com/css2?family=Commissioner:wght@400..800&display=swap');`));

// ---------- PNG export ----------
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch {
  console.log('\nPlaywright not found: SVGs written, PNGs skipped. Install it with `npm i -D playwright` and re-run.');
  process.exit(0);
}

const browser = await chromium.launch();
async function png(svgOrHtml, file, w, h, { transparent = true, isHTML = false } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const html = isHTML ? svgOrHtml : `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${svgOrHtml}`;
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out(file), omitBackground: transparent, fullPage: isHTML && h === 0 });
  await page.close();
  console.log('wrote', file);
  return out(file);
}

await png(logo, 'brand/png/logo-1200.png', 1200, Math.round(1200 * (201 + 12) / (583 + 12)));
await png(logoReverse, 'brand/png/logo-reverse-1200.png', 1200, Math.round(1200 * (201 + 12) / (583 + 12)));
await png(iconSVG(), 'brand/png/icon-1024.png', 1024, 1024);
await png(lockupSVG(), 'brand/png/lockup-1500.png', 1500, 512);
await png(iconSVG({ shape: 'square' }), 'public/apple-touch-icon.png', 180, 180, { transparent: false });
await png(iconSVG(), 'public/icon-192.png', 192, 192);
await png(iconSVG(), 'public/icon-512.png', 512, 512);
await png(iconSVG({ shape: 'square', maskable: true }), 'public/icon-maskable-512.png', 512, 512, { transparent: false });
const ico = [];
for (const s of [16, 32, 48]) ico.push([s, await png(iconSmallSVG({ size: s }), `brand/png/favicon-${s}.png`, s, s)]);
await png(ogHTML, 'public/og.png', 1200, 630, { transparent: false, isHTML: true });
await png(sheetHTML, 'brand/brand-sheet.png', 1400, 0, { transparent: false, isHTML: true });
await browser.close();

// favicon.ico: an ICO container holding the 16/32/48 PNGs
const imgs = ico.map(([s, f]) => [s, fs.readFileSync(f)]);
const header = Buffer.alloc(6 + 16 * imgs.length);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(imgs.length, 4);
let offset = header.length;
imgs.forEach(([s, buf], i) => {
  const o = 6 + i * 16;
  header.writeUInt8(s, o); header.writeUInt8(s, o + 1); header.writeUInt8(0, o + 2); header.writeUInt8(0, o + 3);
  header.writeUInt16LE(1, o + 4); header.writeUInt16LE(32, o + 6);
  header.writeUInt32LE(buf.length, o + 8); header.writeUInt32LE(offset, o + 12);
  offset += buf.length;
});
fs.writeFileSync(out('public/favicon.ico'), Buffer.concat([header, ...imgs.map(([, b]) => b)]));
console.log('wrote public/favicon.ico');
