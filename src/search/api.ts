// Partner shops' products, searched in the Cloudflare database (worker/catalogue.ts)
// through /api/catalogue/*. Responses are cached at Cloudflare's edge for a few minutes.
import { FACETS, type CatalogueStats, type Product, type SearchBackend, type SearchParams, type SearchResult } from './types';

export function createApiBackend(base = '/api/catalogue'): SearchBackend {
  async function get<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T | null> {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) for (const x of Array.isArray(v) ? v : [v]) q.append(k, x);
    const res = await fetch(`${base}${path}${q.size ? `?${q}` : ''}`, path === '/stats' ? { cache: 'no-store' } : undefined);
    if (res.status === 404) return null;
    const data = (await res.json().catch(() => null)) as (T & { ok?: boolean }) | null;
    if (!res.ok || !data || data.ok === false) throw new Error(`Catalogue ${res.status}`);
    return data;
  }

  return {
    async search(p: SearchParams): Promise<SearchResult> {
      const params: Record<string, string | string[]> = { country: p.country, sort: p.sort, limit: String(p.limit) };
      if (p.query.trim()) params.q = p.query.trim();
      // Sorted, so the same search always has the same URL (and hits the edge cache).
      for (const f of FACETS) if (p.refinements[f]?.length) params[f] = [...p.refinements[f]!].sort();
      const r = await get<SearchResult>('/search', params);
      return r ?? { hits: [], total: 0, facets: Object.fromEntries(FACETS.map((f) => [f, []])) as unknown as SearchResult['facets'] };
    },
    async getProduct(id) {
      return (await get<{ product: Product }>(`/products/${encodeURIComponent(id)}`))?.product ?? null;
    },
    async getVariants(groupId, country) {
      return (await get<{ products: Product[] }>('/variants', { group: groupId, country }))?.products ?? [];
    },
    async getOffers(key, country) {
      return (await get<{ products: Product[] }>('/offers', { key, country }))?.products ?? [];
    },
    async stats(country): Promise<CatalogueStats> {
      return (await get<CatalogueStats>('/stats', { country })) ?? { offers: 0, shops: 0, brands: 0 };
    },
  };
}
