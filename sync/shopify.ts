// Reads a Shopify store's public product list (/products.json). Nothing to install.
// Limits: no delivery costs, usually no barcodes; some stores switch the endpoint off.
import { checkUrl, fetchJson, type FetchOptions } from './fetch.ts';
import { decodeEntities, stripHtml } from './text.ts';
import { SyncError, type SourceItem, type SourceResult } from './types.ts';

interface ShopifyVariant {
  id: number; title: string; option1?: string | null; option2?: string | null; option3?: string | null;
  sku?: string | null; barcode?: string | null; available?: boolean; price: string; compare_at_price?: string | null;
  featured_image?: { src: string } | null;
}
interface ShopifyProduct {
  id: number; title: string; handle: string; body_html?: string | null; vendor?: string; product_type?: string;
  options?: { name: string; position: number }[]; variants: ShopifyVariant[]; images?: { src: string }[];
}

const COLOR = /colou?r|χρώμα|χρωμα|farbe|couleur/i;
const SIZE = /size|μέγεθος|μεγεθος|νούμερο|νουμερο|taglia|größe/i;
const MAX_PAGES = 100; // 250 x 100 = 25,000 products, the endpoint's own ceiling

export async function readShopify(shopUrl: string, opts: FetchOptions): Promise<SourceResult> {
  const base = checkUrl(shopUrl, opts).origin;
  const items: SourceItem[] = [];
  let page = 1;
  for (; page <= MAX_PAGES; page++) {
    const { data, status } = await fetchJson<{ products?: ShopifyProduct[] }>(`${base}/products.json?limit=250&page=${page}`, opts);
    if (!data || !Array.isArray(data.products)) {
      if (page === 1) {
        throw new SyncError('not_shopify', status === 404 || status === 401 || status === 403
          ? 'This store does not share its product list. Use an XML feed instead.'
          : 'This does not look like a Shopify store (no /products.json).');
      }
      break;
    }
    if (data.products.length === 0) break;
    for (const p of data.products) items.push(...toItems(p, base));
    if (data.products.length < 250) break;
  }
  return { format: 'shopify', items, truncated: page > MAX_PAGES };
}

function toItems(p: ShopifyProduct, base: string): SourceItem[] {
  const opt = (re: RegExp) => p.options?.find((o) => re.test(o.name))?.position;
  const colorPos = opt(COLOR);
  const sizePos = opt(SIZE);
  const description = p.body_html ? stripHtml(p.body_html) : undefined;
  const allImages = (p.images ?? []).map((i) => i.src);
  const value = (v: ShopifyVariant, pos?: number) => (pos ? (v[`option${pos}` as 'option1'] ?? undefined) || undefined : undefined);
  return p.variants.map((v) => {
    const price = parseFloat(v.price);
    const compare = v.compare_at_price ? parseFloat(v.compare_at_price) : NaN;
    const image = v.featured_image?.src ?? allImages[0];
    const hasOptions = v.title && v.title !== 'Default Title';
    const named = colorPos || sizePos;
    return {
      id: `${p.id}-${v.id}`,
      groupId: String(p.id),
      title: decodeEntities(hasOptions && !named ? `${p.title} – ${v.title}` : p.title),
      description,
      url: `${base}/products/${p.handle}${p.variants.length > 1 ? `?variant=${v.id}` : ''}`,
      image,
      images: allImages.filter((s) => s !== image).slice(0, 6),
      price: Number.isFinite(price) ? price : undefined,
      oldPrice: compare > price ? compare : undefined,
      brand: p.vendor || undefined,
      category: p.product_type || undefined,
      color: value(v, colorPos),
      size: value(v, sizePos),
      gtin: v.barcode || undefined,
      inStock: v.available !== false,
    };
  });
}
