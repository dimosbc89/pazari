// Typesense backend (https://typesense.org). Talks to the REST API directly, so no
// InstantSearch dependency. Disjunctive facets use one extra query per refined facet,
// all sent in a single multi_search request.
import { categorySuggestions } from '../../shared/category-suggestions';
import { matchingOffers } from '../../shared/offer-comparison';
// Collection schema and import: scripts/typesense-push.mjs
import {
  FACETS,
  type CatalogueStats,
  type FacetKey,
  type FacetValue,
  type Product,
  type SearchBackend,
  type SearchParams,
  type SearchResult,
} from './types';

interface Config {
  host: string;
  port: string;
  protocol: string;
  apiKey: string;
  collection: string;
}

interface TsHit { document: Product }
interface TsResult {
  found: number;
  hits?: TsHit[];
  facet_counts?: { field_name: string; counts: { value: string; count: number }[] }[];
  error?: string;
}

const QUERY_BY = 'title,brand,color,category,summary,mpn';
const WEIGHTS = '10,6,5,3,2,1';
const SORT: Record<SearchParams['sort'], string> = {
  relevance: '_text_match:desc,rank:asc',
  price_asc: 'price:asc',
  price_desc: 'price:desc',
  discount: 'discountPct:desc,price:asc',
};

const esc = (v: string) => '`' + v.replace(/`/g, '') + '`';
const inList = (field: string, values: string[]) => `${field}:=[${values.map(esc).join(',')}]`;

export function createTypesenseBackend(cfg: Config): SearchBackend {
  if (!cfg.host || !cfg.apiKey) {
    throw new Error('Typesense backend needs VITE_TYPESENSE_HOST and VITE_TYPESENSE_SEARCH_KEY (see .env.example).');
  }
  const base = `${cfg.protocol}://${cfg.host}:${cfg.port}`;

  async function multi(searches: Record<string, unknown>[]): Promise<TsResult[]> {
    const res = await fetch(`${base}/multi_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-TYPESENSE-API-KEY': cfg.apiKey },
      body: JSON.stringify({ searches: searches.map((s) => ({ collection: cfg.collection, ...s })) }),
    });
    if (!res.ok) throw new Error(`Typesense ${res.status}`);
    const json = (await res.json()) as { results: TsResult[] };
    for (const r of json.results) if (r.error) throw new Error(r.error);
    return json.results;
  }

  const filterFor = (country: string, refinements: SearchParams['refinements'], except?: FacetKey) =>
    [
      inList('countries', [country]),
      ...FACETS.filter((f) => f !== except && refinements[f]?.length).map((f) => inList(f, refinements[f]!)),
    ].join(' && ');

  const find = async (filter: string, sort = 'rank:asc', perPage = 100) =>
    (await multi([{ q: '*', query_by: QUERY_BY, filter_by: filter, sort_by: sort, per_page: perPage }]))[0].hits?.map((h) => h.document) ?? [];

  return {
    async search(p: SearchParams): Promise<SearchResult> {
      const refined = FACETS.filter((f) => p.refinements[f]?.length);
      const common = { q: p.query.trim() || '*', query_by: QUERY_BY, query_by_weights: WEIGHTS, max_facet_values: 100, num_typos: 1 };
      const searches = [
        { ...common, filter_by: filterFor(p.country, p.refinements), facet_by: FACETS.join(','), sort_by: SORT[p.sort], per_page: Math.min(p.limit, 250), page: 1 },
        ...refined.map((f) => ({ ...common, filter_by: filterFor(p.country, p.refinements, f), facet_by: f, per_page: 0 })),
      ];
      const [main, ...rest] = await multi(searches);
      const facets = Object.fromEntries(FACETS.map((f) => [f, [] as FacetValue[]])) as Record<FacetKey, FacetValue[]>;
      const fill = (r: TsResult, only?: FacetKey) => {
        for (const fc of r.facet_counts ?? []) {
          const f = fc.field_name as FacetKey;
          if (only && f !== only) continue;
          facets[f] = fc.counts.map((c) => ({ value: c.value, count: c.count }));
        }
      };
      fill(main);
      rest.forEach((r, i) => fill(r, refined[i]));
      for (const f of refined) for (const v of p.refinements[f]!) if (!facets[f].some((x) => x.value === v)) facets[f].push({ value: v, count: 0 });
      return { hits: main.hits?.map((h) => h.document) ?? [], total: main.found, facets };
    },

    async getProduct(id) {
      return (await find(inList('id', [id]), 'rank:asc', 1))[0] ?? null;
    },

    getVariants: (groupId, country) => find(`${inList('groupId', [groupId])} && ${inList('countries', [country])}`),

    async getOffers(key, country, referenceId, size) {
      if (!referenceId) return [];
      const reference = (await find(`${inList('id', [referenceId])} && ${inList('countries', [country])}`, 'rank:asc', 1))[0];
      if (!reference || (reference.matchKey ?? reference.mpn) !== key) return [];
      const field = key.startsWith('gtin:') || key.startsWith('mpn:') ? 'matchKey' : 'mpn';
      const offers = await find(`${inList(field, [key])} && ${inList('countries', [country])}`, 'price:asc');
      return matchingOffers(reference, offers, size).sort((a, b) => a.price + (a.shipping ?? 0) - (b.price + (b.shipping ?? 0)));
    },

    async stats(country): Promise<CatalogueStats> {
      const [r] = await multi([{ q: '*', query_by: QUERY_BY, filter_by: inList('countries', [country]), facet_by: 'shop,brand,category', max_facet_values: 1000, per_page: 0 }]);
      const n = (f: string) => r.facet_counts?.find((x) => x.field_name === f)?.counts.length ?? 0;
      // Typesense facets do not provide per-category shop breadth; use offer volume here.
      const categories = [...(r.facet_counts?.find((x) => x.field_name === 'category')?.counts ?? [])]
        .sort((a, b) => b.count - a.count || (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
      return { offers: r.found, shops: n('shop'), brands: n('brand'), categories: categorySuggestions(categories, undefined, 20) };
    },
  };
}
