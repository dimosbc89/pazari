// Reads product feeds: XML (Google Merchant Center RSS/Atom, Skroutz, BestPrice and
// most custom shop feeds) and delimited text (TSV/CSV with a header row).
// Fields are found by name, so one reader covers all of them.
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { fetchText, type FetchOptions } from './fetch.ts';
import { decodeEntities, money, stripHtml } from './text.ts';
import { SyncError, type SourceItem, type SourceResult } from './types.ts';

/** Accepted names for each field, lowercase, without namespace prefix. First match wins. */
const FIELDS = {
  id: ['id', 'productid', 'product_id', 'uniqueid', 'unique_id', 'item_id', 'sku', 'code', 'uid'],
  group: ['item_group_id', 'group_id', 'parent_id', 'parentid', 'item_group'],
  title: ['title', 'name', 'product_name', 'productname'],
  link: ['link', 'url', 'producturl', 'product_url', 'product_link', 'productlink'],
  image: ['image_link', 'image', 'imageurl', 'image_url', 'mainimage', 'main_image', 'picture', 'thumbnail'],
  images: ['additional_image_link', 'additionalimage', 'additional_image', 'additional_images', 'imagesurl', 'images', 'gallery', 'additional_imageurl'],
  price: ['price_with_vat', 'price', 'final_price', 'retail_price', 'regular_price'],
  sale: ['sale_price', 'special_price', 'offer_price', 'discount_price'],
  brand: ['brand', 'manufacturer', 'vendor', 'make'],
  mpn: ['mpn', 'isbn', 'manufacturer_code', 'part_number', 'model'],
  gtin: ['gtin', 'ean', 'barcode', 'upc', 'ean13'],
  category: ['google_product_category', 'product_type', 'category_path', 'categorypath', 'category', 'categories', 'category_name'],
  availability: ['availability', 'stock_status', 'instock', 'in_stock', 'stock', 'available'],
  quantity: ['quantity', 'qty', 'stock_quantity', 'inventory'],
  color: ['color', 'colour', 'χρώμα', 'χρωμα'],
  size: ['size', 'sizes', 'μέγεθος', 'μεγεθος'],
  description: ['description', 'short_description', 'details', 'desc'],
  shipping: ['shipping', 'shipping_cost', 'shippingcost', 'delivery_cost', 'shipping_price', 'shipping_costs'],
} as const;

type Raw = Record<string, unknown>;
type FeedProfile = 'default' | 'ellinoekdotiki' | 'toofast' | 'mypharmacy';
const ITEM_TAGS = new Set(['item', 'entry', 'product', 'offer']);
const MULTI_TAGS = new Set(['additional_image_link', 'additionalimage', 'shipping', 'image']);

/** Text of a parsed XML value (string, number, {#text}, or the first of an array). */
function text(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object') {
    const o = v as Raw;
    if ('#text' in o) return text(o['#text']);
    if ('price' in o) return text(o.price); // <g:shipping><g:price>
    if ('value' in o) return text(o.value);
    return undefined;
  }
  const s = decodeEntities(String(v)).trim();
  return s || undefined;
}

function texts(v: unknown): string[] {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr.flatMap((x) => {
    if (x && typeof x === 'object' && !('#text' in (x as Raw))) {
      // <images><image>…</image></images>
      return Object.values(x as Raw).flatMap(texts);
    }
    const t = text(x);
    return t ? t.split(/[,|\s]+(?=https?:\/\/)/) : [];
  });
}

function pick(item: Raw, names: readonly string[]): unknown {
  for (const n of names) if (item[n] !== undefined && item[n] !== '') return item[n];
  return undefined;
}

const OUT = /out[ _-]?of[ _-]?stock|back[ _-]?order|^(no|n|0|false|out)$|εξαντλ|μη διαθέσιμ|μη διαθεσιμ|κατ[οό]πιν\s+παραγγελ[ιί]ας|αναμ[εέ]νεται|not available|unavailable|discontinued|sold ?out/i;

function inStock(item: Raw): boolean {
  for (const name of FIELDS.availability) {
    const v = text(item[name]);
    if (v !== undefined && OUT.test(v)) return false;
  }
  const q = text(pick(item, FIELDS.quantity));
  return !(q !== undefined && /^\d+$/.test(q) && Number(q) === 0);
}

function category(item: Raw, profile: FeedProfile): string | undefined {
  const names = profile === 'toofast' ? [...FIELDS.category, 'cat_list'] : FIELDS.category;
  for (const name of names) {
    const v = text(item[name]);
    if (!v || /^\d+$/.test(v)) continue; // Google category ids are numbers: not useful as a label
    const last = v.split(/\s*(?:>|\/|\|)\s*/).filter(Boolean).pop();
    if (last) return last;
  }
  return undefined;
}

/** Lowercases keys so <Price>, <PRICE> and <g:price> all read as "price". */
function lowerKeys(o: Raw): Raw {
  const out: Raw = {};
  for (const [k, v] of Object.entries(o)) out[k.toLowerCase()] = v;
  return out;
}

function toItem(rawItem: Raw, profile: FeedProfile = 'default'): SourceItem {
  const it = lowerKeys(rawItem);
  const priceNames = profile === 'mypharmacy' ? [...FIELDS.price, 'pricevat'] : FIELDS.price;
  const price = money(text(pick(it, priceNames)));
  const saleText = text(pick(it, FIELDS.sale));
  let sale = money(saleText);
  if (profile === 'ellinoekdotiki' && it.discount !== undefined) {
    const value = text(it.discount);
    const discount = value === undefined ? NaN : Number(value);
    if (!value || !/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value) || !Number.isFinite(discount) || discount < 0 || discount >= 1) {
      throw new SyncError('bad_format', 'The feed contains an invalid fractional discount.');
    }
    if (saleText === undefined && price !== undefined) {
      // Correct binary rounding at half-cents (e.g. 9.45 × 0.9 = 8.505 → 8.51).
      sale = Math.round((price * (1 - discount) + Number.EPSILON * price) * 100) / 100;
    }
  }
  const discounted = sale !== undefined && price !== undefined && sale > 0 && sale < price;
  const desc = text(pick(it, FIELDS.description));
  const primaryImages = texts(pick(it, FIELDS.image));
  const additionalImages = FIELDS.images.flatMap((name) => texts(it[name]));
  // Some feeds only provide <images><image>…</image></images>.
  const image = primaryImages[0] ?? additionalImages[0];
  const images = [...new Set([...additionalImages, ...primaryImages.slice(1)])];
  // Repeated <size> elements may start with an empty placeholder.
  const sizes = [...new Set(texts(pick(it, FIELDS.size)))];
  return {
    id: text(pick(it, FIELDS.id)) ?? (profile === 'toofast' ? text(it.item) : undefined) ?? text(it['@_id']) ?? '',
    groupId: text(pick(it, FIELDS.group)),
    title: text(pick(it, FIELDS.title)) ?? (profile === 'toofast' ? text(it.model) : undefined),
    description: desc ? stripHtml(desc) : undefined,
    url: text(pick(it, FIELDS.link)),
    image,
    images: images.filter((u) => u !== image),
    price: discounted ? sale : price,
    oldPrice: discounted ? price : undefined,
    shipping: money(text(pick(it, FIELDS.shipping))),
    brand: text(pick(it, FIELDS.brand)),
    category: category(it, profile),
    color: text(pick(it, FIELDS.color)),
    size: sizes.length ? sizes.join(', ') : undefined,
    mpn: text(pick(it, FIELDS.mpn)),
    gtin: text(pick(it, FIELDS.gtin)),
    inStock: inStock(it),
  };
}

/** Finds the list of products: the largest array of objects that look like products. */
function findItems(node: unknown, depth = 0): Raw[] {
  if (!node || typeof node !== 'object' || depth > 6) return [];
  let best: Raw[] = [];
  for (const [key, v] of Object.entries(node as Raw)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object' && (ITEM_TAGS.has(key.toLowerCase()) || looksLikeProduct(v[0] as Raw))) {
      if (v.length > best.length) best = v as Raw[];
    } else if (v && typeof v === 'object') {
      const inner = findItems(v, depth + 1);
      if (inner.length > best.length) best = inner;
    }
  }
  return best;
}

function looksLikeProduct(o: Raw): boolean {
  const it = lowerKeys(o);
  return pick(it, FIELDS.title) !== undefined && (pick(it, FIELDS.price) !== undefined || pick(it, FIELDS.link) !== undefined);
}

function formatOf(root: Raw): string {
  const keys = Object.keys(root).map((k) => k.toLowerCase());
  if (keys.includes('rss') || keys.includes('feed')) return 'google';
  if (keys.includes('mywebstore')) return 'skroutz';
  if (keys.includes('store')) return 'bestprice';
  return 'xml';
}

/** Only apply retailer-specific meanings to their exact feed endpoint. */
function profileOf(sourceUrl?: string): FeedProfile {
  if (!sourceUrl) return 'default';
  try {
    const url = new URL(sourceUrl);
    const path = url.pathname.replace(/\/+$/, '');
    if (['ellinoekdotiki.gr', 'www.ellinoekdotiki.gr'].includes(url.hostname) && path === '/export/feed') return 'ellinoekdotiki';
    if (['toofast.gr', 'www.toofast.gr'].includes(url.hostname) && path === '/xml/skroutz.xml') return 'toofast';
    if (['mypharmacy.gr', 'www.mypharmacy.gr'].includes(url.hostname) && path === '/skroutz.xml') return 'mypharmacy';
  } catch {
    // A standalone parser call without a valid source URL uses the generic fields.
  }
  return 'default';
}

export function parseXml(xml: string, sourceUrl?: string): { format: string; items: SourceItem[] } {
  // XMLParser is tolerant by default; never sync a partially parsed broken feed.
  if (XMLValidator.validate(xml) !== true) throw new SyncError('bad_format', 'The file is not valid XML.');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: true,
    isArray: (name) => ITEM_TAGS.has(name.toLowerCase()) || MULTI_TAGS.has(name.toLowerCase()),
  });
  let root: Raw;
  try {
    root = parser.parse(xml) as Raw;
  } catch {
    throw new SyncError('bad_format', 'The file is not valid XML.');
  }
  const raw = findItems(root);
  const profile = profileOf(sourceUrl);
  return { format: formatOf(root), items: raw.map((item) => toItem(item, profile)) };
}

/** Splits delimited text, honouring quotes ("a, b"). */
function splitRows(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export function parseDelimited(text: string): { format: string; items: SourceItem[] } {
  const first = text.slice(0, text.indexOf('\n') === -1 ? undefined : text.indexOf('\n'));
  const delim = ['\t', ';', '|', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const [head, ...rows] = splitRows(text.replace(/^\uFEFF/, ''), delim);
  if (!head || head.length < 2) throw new SyncError('bad_format', 'The file has no header row.');
  const cols = head.map((c) => c.trim().toLowerCase().replace(/^g:/, '').replace(/\s+/g, '_'));
  const items = rows.map((r) => toItem(Object.fromEntries(cols.map((c, i) => [c, r[i]?.trim() ?? '']))));
  return { format: delim === '\t' ? 'tsv' : 'csv', items };
}

export async function readFeed(url: string, opts: FetchOptions): Promise<SourceResult> {
  const body = await fetchText(url, opts);
  const trimmed = body.trimStart();
  if (!trimmed) throw new SyncError('empty', 'The file is empty.');
  if (/^<!doctype html|^<html/i.test(trimmed)) throw new SyncError('not_a_feed', 'This address is a web page, not a product feed.');
  const parsed = trimmed.startsWith('<') ? parseXml(trimmed, url) : parseDelimited(trimmed);
  if (!parsed.items.length) throw new SyncError('no_products', 'No products were found in the file.');
  return { ...parsed, truncated: false };
}
