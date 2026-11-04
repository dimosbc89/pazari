import type { FacetValue } from '../src/search/types.ts';

const normalized = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const generic = new Set([
  'other', 'others', 'uncategorized', 'unclassified', 'all', 'all products', 'products', 'homepage',
  'new', 'new arrivals', 'new products', 'sale', 'sales', 'offers', 'outlet', 'brands',
  'άλλα', 'λοιπά', 'διάφορα', 'χωρίς κατηγορία', 'μη κατηγοριοποιημένα', 'όλα', 'όλα τα προϊόντα', 'προϊόντα',
  'αρχική', 'αρχική σελίδα', 'νέα', 'νέα προϊόντα', 'νέες αφίξεις', 'νέες παραλαβές', 'προσφορές', 'εκπτώσεις',
].map(normalized));

/** Keep the backend's popularity order and the exact category values used by search. */
export function categorySuggestions(
  values: readonly FacetValue[], label: (value: string) => string = (value) => value, limit = 5,
): FacetValue[] {
  const selected: FacetValue[] = [];
  const seen = new Set<string>();
  if (limit <= 0) return selected;
  for (const item of values) {
    const raw = normalized(item.value);
    const display = normalized(label(item.value));
    if (!Number.isFinite(item.count) || item.count <= 0 || item.value.length > 120
      || !/\p{L}/u.test(raw) || !display || generic.has(raw) || generic.has(display) || seen.has(display)) continue;
    seen.add(display);
    selected.push(item);
    if (selected.length >= limit) break;
  }
  return selected;
}
