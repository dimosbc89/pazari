import type { FetchOptions } from './fetch.ts';
import { readFeed } from './feed.ts';
import { normalize } from './normalize.ts';
import { readShopify } from './shopify.ts';
import { readWooCommerce } from './woocommerce.ts';
import type { ShopConfig, SourceResult, SourceType, SyncReport } from './types.ts';

export * from './types.ts';
export { checkUrl } from './fetch.ts';
export { typesenseClient } from './typesense.ts';
export { matchKeyOf } from './normalize.ts';

export function readSource(type: SourceType, url: string, opts: FetchOptions = {}): Promise<SourceResult> {
  switch (type) {
    case 'shopify': return readShopify(url, opts);
    case 'woocommerce': return readWooCommerce(url, opts);
    default: return readFeed(url, opts);
  }
}

/** Reads a shop's source and checks every product. Does not write anywhere. */
export async function buildReport(shop: ShopConfig, syncId: string, opts: FetchOptions = {}): Promise<SyncReport> {
  return normalize(await readSource(shop.sourceType, shop.sourceUrl, opts), shop, syncId);
}
