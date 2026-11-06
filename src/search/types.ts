import type { Lang } from '../lang';

/** A string, or one string per language (the demo catalogue is bilingual; real feeds usually are not). */
export type Localized = string | Partial<Record<Lang, string>>;

/** One offer: a product as sold by one shop. Mirrors a Google Merchant Center feed item. */
export interface Product {
  id: string;
  /** item_group_id: variants (colours, sizes) of the same product in the same shop */
  groupId: string;
  title: Localized;
  brand: string;
  /** Short line for result cards */
  summary?: Localized;
  /** HTML allowed (p, ul, li, strong) */
  description?: Localized;
  /** The shop's product page (click-out) */
  url: string;
  image: string;
  images?: string[];
  price: number;
  /** Price before the discount, if any */
  oldPrice?: number;
  /** Delivery cost; 0 = free; undefined = unknown */
  shipping?: number;
  shop: string;
  category: string;
  color?: string;
  size?: Localized;
  mpn?: string;
  gtin?: string;
  /** Offers with the same key are the same product in different shops (barcode, or brand + MPN). Falls back to mpn. */
  matchKey?: string;
  /** Set for synced shops (not the demo) */
  shopId?: string;
  syncId?: string;
  /** Country codes where the offer is shown */
  countries: string[];
  /** Facet bucket: upto20 | 20to35 | 35plus */
  discount?: string;
  discountPct?: number;
  /** Order of variants inside a group */
  rank?: number;
  demo?: boolean;
}

export const FACETS = ['category', 'shop', 'brand', 'size', 'color', 'discount'] as const;
export type FacetKey = (typeof FACETS)[number];

export type SortKey = 'relevance' | 'price_asc' | 'price_desc' | 'discount';
export const SORTS: SortKey[] = ['relevance', 'price_asc', 'price_desc', 'discount'];

export type Refinements = Partial<Record<FacetKey, string[]>>;

export interface SearchParams {
  query: string;
  country: string;
  lang: Lang;
  refinements: Refinements;
  sort: SortKey;
  /** How many hits to return, counted from the first (load-more pagination) */
  limit: number;
}

export interface FacetValue {
  value: string;
  count: number;
}

export interface SearchResult {
  hits: Product[];
  total: number;
  facets: Record<FacetKey, FacetValue[]>;
}

export interface CatalogueStats {
  offers: number;
  shops: number;
  brands: number;
  /** Ranked category shortcuts; optional while older cached responses expire. */
  categories?: FacetValue[];
}

export interface SearchBackend {
  search(p: SearchParams): Promise<SearchResult>;
  getProduct(id: string): Promise<Product | null>;
  /** Other variants (same groupId) */
  getVariants(groupId: string, country: string): Promise<Product[]>;
  /** Offers for the selected product and exact size. A reference is required for comparisons. */
  getOffers(key: string, country: string, referenceId?: string, size?: string): Promise<Product[]>;
  stats(country: string): Promise<CatalogueStats>;
}
