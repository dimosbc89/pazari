// The Pazari wordmark, drawn from geometric strokes (no font needed).
// Units: x-height = 100, baseline at y = 100, stroke = 24, round caps and joins.

export const COLORS = {
  paprika: '#EF4A23',   // brand primary
  paprikaDeep: '#C9361A', // buttons and links (AA on white)
  ink: '#1D1A2F',        // text and wordmark
  cream: '#FFF6EC',      // warm background
  saffron: '#FFB627',
  mint: '#17A673',
  plum: '#6D4AE8',
  sky: '#2E9BE6',
};

const S = 24;          // stroke width
const R = 38;          // bowl radius (centerline)
const TOP = S / 2;     // 12: centerline of the x-height edge
const BASE = 100 - S / 2; // 88: centerline of the baseline edge

const ring = (cx) => `<circle cx="${cx}" cy="50" r="${R}"/>`;
const line = (x1, y1, x2, y2) => `<path d="M${x1} ${y1}L${x2} ${y2}"/>`;

/** Letter pieces of "pazari"; the i-dot is returned separately so it can take the accent colour. */
export function wordmarkParts() {
  const p = 50, a1 = 168, z0 = 252, a2 = 396, r = 484, i = 564;
  const strokes = [
    // p
    ring(p), line(p - R, TOP, p - R, 136),
    // a
    ring(a1), line(a1 + R, TOP, a1 + R, BASE),
    // z
    `<path d="M${z0} ${TOP}H${z0 + 64}L${z0} ${BASE}H${z0 + 64}"/>`,
    // a
    ring(a2), line(a2 + R, TOP, a2 + R, BASE),
    // r
    `<path d="M${r} ${BASE}V52A${R} ${R} 0 0 1 ${r + R} ${TOP}"/>`,
    // i stem
    line(i, TOP, i, BASE),
  ].join('');
  const dot = { cx: i, cy: -34, r: 15 };
  return { strokes, dot, box: { x: -2, y: -51, w: 583, h: 201 } };
}

/** Full wordmark as an SVG string. */
export function wordmarkSVG({ color = COLORS.ink, dotColor = COLORS.paprika, title = 'pazari', pad = 0 } = {}) {
  const { strokes, dot, box } = wordmarkParts();
  const vb = `${box.x - pad} ${box.y - pad} ${box.w + pad * 2} ${box.h + pad * 2}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}"><title>${title}</title>` +
    `<g fill="none" stroke="${color}" stroke-width="${S}" stroke-linecap="round" stroke-linejoin="round">${strokes}</g>` +
    `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${dotColor}"/></svg>`;
}

/** The "p" glyph with its accent dot, placed with a transform. Glyph box: x 0..100, y 0..148. */
export function markInner({ color, dotColor, scale = 1, tx = 0, ty = 0 }) {
  return `<g transform="translate(${tx} ${ty}) scale(${scale})">` +
    `<g fill="none" stroke="${color}" stroke-width="${S}" stroke-linecap="round" stroke-linejoin="round">` +
    `${ring(50)}${line(50 - R, TOP, 50 - R, 136)}</g>` +
    (dotColor ? `<circle cx="${50 + R + 16}" cy="${-16}" r="15" fill="${dotColor}"/>` : '') + `</g>`;
}

/** Market-stall awning: alternating scallops across the top of a box of width w. */
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
 * App icon (512 x 512): ink tile, market awning, cream "p" with a saffron dot.
 * shape: 'rounded' (default), 'square' (full bleed, for iOS / maskable).
 */
export function iconSVG({ shape = 'rounded', size = 512, maskable = false } = {}) {
  const rx = shape === 'rounded' ? 116 : 0;
  // Glyph box (with dot): x 0..119, y -31..148. Fit it under the awning.
  const k = maskable ? 0.8 : 1; // maskable icons keep the art inside the 80% safe zone
  const s = 1.62 * k;
  const top = maskable ? 196 : 168;
  const glyph = markInner({ color: COLORS.cream, dotColor: COLORS.saffron, scale: s, tx: 256 - 59.5 * s, ty: top + 31 * s });
  const aw = maskable
    ? `<g transform="translate(51 51) scale(0.8)">${awning({})}</g>`
    : `<clipPath id="pz-tile"><rect width="512" height="512" rx="${rx}"/></clipPath><g clip-path="url(#pz-tile)">${awning({})}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">` +
    `<rect width="512" height="512" rx="${rx}" fill="${COLORS.ink}"/>${aw}${glyph}</svg>`;
}

/** Small-size icon (16-32 px): no awning, bigger glyph, so it stays crisp in a browser tab. */
export function iconSmallSVG({ size = 32 } = {}) {
  const s = 2.15;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">` +
    `<rect width="512" height="512" rx="116" fill="${COLORS.paprika}"/>` +
    markInner({ color: COLORS.cream, dotColor: COLORS.ink, scale: s, tx: 256 - 59.5 * s, ty: (512 - 179 * s) / 2 + 31 * s }) + `</svg>`;
}
