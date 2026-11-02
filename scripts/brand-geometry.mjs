// The Tagora wordmark and icon, drawn from geometric strokes (no font needed).
// Tagora = price TAG + AGORA (the Greek marketplace).
// Units: x-height = 100, baseline at y = 100, stroke = 24, round caps and joins.

export const COLORS = {
  paprika: '#EF4A23',     // brand primary
  paprikaDeep: '#C9361A', // buttons and links (AA on white)
  ink: '#1D1A2F',         // text and wordmark
  cream: '#FFF6EC',       // warm background
  saffron: '#FFB627',
  mint: '#17A673',
  plum: '#6D4AE8',
  sky: '#2E9BE6',
};

const S = 24;              // stroke width
const R = 38;              // bowl radius (centerline)
const TOP = S / 2;         // 12: centerline of the x-height edge
const BASE = 100 - S / 2;  // 88: centerline of the baseline edge

const ring = (cx) => `<circle cx="${cx}" cy="50" r="${R}"/>`;
const line = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;

// Letter positions (stem x or bowl centre), tuned by eye for even spacing.
const T = 36, A1 = 142, G = 262, O = 382, RR = 464, A2 = 572;

/** "t": tall stem with a rounded foot, crossbar on the x-height. */
const tGlyph = (x) => `<path d="M${x} -26V62A26 26 0 0 0 ${x + 26} ${BASE}"/><path d="M${x - 24} ${TOP}H${x + 30}"/>`;
/** single-storey "g": bowl, stem, and a hook below the baseline */
const gGlyph = (cx) => `${ring(cx)}<path d="M${cx + R} ${TOP}V100A${R} ${R} 0 0 1 ${cx - 27} 127"/>`;

/** Ink extents of the wordmark, for the SVG viewBox. */
export const BOX = { x: -2, y: -40, w: 630, h: 192 };

/** Letter strokes of "tagora", except the "o" (returned on its own for the accent colour). */
export function wordmarkParts() {
  const strokes = [
    tGlyph(T),
    ring(A1), line(A1 + R, TOP, A1 + R, BASE),
    gGlyph(G),
    `<path d="M${RR} ${BASE}V52A${R} ${R} 0 0 1 ${RR + R} ${TOP}"/>`,
    ring(A2), line(A2 + R, TOP, A2 + R, BASE),
  ].join('');
  return { strokes, o: ring(O), box: BOX };
}

/** Full wordmark. The "o" is the hole of a price tag, so it takes the accent colour. */
export function wordmarkSVG({ color = COLORS.ink, accent = COLORS.paprika, title = 'tagora', pad = 0 } = {}) {
  const { strokes, o, box } = wordmarkParts();
  const vb = `${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}"><title>${title}</title>` +
    `<g fill="none" stroke-width="${S}" stroke-linecap="round" stroke-linejoin="round"><g stroke="${color}">${strokes}</g>` +
    `<g stroke="${accent}">${o}</g></g></svg>`;
}

/** Market-stall awning (the agora): alternating scallops across the top of a box of width w. */
export function awning({ w = 512, n = 4, h = 92, a = COLORS.paprika, b = COLORS.cream }) {
  const sw = w / n;
  let out = '';
  for (let k = 0; k < n; k++) {
    const x = k * sw;
    out += `<path d="M${x} 0H${x + sw}V${h}A${sw / 2} ${sw / 2.6} 0 0 1 ${x} ${h}Z" fill="${k % 2 ? b : a}"/>`;
  }
  return out;
}

/**
 * A price tag hanging from its hole, in a 512 box: rounded pentagon, tilted.
 * letter: draw a small "t" on the tag body.
 */
export function priceTag({ body = COLORS.cream, hole = COLORS.paprika, holeFill = COLORS.ink, letter = COLORS.ink, tilt = -14, scale = 1, withLetter = true } = {}) {
  const tag = 'M256 86L370 200V412H142V200Z';
  const t = withLetter
    ? `<g transform="translate(262 324) scale(1.3)" fill="none" stroke="${letter}" stroke-width="${S}" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="M-6 -56V18A26 26 0 0 0 20 44"/><path d="M-32 -18H24"/></g>`
    : '';
  return `<g transform="rotate(${tilt} 256 256) translate(256 256) scale(${scale}) translate(-256 -256)">` +
    `<path d="${tag}" fill="${body}" stroke="${body}" stroke-width="52" stroke-linejoin="round"/>` +
    `<circle cx="256" cy="178" r="25" fill="${holeFill}" stroke="${hole}" stroke-width="15"/>` +
    `${t}</g>`;
}

/**
 * App icon (512 x 512): ink tile, a cream price tag with a paprika-ringed hole and a "t".
 * shape: 'rounded' (default) or 'square' (full bleed, for iOS / maskable).
 */
export function iconSVG({ shape = 'rounded', size = 512, maskable = false } = {}) {
  const rx = shape === 'rounded' ? 116 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">` +
    `<rect width="512" height="512" rx="${rx}" fill="${COLORS.ink}"/>` +
    priceTag({ scale: maskable ? 0.7 : 0.86, holeFill: COLORS.ink }) + `</svg>`;
}

/** Small-size icon (16-48 px): paprika tile, plain cream tag with a hole, so it stays crisp in a tab. */
export function iconSmallSVG({ size = 32 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">` +
    `<rect width="512" height="512" rx="116" fill="${COLORS.paprika}"/>` +
    priceTag({ scale: 0.98, withLetter: false, holeFill: COLORS.paprika, hole: COLORS.ink }) + `</svg>`;
}
