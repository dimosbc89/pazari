import type { FetchOptions } from './fetch.ts';
import { readFeed } from './feed.ts';
import { normalize } from './normalize.ts';
import { readShopify } from './shopify.ts';
import { readWooCommerce } from './woocommerce.ts';
import { SyncError, type ShopConfig, type SourceResult, type SourceType, type SyncReport } from './types.ts';

export * from './types.ts';
export { checkUrl } from './fetch.ts';
export { typesenseClient } from './typesense.ts';
export { matchKeyOf, normalize } from './normalize.ts';
export { adminProductItems, type AdminProduct, type AdminVariant } from './shopify.ts';

export function readSource(type: SourceType, url: string, opts: FetchOptions = {}): Promise<SourceResult> {
  switch (type) {
    case 'shopify': return readShopify(url, opts);
    case 'woocommerce': return readWooCommerce(url, opts);
    case 'plugin': throw new SyncError('plugin_source', 'This shop sends its products with the Tagora plugin for WooCommerce.');
    case 'shopify-app': throw new SyncError('shopify_app_source', 'This shop is connected with the Tagora app for Shopify.');
    default: return readFeed(url, opts);
  }
}

/** Reads a shop's source and checks every product. Does not write anywhere. */
export async function buildReport(shop: ShopConfig, syncId: string, opts: FetchOptions = {}): Promise<SyncReport> {
  return normalize(await readSource(shop.sourceType, shop.sourceUrl, opts), shop, syncId);
}
