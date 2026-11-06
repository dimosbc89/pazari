import type { Localized, Product } from '../src/search/types.ts';

const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const texts = (value: Localized | undefined): string[] =>
  typeof value === 'string' ? [value] : value ? Object.values(value).filter((s): s is string => typeof s === 'string' && !!s.trim()) : [];
const hasSize = (product: Product) => texts(product.size).some((value) => !!value.trim());

function sizeToken(raw: string): string | undefined {
  let value = raw.replace(/[⅓⅔½]/g, (c) => ({ '⅓': ' 1/3', '⅔': ' 2/3', '½': ' 1/2' })[c]!)
    .replace(/⁄/g, '/').normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
  if (/^(?:OS|ONESIZE|ONE[ -]SIZE|ΕΝΑ ΜΕΓΕΘΟΣ)$/u.test(value)) return 'ONE SIZE';
  if (/^[23]XL$/.test(value)) value = `${'X'.repeat(Number(value[0]))}L`;
  if (/^(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL)$/.test(value)) return value;
  if (/^\d{1,3}(?: [12]\/3| 1\/2)$/.test(value)) return value;
  if (/^\d{1,3}(?:\.\d+)?$/.test(value)) return String(Number(value));
  // Keep capacity/length sizes usable without guessing conversions between sizing systems.
  const dimension = value.match(/^(\d+(?:\.\d+)?)\s*(ML|L|G|KG|CM|MM|GB|TB)$/);
  if (dimension) return `${Number(dimension[1])} ${dimension[2]}`;
  return undefined;
}

function parseSizes(raw: string): string[] {
  // Source size fields are truncated at 40 characters; their tail cannot prove availability.
  if (!raw.trim() || raw.length >= 40 || /[\u0000-\u001f\u007f]/.test(raw)) return [];
  // A lone decimal comma is indistinguishable from a list of two numeric sizes.
  if (/^\s*\d{1,3},\d\s*$/.test(raw)) return [];
  const parts = raw.split(/[,;|]/);
  const options = parts.map(sizeToken);
  if (options.some((value) => value === undefined)) return [];
  return [...new Set(options as string[])];
}

/** Exact advertised size tokens. Unknown, conflicting localized, or truncated lists fail closed. */
export function sizeOptions(product: Product): string[] {
  const values = texts(product.size);
  if (!values.length) return [];
  const parsed = values.map(parseSizes);
  const signature = (options: string[]) => JSON.stringify([...options].sort());
  if (parsed.some((options) => !options.length || signature(options) !== signature(parsed[0]))) return [];
  return parsed[0];
}

/** Only an absent request may default to the product's single size. */
export function selectedProductSize(product: Product, requested?: string): string | undefined {
  const options = sizeOptions(product);
  if (requested === undefined) return options.length === 1 ? options[0] : undefined;
  const selected = sizeToken(requested);
  return selected && options.includes(selected) ? selected : undefined;
}

function validGtin(value: string | undefined): string | undefined {
  if (!value || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value.trim()) || /^0+$/.test(value.trim())) return undefined;
  const digits = value.trim();
  const checksum = [...digits.slice(0, -1)].reverse().reduce((sum, digit, i) => sum + Number(digit) * (i % 2 === 0 ? 3 : 1), 0);
  if ((checksum + Number(digits.at(-1))) % 10 !== 0) return undefined;
  return digits.padStart(14, '0');
}

const PLACEHOLDER_BRANDS = new Set(['', 'oem', 'unknown', 'unbranded', 'generic', 'other', 'n/a', 'no brand', 'αγνωστο', 'χωρις μαρκα']);
function brandOf(product: Product): string | undefined {
  const value = fold(product.brand);
  if (PLACEHOLDER_BRANDS.has(value) || value === fold(product.shop)) return undefined;
  return value.replace(/[\s._-]+/g, '');
}

const COLORS: Record<string, string> = {
  λευκο: 'white', ασπρο: 'white', μαυρο: 'black', μπλε: 'blue', κοκκινο: 'red', πρασινο: 'green',
  κιτρινο: 'yellow', ροζ: 'pink', μωβ: 'purple', πορτοκαλι: 'orange', γκρι: 'grey', gray: 'grey',
  μπεζ: 'beige', καφε: 'brown', χρυσο: 'gold', ασημι: 'silver', πολυχρωμο: 'multicolor', multicolour: 'multicolor',
};
function colorOf(product: Product): string | undefined {
  if (!product.color) return undefined;
  const value = fold(product.color);
  if (['', 'unknown', 'n/a', 'other', 'αγνωστο'].includes(value)) return undefined;
  return value.split(/\s*[,/|+-]\s*/).map((part) => Object.hasOwn(COLORS, part) ? COLORS[part] : part).sort().join('|');
}

function capacityOf(value: string): string {
  const capacities: string[] = [];
  const units: Record<string, [string, number]> = {
    ml: ['ml', 1], μλ: ['ml', 1], cl: ['ml', 10], dl: ['ml', 100], l: ['ml', 1000], lt: ['ml', 1000],
    mg: ['g', 0.001], g: ['g', 1], gr: ['g', 1], γρ: ['g', 1], kg: ['g', 1000],
    gb: ['gb', 1], tb: ['gb', 1000], cm: ['cm', 1], mm: ['cm', 0.1],
    τμχ: ['pieces', 1], τεμ: ['pieces', 1], τεμαχια: ['pieces', 1], pcs: ['pieces', 1],
  };
  const normalized = fold(value);
  const pattern = /(?:^|[^\p{L}\p{N}])(?:(\d+)\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(ml|μλ|cl|dl|kg|mg|gr|γρ|gb|tb|cm|mm|lt|g|l|τμχ|τεμαχια|τεμ|pcs)(?=$|[^\p{L}])/gu;
  for (const match of normalized.matchAll(pattern)) {
    const [unit, factor] = units[match[3]];
    const amount = Number(match[2].replace(',', '.')) * factor;
    capacities.push(`${unit}:${Number(amount.toFixed(6))}${match[1] ? `x${Number(match[1])}` : ''}`);
  }
  for (const match of normalized.matchAll(/\b(?:spf|sfp)\s*(\d+)/g)) capacities.push(`spf:${Number(match[1])}`);
  return capacities.sort().join('|');
}

function capacitiesConflict(reference: Product, offer: Product): boolean {
  // Use product titles, not descriptions that may mention usage quantities or other products.
  const signatures = (product: Product) => [...new Set(texts(product.title).map(capacityOf).filter(Boolean))];
  const a = signatures(reference), b = signatures(offer);
  if (a.length > 1 || b.length > 1) return true;
  if (!a.length || !b.length) return false;
  // Missing attributes are unknown; compare only unit families explicitly present on both sides.
  const byUnit = (signature: string) => {
    const result = new Map<string, string[]>();
    for (const part of signature.split('|')) {
      const unit = part.split(':')[0];
      result.set(unit, [...(result.get(unit) ?? []), part]);
    }
    return result;
  };
  const x = byUnit(a[0]), y = byUnit(b[0]);
  const physical = (units: Map<string, string[]>) => [...units.keys()].filter((unit) => unit !== 'spf').sort().join('|');
  // Mass and volume cannot be equated without product-specific evidence (e.g. a 9g stick versus 50ml).
  if (physical(x) && physical(y) && physical(x) !== physical(y)) return true;
  return [...x].some(([unit, amounts]) => y.has(unit) && JSON.stringify(amounts) !== JSON.stringify(y.get(unit)));
}

function sameIdentity(reference: Product, offer: Product): boolean {
  const aBrand = brandOf(reference), bBrand = brandOf(offer);
  if (aBrand && bBrand && aBrand !== bBrand) return false;
  const aGtin = validGtin(reference.gtin), bGtin = validGtin(offer.gtin);
  let same = !!aGtin && !!bGtin && aGtin === bGtin;
  if (aGtin && bGtin && !same) return false;
  if (!same) {
    // Bare MPNs and lossy match-key slugs alone are not product evidence.
    const key = reference.matchKey;
    const aMpn = reference.mpn?.normalize('NFKC').trim().toUpperCase();
    const bMpn = offer.mpn?.normalize('NFKC').trim().toUpperCase();
    same = !!key && /^mpn:[^:]+:[^:]+$/.test(key) && offer.matchKey === key && !!aBrand && aBrand === bBrand
      && !!aMpn && aMpn.length >= 3 && aMpn === bMpn;
  }
  if (!same) return false;
  const aColor = colorOf(reference), bColor = colorOf(offer);
  return !(aColor && bColor && aColor !== bColor) && !capacitiesConflict(reference, offer);
}

/** Filter already-listed candidates without changing their existing price order or adding rows. */
export function matchingOffers(reference: Product, offers: Product[], requestedSize?: string): Product[] {
  const selected = selectedProductSize(reference, requestedSize);
  if (requestedSize !== undefined && selected === undefined) return [];
  const referenceHasSize = hasSize(reference);
  return offers.filter((offer) => {
    const self = offer.id === reference.id;
    if (referenceHasSize && selected === undefined) return self;
    if (selected !== undefined && !sizeOptions(offer).includes(selected)) return false;
    if (selected === undefined && hasSize(offer)) return false;
    return self || sameIdentity(reference, offer);
  });
}
