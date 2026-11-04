// Run with: node --test scripts/category-suggestions-test.ts
// Synthetic category facets only; no network or database writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { categorySuggestions } from '../shared/category-suggestions.ts';
import type { FacetValue } from '../src/search/types.ts';

const facet = (value: string, count = 1): FacetValue => ({ value, count });

test('keeps the catalogue ranking and original facet values without mutating input', () => {
  const input = Object.freeze([
    Object.freeze(facet('Widespread category', 3)),
    Object.freeze(facet('Large single-shop category', 200)),
    Object.freeze(facet('Third category', 20)),
  ]);
  assert.deepEqual(categorySuggestions(input), input);
  assert.deepEqual(categorySuggestions(input, undefined, 2), input.slice(0, 2));
});

test('filters unusable and promotional categories before filling the requested number', () => {
  const excluded = ['', '   ', '12345', '---', 'other', 'Uncategorized', 'Άλλα', 'Νέες Παραλαβές', 'Προσφορές'];
  const eligible = ['Παπούτσια', 'Τσάντες', 'Φορέματα', 'Γυαλιά', 'Καλλυντικά', 'Ακουστικά'];
  assert.deepEqual(
    categorySuggestions([...excluded.map((value) => facet(value, 1000)), ...eligible.map((value) => facet(value))]),
    eligible.slice(0, 5).map((value) => facet(value)),
  );
});

test('never suggests categories with zero or negative available offers', () => {
  assert.deepEqual(categorySuggestions([facet('Empty category', 0), facet('Invalid category', -1), facet('Available category', 2)]), [facet('Available category', 2)]);
  assert.deepEqual(categorySuggestions([]), []);
  assert.deepEqual(categorySuggestions([facet('Available category')], undefined, 0), []);
});

test('deduplicates normalized display labels while preserving the first raw category key', () => {
  const values = [facet('audio', 4), facet('Ακουστικά', 40), facet('ακουστικα', 50), facet('bags', 3), facet('Τσάντες', 30)];
  const labels: Record<string, string> = { audio: 'Ακουστικά', bags: 'Τσάντες' };
  const label = (value: string) => labels[value] ?? value;
  assert.deepEqual(categorySuggestions(values, label), [values[0], values[3]]);
});

test('keeps the legitimate home taxonomy category in either interface language', () => {
  const home = facet('home', 12);
  assert.deepEqual(categorySuggestions([home], () => 'Σπίτι'), [home]);
  assert.deepEqual(categorySuggestions([home], () => 'Home'), [home]);
});

test('keeps exact category values that safely round-trip through category filter URLs', () => {
  const values = [facet('  Καλλυντικά & Φροντίδα / Σώμα + Μαλλιά  '), facet('Kids #1? 50%')];
  for (const value of categorySuggestions(values)) {
    const url = new URL(`/gr/products?${new URLSearchParams({ category: value.value })}`, 'https://example.test');
    assert.equal(url.searchParams.get('category'), value.value);
    assert.equal(url.searchParams.has('q'), false);
  }
  assert.deepEqual(categorySuggestions(values), values);
});

test('rejects category values the search route would truncate at 120 characters', () => {
  const allowed = facet('A'.repeat(120));
  assert.deepEqual(categorySuggestions([facet('B'.repeat(121)), allowed]), [allowed]);
});
