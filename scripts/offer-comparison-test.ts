// Pure regression fixtures: no network requests or production data writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchingOffers, selectedProductSize, sizeOptions } from '../shared/offer-comparison.ts';
import type { Product } from '../src/search/types.ts';

const product = (changes: Partial<Product> = {}): Product => ({
  id: 'better-1', groupId: 'better-1', title: 'Adidas shoe', brand: 'Adidas',
  shop: 'BetterSport', shopId: 'bettersport', category: 'Shoes', price: 24.9,
  url: 'https://better.invalid/product', image: 'https://better.invalid/product.jpg', countries: ['gr'],
  mpn: 'GW6453', matchKey: 'mpn:adidas:gw6453', size: '34', ...changes,
});
const other = (changes: Partial<Product> = {}) => product({ id: 'sport-1', groupId: 'sport-1', shop: 'The Sport Center', shopId: 'the-sport-center', price: 30.5, ...changes });

test('GW6453 size 34 excludes a shop offering only 32, 33.5 and 38 2/3', () => {
  const reference = product(), sport = other({ size: '32,33.5,38 2/3', color: 'Λευκό' });
  assert.deepEqual(matchingOffers(reference, [reference, sport], '34'), [reference]);
  assert.deepEqual(matchingOffers(reference, [reference, sport]), [reference]);
});

test('F35555 size 38 keeps both merchants and their established input price order', () => {
  const reference = product({ mpn: 'F35555', matchKey: 'mpn:adidas:f35555', size: '38' });
  const sport = other({ mpn: 'F35555', matchKey: 'mpn:adidas:f35555', size: '32,34,35,36,37,38', color: 'Λευκό' });
  assert.deepEqual(matchingOffers(reference, [sport, reference], '38'), [sport, reference]);
  assert.deepEqual(matchingOffers(reference, [sport], '38'), [sport], 'Never append an absent reference');
});

test('invalid explicit requests never default, including on size-less products', () => {
  const reference = product(), noSize = product({ size: undefined });
  for (const requested of ['', '35', '34,35', 'invalid', 'EU 34']) {
    assert.equal(selectedProductSize(reference, requested), undefined);
    assert.deepEqual(matchingOffers(reference, [reference], requested), []);
  }
  assert.equal(selectedProductSize(reference), '34');
  assert.equal(selectedProductSize(noSize, '34'), undefined);
  assert.deepEqual(matchingOffers(noSize, [noSize], '34'), []);
});

test('multi-size products need one selected size; unknown sizes never imply stock', () => {
  const reference = product({ size: '32,34,36' }), sport = other({ size: '34' });
  assert.equal(selectedProductSize(reference), undefined);
  assert.deepEqual(matchingOffers(reference, [sport, reference]), [reference]);
  assert.deepEqual(matchingOffers(reference, [sport, reference], '34'), [sport, reference]);
  assert.deepEqual(matchingOffers(product(), [other({ size: undefined })], '34'), []);
});

test('size parsing preserves thirds, decimal sizes, alpha sizes and known aliases', () => {
  assert.deepEqual(sizeOptions(product({ size: '38 2⁄3,39⅓,40.5' })), ['38 2/3', '39 1/3', '40.5']);
  assert.deepEqual(sizeOptions(product({ size: 'S,M,2XL,XXL,ONE-SIZE' })), ['S', 'M', 'XXL', 'ONE SIZE']);
  assert.deepEqual(sizeOptions(product({ size: { el: 'ONE-SIZE', en: 'ONE SIZE' } })), ['ONE SIZE']);
  const reference = product({ size: '38 2/3' });
  assert.deepEqual(matchingOffers(reference, [other({ size: '38' }), other({ id: 'decimal', size: '38.5' }), reference]), [reference]);
});

test('ambiguous, conflicting localized, ranged and import-truncated size lists fail closed', () => {
  for (const size of ['', '38,5', '28-36', 'S/M', 'EU 38', 'US 6', 'S, M,', '1'.repeat(40), '41 1/3, 42, 42 2/3, 43 1/3, 44, 44 2/3, ']) {
    assert.deepEqual(sizeOptions(product({ size })), [], size);
  }
  assert.deepEqual(sizeOptions(product({ size: { el: '34', en: '35' } })), []);
  const reference = product({ size: '28-36' });
  assert.deepEqual(matchingOffers(reference, [other(), reference]), [reference]);
  assert.deepEqual(matchingOffers(reference, [reference], '34'), []);
});

test('bare MPN, title similarity and missing identity cannot create cross-shop matches', () => {
  const vacuum = product({ title: 'Rohnson Mamba M6 vacuum', brand: 'Rohnson', mpn: 'M6', matchKey: undefined, size: undefined });
  const transmitter = other({ title: 'Earldom M6 FM transmitter', brand: 'Earldom', mpn: 'M6', matchKey: undefined, size: undefined });
  assert.deepEqual(matchingOffers(vacuum, [vacuum, transmitter]), [vacuum]);
  const noKey = product({ matchKey: undefined });
  assert.deepEqual(matchingOffers(noKey, [noKey, other({ matchKey: undefined })]), [noKey]);
});

test('brand-scoped matching preserves MPN punctuation and rejects conflicting brands', () => {
  const reference = product({ mpn: 'AB-123', matchKey: 'mpn:adidas:ab-123' });
  assert.deepEqual(matchingOffers(reference, [reference, other({ mpn: 'AB123', matchKey: reference.matchKey })]), [reference]);
  assert.deepEqual(matchingOffers(reference, [reference, other({ mpn: 'AB-123', matchKey: reference.matchKey, brand: 'Nike' })]), [reference]);
  assert.deepEqual(matchingOffers(reference, [other({ mpn: 'ab-123', matchKey: reference.matchKey, brand: 'ADIDAS' })]).map((p) => p.id), ['sport-1']);
});

test('valid GTINs match across padded formats, but invalid or different GTINs cannot prove equality', () => {
  const reference = product({ gtin: '4006381333931', matchKey: 'gtin:4006381333931', size: undefined, mpn: undefined });
  const padded = other({ gtin: '04006381333931', matchKey: reference.matchKey, size: undefined, mpn: undefined });
  assert.deepEqual(matchingOffers(reference, [padded, reference]), [padded, reference]);
  for (const gtin of ['4006381333932', '400638133393', '0000000000000', 'GTIN4006381333931']) {
    assert.deepEqual(matchingOffers(reference, [reference, other({ gtin, matchKey: reference.matchKey, size: undefined, mpn: undefined })]), [reference]);
  }
  const anotherValid = other({ gtin: '5901234123457', size: undefined });
  assert.deepEqual(matchingOffers({ ...reference, mpn: 'GW6453', matchKey: 'mpn:adidas:gw6453' }, [anotherValid]), []);
});

test('same GTIN does not override known brand or colour conflicts', () => {
  const reference = product({ gtin: '4006381333931', size: undefined, color: 'Λευκό' });
  assert.deepEqual(matchingOffers(reference, [other({ gtin: reference.gtin, size: undefined, brand: 'Mustela' })]), []);
  assert.deepEqual(matchingOffers(reference, [other({ gtin: reference.gtin, size: undefined, color: 'black' })]), []);
  assert.equal(matchingOffers(reference, [other({ gtin: reference.gtin, size: undefined, color: 'white' })]).length, 1);
  assert.equal(matchingOffers(reference, [other({ gtin: reference.gtin, size: undefined, color: undefined })]).length, 1);
});

test('conflicting explicit volumes, capacities and pack quantities are rejected', () => {
  const reference = product({ gtin: '4006381333931', size: undefined, title: 'Example cream 50ml' });
  assert.deepEqual(matchingOffers(reference, [other({ gtin: reference.gtin, size: undefined, title: 'Example cream 40ml' })]), []);
  assert.deepEqual(matchingOffers(reference, [other({ gtin: reference.gtin, size: undefined, title: 'Example stick 9gr' })]), []);
  assert.equal(matchingOffers(reference, [other({ gtin: reference.gtin, size: undefined, title: 'Example cream 0.05 L' })]).length, 1);
  const phone = product({ title: 'Example phone 128GB', size: undefined });
  assert.deepEqual(matchingOffers(phone, [other({ title: 'Example phone 256GB', size: undefined })]), []);
  const bundle = product({ title: 'Example 50ml + gift 10ml', size: undefined });
  assert.deepEqual(matchingOffers(bundle, [other({ title: 'Example 50ml + gift 15ml', size: undefined })]), []);
});

test('non-sized products can compare by strong identity, while sized and unknown-size offers stay separate', () => {
  const reference = product({ title: 'Example appliance', size: undefined });
  const same = other({ title: 'Example appliance', size: undefined });
  assert.deepEqual(matchingOffers(reference, [same, reference]), [same, reference]);
  assert.deepEqual(matchingOffers(reference, [other({ size: 'M' }), reference]), [reference]);
  const placeholder = product({ brand: 'OEM', size: undefined });
  assert.deepEqual(matchingOffers(placeholder, [other({ brand: 'OEM', size: undefined }), placeholder]), [placeholder]);
});

test('Greek weight/volume labels and litre abbreviations retain explicit capacity checks', () => {
  const reference = product({ size: undefined, title: 'Example cream 50γρ' });
  assert.deepEqual(matchingOffers(reference, [other({ size: undefined, title: 'Example cream 40γρ' })]), []);
  assert.equal(matchingOffers(reference, [other({ size: undefined, title: 'Example cream 50gr' })]).length, 1);
  const litre = product({ size: undefined, title: 'Example cleanser 1lt' });
  assert.deepEqual(matchingOffers(litre, [other({ size: undefined, title: 'Example cleanser 2lt' })]), []);
  assert.equal(matchingOffers(litre, [other({ size: undefined, title: 'Example cleanser 1000μλ' })]).length, 1);
  assert.deepEqual(matchingOffers(litre, [other({ size: undefined, title: 'Example cleanser 500μλ' })]), []);
});
