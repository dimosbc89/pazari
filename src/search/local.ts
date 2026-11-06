// In-browser search over the demo catalogue (public/demo/products.json).
// Same behaviour as the Typesense backend: weighted fields, prefix and one-typo
// matching, Greek accent folding, Greek-to-Latin fallback, disjunctive facets.
import { STRINGS } from '../i18n/strings';
import { pickLang } from '../i18n';
import type { Lang } from '../config';
import { fold, hash, oneEdit, toLatin, words } from '../../shared/searchtext';
import { categorySuggestions } from '../../shared/category-suggestions';
import { matchingOffers } from '../../shared/offer-comparison';
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

export { fold };

interface Indexed {
  p: Product;
  fields: { words: string[]; weight: number }[];
}

const other = (l: Lang): Lang => (l === 'el' ? 'en' : 'el');

function index(p: Product, lang: Lang): Indexed {
  const label = (facet: string, v?: string) =>
    v ? [STRINGS.el, STRINGS.en].map((d) => (d as Record<string, string>)[`${facet}.${v}`] ?? v).join(' ') : '';
  return {
    p,
    fields: [
      { words: words(pickLang(p.title, lang)), weight: 10 },
      { words: words(p.brand), weight: 6 },
      { words: words(label('color', p.color)), weight: 5 },
      { words: words(pickLang(p.title, other(lang))), weight: 4 },
      { words: words(label('category', p.category)), weight: 3 },
      { words: words(pickLang(p.summary, lang)), weight: 2 },
      { words: words(`${p.shop} ${pickLang(p.size, lang)} ${p.mpn ?? ''}`), weight: 1 },
    ],
  };
}

function scoreToken(doc: Indexed, token: string): number {
  const variants = [token];
  const latin = toLatin(token);
  if (latin !== token) variants.push(latin);
  let best = 0;
  for (const f of doc.fields) {
    for (const w of f.words) {
      for (const t of variants) {
        let s = 0;
        if (w === t) s = 1.3;
        else if (w.startsWith(t)) s = 1;
        else if (t.length >= 4 && w.includes(t)) s = 0.5;
        else if (t.length >= 5 && oneEdit(w.slice(0, t.length + 1), t)) s = 0.6;
        else if (t.length >= 5 && oneEdit(w, t)) s = 0.6;
        if (s * f.weight > best) best = s * f.weight;
      }
    }
  }
  return best;
}

export function facetValue(p: Product, facet: FacetKey, lang: Lang): string | undefined {
  switch (facet) {
    case 'size':
      return p.size ? pickLang(p.size, lang) : undefined;
    default:
      return p[facet] as string | undefined;
  }
}

const emptyFacets = () => Object.fromEntries(FACETS.map((f) => [f, []])) as unknown as Record<FacetKey, FacetValue[]>;

export function createLocalBackend(url = '/demo/products.json'): SearchBackend {
  let data: Promise<Product[]> | null = null;
  const load = () =>
    (data ??= fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Could not load ${url}: ${r.status}`);
      return r.json() as Promise<Product[]>;
    }));
  const cache = new Map<string, Indexed[]>();
  const indexed = async (lang: Lang) => {
    if (!cache.has(lang)) cache.set(lang, (await load()).map((p) => index(p, lang)));
    return cache.get(lang)!;
  };

  return {
    async search(params: SearchParams): Promise<SearchResult> {
      const { query, country, lang, refinements, sort, limit } = params;
      const tokens = fold(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
      const scored: { p: Product; score: number }[] = [];
      for (const doc of await indexed(lang)) {
        if (!doc.p.countries.includes(country)) continue;
        let score = 0;
        let ok = true;
        for (const t of tokens) {
          const s = scoreToken(doc, t);
          if (s === 0) { ok = false; break; }
          score += s;
        }
        if (ok) scored.push({ p: doc.p, score });
      }

      const passes = (p: Product, except?: FacetKey) =>
        FACETS.every((f) => {
          if (f === except) return true;
          const sel = refinements[f];
          if (!sel || sel.length === 0) return true;
          const v = facetValue(p, f, lang);
          return v !== undefined && sel.includes(v);
        });

      const facets = emptyFacets();
      for (const f of FACETS) {
        const counts = new Map<string, number>();
        for (const { p } of scored) {
          if (!passes(p, f)) continue;
          const v = facetValue(p, f, lang);
          if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
        }
        // Keep selected values visible even when their count drops to 0.
        for (const v of refinements[f] ?? []) if (!counts.has(v)) counts.set(v, 0);
        facets[f] = [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
      }

      const hits = scored.filter(({ p }) => passes(p));
      const byRank = (a: Product, b: Product) => (a.rank ?? 0) - (b.rank ?? 0) || a.price - b.price;
      hits.sort((a, b) => {
        switch (sort) {
          case 'price_asc': return a.p.price - b.p.price;
          case 'price_desc': return b.p.price - a.p.price;
          case 'discount': return (b.p.discountPct ?? 0) - (a.p.discountPct ?? 0) || a.p.price - b.p.price;
          default: return tokens.length ? b.score - a.score || byRank(a.p, b.p) : hash(a.p.id) - hash(b.p.id);
        }
      });
      return { hits: hits.slice(0, limit).map((h) => h.p), total: hits.length, facets };
    },

    async getProduct(id) {
      return (await load()).find((p) => p.id === id) ?? null;
    },

    async getVariants(groupId, country) {
      return (await load()).filter((p) => p.groupId === groupId && p.countries.includes(country)).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    },

    async getOffers(key, country, referenceId, size) {
      if (!referenceId) return [];
      const products = await load();
      const reference = products.find((p) => p.id === referenceId && p.countries.includes(country));
      if (!reference || (reference.matchKey ?? reference.mpn) !== key) return [];
      const offers = products
        .filter((p) => (p.matchKey ?? p.mpn) === key && p.countries.includes(country))
        .sort((a, b) => a.price + (a.shipping ?? 0) - (b.price + (b.shipping ?? 0)));
      return matchingOffers(reference, offers, size);
    },

    async stats(country): Promise<CatalogueStats> {
      const items = (await load()).filter((p) => p.countries.includes(country));
      const categories = new Map<string, { count: number; shops: Set<string> }>();
      for (const p of items) {
        const entry = categories.get(p.category) ?? { count: 0, shops: new Set<string>() };
        entry.count++;
        entry.shops.add(p.shopId ?? p.shop);
        categories.set(p.category, entry);
      }
      const ranked = [...categories].sort(([a, x], [b, y]) => y.shops.size - x.shops.size || y.count - x.count || (a < b ? -1 : a > b ? 1 : 0))
        .map(([value, { count }]) => ({ value, count }));
      return { offers: items.length, shops: new Set(items.map((p) => p.shop)).size, brands: new Set(items.map((p) => p.brand)).size,
        categories: categorySuggestions(ranked, undefined, 20) };
    },
  };
}
