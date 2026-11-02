// Turns source items into Tagora products: checks each one, fills defaults and
// counts problems so the shop can fix its data.
import { isHttpUrl, slug, summaryOf, toParagraphs } from './text.ts';
import { SKIP_CODES, type Issue, type IssueCode, type Product, type ShopConfig, type SourceResult, type SyncReport } from './types.ts';

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Key that says "same product" across shops: the barcode when there is one,
 * otherwise brand + manufacturer part number. Shop SKUs are never used.
 */
export function matchKeyOf(gtin?: string, mpn?: string, brand?: string): string | undefined {
  const digits = gtin?.replace(/\D/g, '');
  if (digits && digits.length >= 8 && !/^0+$/.test(digits)) return `gtin:${digits.replace(/^0+/, '')}`;
  if (mpn && brand && mpn.trim().length >= 3) return `mpn:${slug(brand)}:${slug(mpn)}`;
  return undefined;
}

export function discountBucket(pct: number): string | undefined {
  if (pct <= 0) return undefined;
  return pct < 20 ? 'upto20' : pct < 35 ? '20to35' : '35plus';
}

export function normalize(source: SourceResult, shop: ShopConfig, syncId: string): SyncReport {
  const issues = new Map<IssueCode, Issue>();
  const note = (code: IssueCode, example: string) => {
    const i = issues.get(code) ?? { code, count: 0, examples: [] };
    i.count++;
    if (i.examples.length < 5 && example) i.examples.push(example.slice(0, 90));
    issues.set(code, i);
  };

  const products: Product[] = [];
  const seen = new Set<string>();
  const rankInGroup = new Map<string, number>();
  let skipped = 0;

  for (const it of source.items) {
    const label = it.title || it.id || it.url || '';
    const skip = (code: IssueCode) => { note(code, label); skipped++; };
    if (!it.id) { skip('missing_id'); continue; }
    if (!it.title) { skip('missing_title'); continue; }
    if (!it.price || it.price <= 0) { skip('missing_price'); continue; }
    if (!isHttpUrl(it.url)) { skip('missing_link'); continue; }
    if (!it.inStock) { skip('out_of_stock'); continue; }
    const id = `${shop.id}-${slug(it.id)}`;
    if (seen.has(id)) { skip('duplicate_id'); continue; }
    seen.add(id);

    if (!isHttpUrl(it.image)) note('missing_image', label);
    if (!it.brand) note('missing_brand', label);
    const brand = it.brand || shop.name;
    const matchKey = matchKeyOf(it.gtin, it.mpn, it.brand);
    if (!matchKey) note('missing_identifier', label);

    const groupId = `${shop.id}-${slug(it.groupId || it.id)}`;
    const rank = rankInGroup.get(groupId) ?? 0;
    rankInGroup.set(groupId, rank + 1);

    const price = round(it.price);
    const oldPrice = it.oldPrice && it.oldPrice > price ? round(it.oldPrice) : undefined;
    const pct = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
    let shipping = it.shipping;
    if (shipping === undefined && shop.defaultShipping != null) {
      shipping = shop.freeShippingOver != null && price >= shop.freeShippingOver ? 0 : shop.defaultShipping;
    }

    const p: Product = {
      id,
      groupId,
      title: it.title.slice(0, 200),
      brand: brand.slice(0, 80),
      url: it.url!,
      image: isHttpUrl(it.image) ? it.image! : '',
      images: (it.images ?? []).filter(isHttpUrl).slice(0, 6),
      price,
      shop: shop.name,
      shopId: shop.id,
      syncId,
      category: (it.category || 'other').slice(0, 80),
      countries: shop.countries,
      discountPct: pct,
      rank,
    };
    const summary = it.description ? summaryOf(it.description) : undefined;
    if (summary) p.summary = summary;
    if (it.description) p.description = toParagraphs(it.description);
    if (oldPrice) p.oldPrice = oldPrice;
    if (shipping !== undefined) p.shipping = round(shipping);
    if (it.color) p.color = it.color.slice(0, 40);
    if (it.size) p.size = it.size.slice(0, 40);
    if (it.mpn) p.mpn = it.mpn.slice(0, 60);
    if (it.gtin) p.gtin = it.gtin.slice(0, 20);
    if (matchKey) p.matchKey = matchKey;
    const bucket = discountBucket(pct);
    if (bucket) p.discount = bucket;
    products.push(p);
  }

  if (source.truncated) note('truncated', '');
  const order = (c: IssueCode) => (SKIP_CODES.includes(c) ? 0 : 1);
  return {
    format: source.format,
    found: source.items.length,
    products,
    skipped,
    issues: [...issues.values()].sort((a, b) => order(a.code) - order(b.code) || b.count - a.count),
  };
}
