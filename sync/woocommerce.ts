// Reads a WooCommerce shop through its public Store API (/wp-json/wc/store/v1/products).
// Built into WooCommerce, no keys or plugin needed. One offer per product (variable
// products show their lowest price). Limits: no delivery costs, no barcodes.
import { checkUrl, fetchJson, type FetchOptions } from './fetch.ts';
import { decodeEntities, stripHtml } from './text.ts';
import { SyncError, type SourceItem, type SourceResult } from './types.ts';

interface WooTerm { name: string }
interface WooProduct {
  id: number; name: string; permalink: string; sku?: string; type?: string;
  short_description?: string; description?: string;
  prices: { price: string; regular_price: string; sale_price: string; currency_minor_unit: number; currency_code?: string };
  images?: { src: string }[];
  categories?: WooTerm[];
  brands?: WooTerm[];
  attributes?: { name: string; terms: WooTerm[] }[];
  is_in_stock?: boolean;
  is_purchasable?: boolean;
}

const MAX_PAGES = 300; // 100 per page
const COLOR = /colou?r|χρώμα|χρωμα/i;
const SIZE = /size|μέγεθος|μεγεθος|νούμερο|νουμερο/i;
const BRAND = /brand|μάρκα|μαρκα|κατασκευαστ|manufacturer/i;

/** The Store API sits at the WordPress root; try it, a subfolder, and the no-permalinks form. */
function candidates(u: URL): string[] {
  const path = u.pathname.replace(/\/(wp-json|shop|product|products|κατάστημα)(\/.*)?$/i, '').replace(/\/$/, '');
  const roots = [...new Set([u.origin, `${u.origin}${path}`])];
  return roots.flatMap((r) => [`${r}/wp-json/wc/store/v1/products?per_page=100`, `${r}/?rest_route=/wc/store/v1/products&per_page=100`]);
}

export async function readWooCommerce(shopUrl: string, opts: FetchOptions): Promise<SourceResult> {
  const u = checkUrl(shopUrl, opts);
  let endpoint: string | null = null;
  let first: WooProduct[] = [];
  let totalPages = 1;
  for (const c of candidates(u)) {
    const { data, headers } = await fetchJson<WooProduct[]>(`${c}&page=1`, opts);
    if (Array.isArray(data)) {
      endpoint = c;
      first = data;
      totalPages = Number(headers.get('x-wp-totalpages') || 1);
      break;
    }
  }
  if (!endpoint) throw new SyncError('not_woocommerce', 'This does not look like a WooCommerce shop, or its Store API is switched off. Use an XML feed instead.');

  const items: SourceItem[] = first.map(toItem);
  const last = Math.min(totalPages, MAX_PAGES);
  for (let page = 2; page <= last; page++) {
    const { data } = await fetchJson<WooProduct[]>(`${endpoint}&page=${page}`, opts);
    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data.map(toItem));
  }
  return { format: 'woocommerce', items, truncated: totalPages > MAX_PAGES };
}

function toItem(p: WooProduct): SourceItem {
  const unit = 10 ** (p.prices?.currency_minor_unit ?? 2);
  const price = Number(p.prices?.price) / unit;
  const regular = Number(p.prices?.regular_price) / unit;
  const attr = (re: RegExp) => {
    const a = p.attributes?.find((x) => re.test(x.name));
    return a && a.terms?.length === 1 ? decodeEntities(a.terms[0].name) : undefined;
  };
  const images = (p.images ?? []).map((i) => i.src);
  const desc = p.description || p.short_description;
  return {
    id: String(p.id),
    title: decodeEntities(p.name ?? ''),
    description: desc ? stripHtml(desc) : undefined,
    url: p.permalink,
    image: images[0],
    images: images.slice(1, 7),
    price: Number.isFinite(price) && price > 0 ? price : undefined,
    oldPrice: regular > price ? regular : undefined,
    brand: p.brands?.[0]?.name ? decodeEntities(p.brands[0].name) : attr(BRAND),
    category: p.categories?.length ? decodeEntities(p.categories[p.categories.length - 1].name) : undefined,
    color: attr(COLOR),
    size: attr(SIZE),
    mpn: undefined,
    inStock: p.is_in_stock !== false,
  };
}
