// Flat product illustrations for the demo catalogue. Each drawing is 400 x 400 and
// takes a main colour; shades are derived from it. Nothing here is a real product.

export function shade(hex, amt) {
  // amt < 0 darkens, > 0 lightens (mix with black / white)
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const INK = '#2A2638';
const shadow = (cx = 200, cy = 330, rx = 120, ry = 14) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#000" opacity=".08"/>`;

const art = {
  sneakers(c) {
    const d = shade(c, -0.25), l = shade(c, 0.35);
    return shadow(200, 300, 140, 12) +
      `<path d="M70 250c0-30 10-62 34-84 14-12 30-14 44-4l40 28c18 12 40 18 62 20l44 4c26 2 40 20 40 40v6H70z" fill="${c}"/>` +
      `<path d="M104 166c14-12 30-14 44-4l40 28c-20 8-46 8-64-4z" fill="${d}"/>` +
      `<path d="M150 186l12-14M168 198l12-14M186 208l12-14" stroke="#fff" stroke-width="7" stroke-linecap="round"/>` +
      `<path d="M228 226c26 4 52 4 70 2" stroke="${l}" stroke-width="10" stroke-linecap="round" fill="none"/>` +
      `<path d="M62 262h292c6 0 10 4 10 10v8c0 8-6 14-14 14H76c-8 0-14-6-14-14z" fill="#fff" stroke="#E4E1EA" stroke-width="3"/>` +
      `<path d="M70 284h290" stroke="${d}" stroke-width="5" opacity=".5"/>`;
  },
  headphones(c) {
    const d = shade(c, -0.3), l = shade(c, 0.4);
    return shadow(200, 340, 110, 12) +
      `<path d="M96 230V196c0-60 46-104 104-104s104 44 104 104v34" fill="none" stroke="${d}" stroke-width="22" stroke-linecap="round"/>` +
      `<path d="M104 196c0-56 42-94 96-94s96 38 96 94" fill="none" stroke="${l}" stroke-width="6" stroke-linecap="round" opacity=".7"/>` +
      `<rect x="62" y="204" width="76" height="116" rx="36" fill="${c}"/><rect x="262" y="204" width="76" height="116" rx="36" fill="${c}"/>` +
      `<rect x="112" y="214" width="34" height="96" rx="16" fill="${d}"/><rect x="254" y="214" width="34" height="96" rx="16" fill="${d}"/>` +
      `<rect x="76" y="222" width="10" height="40" rx="5" fill="${l}" opacity=".7"/>`;
  },
  smartphone(c) {
    const d = shade(c, -0.3), l = shade(c, 0.5);
    return shadow(200, 352, 90, 10) +
      `<rect x="122" y="48" width="156" height="300" rx="30" fill="${d}"/>` +
      `<rect x="130" y="56" width="140" height="284" rx="24" fill="${INK}"/>` +
      `<rect x="138" y="64" width="124" height="268" rx="18" fill="${c}"/>` +
      `<path d="M138 250c40-30 80 10 124-24v88c0 10-8 18-18 18h-88c-10 0-18-8-18-18z" fill="${l}" opacity=".55"/>` +
      `<circle cx="200" cy="140" r="34" fill="${l}" opacity=".5"/>` +
      `<rect x="180" y="72" width="40" height="10" rx="5" fill="${INK}"/>`;
  },
  backpack(c) {
    const d = shade(c, -0.28), l = shade(c, 0.35);
    return shadow(200, 344, 110, 12) +
      `<path d="M160 86c0-26 80-26 80 0v20h-16v-14c0-12-48-12-48 0v14h-16z" fill="${d}"/>` +
      `<rect x="104" y="100" width="192" height="236" rx="54" fill="${c}"/>` +
      `<path d="M104 166c40-22 152-22 192 0" fill="none" stroke="${d}" stroke-width="6"/>` +
      `<rect x="134" y="222" width="132" height="92" rx="28" fill="${d}"/>` +
      `<path d="M150 246h100" stroke="${l}" stroke-width="6" stroke-linecap="round"/>` +
      `<rect x="190" y="236" width="20" height="24" rx="4" fill="#E8E5EE"/>`;
  },
  tshirt(c) {
    const d = shade(c, -0.22);
    return shadow(200, 346, 120, 10) +
      `<path d="M150 70l-84 34-30 72 56 22 18-34v172h180V164l18 34 56-22-30-72-84-34c-6 22-26 36-50 36s-44-14-50-36z" fill="${c}"/>` +
      `<path d="M150 70c6 22 26 36 50 36s44-14 50-36" fill="none" stroke="${d}" stroke-width="10"/>` +
      `<path d="M92 198l18-34M308 198l-18-34" stroke="${d}" stroke-width="4" opacity=".6"/>` +
      `<circle cx="244" cy="160" r="10" fill="${d}" opacity=".5"/>`;
  },
  watch(c) {
    const d = shade(c, -0.3), l = shade(c, 0.45);
    return shadow(200, 352, 80, 10) +
      `<rect x="160" y="40" width="80" height="320" rx="30" fill="${c}"/>` +
      `<path d="M172 80h56M172 100h56M172 300h56M172 320h56" stroke="${d}" stroke-width="4" opacity=".5"/>` +
      `<circle cx="200" cy="200" r="86" fill="#D9D6E0"/><circle cx="200" cy="200" r="76" fill="${INK}"/>` +
      `<circle cx="200" cy="200" r="68" fill="${l}"/>` +
      `<path d="M200 200V152M200 200l32 18" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` +
      `<circle cx="200" cy="200" r="7" fill="${INK}"/><rect x="284" y="190" width="14" height="20" rx="4" fill="#D9D6E0"/>`;
  },
  moka(c) {
    const d = shade(c, -0.3), l = shade(c, 0.4);
    return shadow(200, 344, 100, 12) +
      `<path d="M136 196h128l20 140H116z" fill="${c}"/>` +
      `<path d="M128 182h144v18H128z" fill="${d}"/>` +
      `<path d="M140 56h120l14 126H126z" fill="${c}"/>` +
      `<path d="M140 56h120l-16-10h-88z" fill="${d}"/>` +
      `<path d="M126 70l-34 12 6 16 32-6" fill="${d}"/>` +
      `<path d="M274 80c40 0 50 70 6 80" fill="none" stroke="${INK}" stroke-width="16" stroke-linecap="round"/>` +
      `<path d="M156 74v94M146 214l-12 104" stroke="${l}" stroke-width="10" stroke-linecap="round" opacity=".6"/>`;
  },
  sunglasses(c) {
    const d = shade(c, -0.35), l = shade(c, 0.3);
    return shadow(200, 300, 130, 10) +
      `<path d="M40 178h320" stroke="${INK}" stroke-width="12" stroke-linecap="round"/>` +
      `<path d="M52 176h124c0 50-20 86-62 86s-62-36-62-86z" fill="${c}"/>` +
      `<path d="M224 176h124c0 50-20 86-62 86s-62-36-62-86z" fill="${c}"/>` +
      `<path d="M176 182c12-12 36-12 48 0" fill="none" stroke="${INK}" stroke-width="10"/>` +
      `<path d="M74 194c10 30 30 44 52 46M246 194c10 30 30 44 52 46" stroke="${l}" stroke-width="8" stroke-linecap="round" fill="none" opacity=".7"/>` +
      `<path d="M52 176h124M224 176h124" stroke="${d}" stroke-width="8"/>`;
  },
  bottle(c) {
    const d = shade(c, -0.28), l = shade(c, 0.45);
    return shadow(200, 352, 76, 10) +
      `<rect x="176" y="30" width="48" height="40" rx="10" fill="${INK}"/>` +
      `<path d="M226 44c26 0 30 34 4 36" fill="none" stroke="${INK}" stroke-width="8"/>` +
      `<path d="M168 70h64v24c26 10 38 30 38 56v176c0 14-10 24-24 24h-92c-14 0-24-10-24-24V150c0-26 12-46 38-56z" fill="${c}"/>` +
      `<rect x="130" y="186" width="140" height="78" fill="${d}"/>` +
      `<rect x="146" y="120" width="14" height="190" rx="7" fill="${l}" opacity=".55"/>`;
  },
  lamp(c) {
    const d = shade(c, -0.28);
    return shadow(200, 346, 100, 12) +
      `<rect x="122" y="318" width="156" height="24" rx="12" fill="${d}"/>` +
      `<path d="M200 318L150 196l90-90" fill="none" stroke="${INK}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<circle cx="150" cy="196" r="12" fill="${INK}"/><circle cx="240" cy="106" r="12" fill="${INK}"/>` +
      `<path d="M236 88l66-30 46 100-70 18z" fill="${c}"/>` +
      `<path d="M278 176l70-18" stroke="${d}" stroke-width="10" stroke-linecap="round"/>` +
      `<path d="M300 186l18 40M326 178l30 32" stroke="#FFC94D" stroke-width="8" stroke-linecap="round" opacity=".8"/>`;
  },
};

/**
 * One product image. view 1 = catalogue shot on white, 2 = on a tinted backdrop,
 * 3 = close-up crop.
 */
export function productSVG(type, color, view = 1) {
  const fit = { sneakers: 'translate(-20 -48) scale(1.1)', sunglasses: 'translate(-20 -10) scale(1.1)' }[type];
  const body = fit ? `<g transform="${fit}">${art[type](color)}</g>` : art[type](color);
  const bg = view === 2 ? shade(color, 0.86) : '#FFFFFF';
  const vb = view === 3 ? '60 60 280 280' : '0 0 400 400';
  const flip = view === 2 ? `<g transform="translate(400 0) scale(-1 1)">${body}</g>` : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="800" height="800"><rect x="0" y="0" width="400" height="400" fill="${bg}"/>${flip}</svg>`;
}

export const ART_TYPES = Object.keys(art);
