// Shared by the Worker (scheduled sync) and the command-line import (scripts/import.ts).
import type { Product } from '../src/search/types.ts';

export type { Product };

/** How a shop's products reach Tagora. */
/** plugin: the Tagora plugin for WooCommerce sends the products (Tagora does not read them).
 *  shopify-app: the Tagora app for Shopify (Tagora reads the store through Shopify's Admin API). */
export type SourceType = 'feed' | 'shopify' | 'woocommerce' | 'plugin' | 'shopify-app';

export interface ShopConfig {
  /** Slug, e.g. "meltemi-store". Prefixes every product id. */
  id: string;
  name: string;
  countries: string[];
  sourceType: SourceType;
  sourceUrl: string;
  /** Used when the source has no delivery cost (Shopify, WooCommerce, many feeds) */
  defaultShipping?: number | null;
  freeShippingOver?: number | null;
}

/** One product as read from a source, before checks. Parsers fill what they can. */
export interface SourceItem {
  id: string;
  groupId?: string;
  title?: string;
  /** Plain text (HTML already stripped) */
  description?: string;
  url?: string;
  image?: string;
  images?: string[];
  price?: number;
  oldPrice?: number;
  shipping?: number;
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
  mpn?: string;
  gtin?: string;
  inStock: boolean;
}

export interface SourceResult {
  /** google | skroutz | bestprice | xml | csv | shopify | woocommerce */
  format: string;
  items: SourceItem[];
  /** True when the source had more products than the per-sync limit */
  truncated: boolean;
}

export type IssueCode =
  | 'missing_id' | 'missing_title' | 'missing_price' | 'missing_link' | 'out_of_stock' | 'duplicate_id'
  | 'missing_image' | 'missing_brand' | 'missing_identifier' | 'truncated';

/** Codes for items that were left out; the others are warnings. */
export const SKIP_CODES: IssueCode[] = ['missing_id', 'missing_title', 'missing_price', 'missing_link', 'out_of_stock', 'duplicate_id'];

export interface Issue {
  code: IssueCode;
  count: number;
  /** A few product titles or ids, to help the shop find them */
  examples: string[];
}

export interface SyncReport {
  format: string;
  /** Items read from the source */
  found: number;
  /** Items that passed the checks */
  products: Product[];
  skipped: number;
  /** Ids (as stored, "<shop>-<id>") of the items that were left out, e.g. sold out */
  skippedIds: string[];
  issues: Issue[];
}

export class SyncError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
