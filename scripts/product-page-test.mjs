import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import * as comparison from '../shared/offer-comparison.ts';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const source = readFileSync(new URL('../src/pages/ProductPage.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const context = {};
const element = React.createElement;
const empty = () => null;
const mocks = {
  react: { ...React, useEffect: () => {}, useRef: () => ({ current: null }), useState: (initial) => [initial, () => {}] },
  'react/jsx-runtime': require('react/jsx-runtime'),
  'react-router-dom': {
    useParams: () => ({ id: context.id }),
    useSearchParams: () => [context.params, (params, options) => { context.changedParams = params; context.navigationOptions = options; }],
    Link: ({ to, children, ...props }) => element('a', { href: to, ...props }, children),
  },
  '../components/Footer': { Footer: empty },
  '../components/Header': { Header: empty },
  '../components/Icons': { Icon: empty },
  '../components/Lightbox': { Lightbox: empty },
  '../components/ShippingPolicy': { ShippingPolicy: empty },
  '../components/ui': {
    Loader: () => element('div', { 'data-loading': 'true' }),
    OfferTotal: empty,
    Pills: ({ p }) => element('div', { 'data-pill-size': p.size ?? '' }),
    Price: ({ p }) => element('span', { 'data-price-id': p.id }, p.price),
    ProductImage: ({ src }) => element('img', { src, alt: '' }),
    Shipping: empty,
    discountLabel: () => undefined,
  },
  '../i18n': {
    useLocale: () => ({
      t: (key, params = {}) => `${key}${Object.values(params).length ? ` ${Object.values(params).join(' | ')}` : ''}`,
      loc: (value) => typeof value === 'string' ? value : value?.en ?? value?.el ?? '',
      path: (value) => `/${context.country}${value}`,
      country: { code: context.country },
    }),
  },
  '../lib/api': { trackClick: empty },
  '../lib/consent': { track: empty },
  '../lib/sanitize': { sanitizeHtml: (value) => value },
  '../lib/hooks': {
    useAsync: (load) => { context.load = load; return context.state; },
    useDocumentTitle: empty,
  },
  '../search': { backend: {
    getProduct: async () => { if (context.fail) throw new Error('network unavailable'); return context.product; },
    getVariants: async () => context.variants,
    getOffers: async (...args) => { context.offerArgs = args; return context.backendOffers; },
  } },
  '../../shared/offer-comparison': comparison,
};
const exports = {};
vm.runInNewContext(compiled, {
  exports, URLSearchParams,
  require: (name) => { assert(name in mocks, `Unexpected import ${name}`); return mocks[name]; },
}, { filename: 'ProductPage.tsx' });

const product = (overrides = {}) => ({
  id: 'shop-a-34', groupId: 'shop-a-model', title: 'Adidas model', brand: 'Adidas',
  url: 'https://shop-a.example/product', image: 'https://shop-a.example/image.jpg',
  price: 45, shop: 'Shop A', shopId: 'shop-a', category: 'Shoes', color: 'black',
  size: '34', mpn: 'GW6453', matchKey: 'mpn:adidas:gw6453', countries: ['gr'], ...overrides,
});
const other = (overrides = {}) => product({ id: 'shop-b-model', groupId: 'shop-b-model',
  shop: 'Shop B', shopId: 'shop-b', url: 'https://shop-b.example/product', ...overrides });
const key = (id, country, size) => JSON.stringify([id, country, size, 0]);
const visit = (node, predicate) => {
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...React.Children.toArray(node.props.children).flatMap((child) => visit(child, predicate))];
};
function render(p = product(), options = {}) {
  Object.assign(context, {
    id: p.id, country: 'gr', params: new URLSearchParams(options.query), product: p,
    variants: options.variants ?? [], backendOffers: options.offers ?? [p], offerArgs: undefined,
    changedParams: undefined, navigationOptions: undefined, fail: false,
  });
  const requested = context.params.has('size') ? context.params.get('size') : undefined;
  context.state = options.state ?? { loading: false, data: {
    requestKey: key(p.id, 'gr', requested), product: p, variants: context.variants,
    // Intentionally permit unfiltered fixtures to test UI safety independently of the backend.
    offers: options.offers ?? [p],
  } };
  const tree = exports.ProductPage();
  return { tree, html: renderToStaticMarkup(tree) };
}
function noMerchantLinks(html) {
  assert.doesNotMatch(html, /<a\b[^>]*href="https:\/\/shop-[ab]\.example/);
}

test('single-size reference selects its exact size without a URL parameter', () => {
  const { html } = render();
  assert.match(html, /data-pill-size="34"/);
  assert.match(html, /product.selectedSize 34/);
  assert.doesNotMatch(html, /<select/);
});

test('multi-size without selection exposes only its own offer, no cross-shop claim', () => {
  const p = product({ size: '34, 35' });
  const { html } = render(p, { offers: [p, other({ size: '34, 35' })] });
  assert.match(html, /product.chooseSizeToCompare/);
  assert.match(html, /product.shopOffer/);
  assert.match(html, /data-pill-size=""/);
  assert.match(html, /product.availableSizes 34, 35/);
  assert.doesNotMatch(html, /Shop B|product.compareText|badge-best/);
});

test('selected size is shown in hero and offer rows rather than the complete size list', () => {
  const p = product({ size: '34, 35' });
  const { html } = render(p, { query: 'size=35', offers: [p, other({ size: '35, 36' })] });
  assert.match(html, /data-pill-size="35"/);
  assert.match(html, /<option value="35" selected="">35<\/option>/);
  assert.match(html, /product.selectedSize 35/);
  assert.match(html, /product.availableSizes 35, 36/);
  assert.doesNotMatch(html, /aria-describedby="product-size-help"/);
});

test('invalid and empty requested sizes show unavailable without prices or purchase links', () => {
  for (const query of ['size=99', 'size=', 'size=%20']) {
    const { html } = render(product(), { query, offers: [product(), other()] });
    assert.match(html, /product.sizeUnavailable/);
    assert.doesNotMatch(html, /data-price-id|class="buybar|offers-list/);
    noMerchantLinks(html);
  }
});

test('requesting a size on a size-less product is unavailable; ordinary products still work', () => {
  const p = product({ size: undefined });
  noMerchantLinks(render(p, { query: 'size=34' }).html);
  const { html } = render(p);
  assert.match(html, /href="https:\/\/shop-a\.example\/product"/);
  assert.doesNotMatch(html, /<select|product.sizeUnavailable|product.chooseSizeToCompare/);
});

test('a changed request hides retained data before the useAsync loading effect runs', () => {
  const p = product({ size: '34, 35' });
  for (const oldKey of [key(p.id, 'gr', '34'), key('previous-product', 'gr', '35'), key(p.id, 'cy', '35')]) {
    const { html } = render(p, { query: 'size=35', state: { loading: false,
      data: { requestKey: oldKey, product: p, variants: [], offers: [p, other()] } } });
    assert.match(html, /data-loading="true"/);
    assert.doesNotMatch(html, /data-price-id|data-pill-size|buybar/);
    noMerchantLinks(html);
  }
});

test('loading and failed requests never retain the old purchase buttons', () => {
  const p = product();
  const loading = render(p, { state: { loading: true,
    data: { requestKey: key(p.id, 'gr', undefined), product: p, variants: [], offers: [p] } } });
  assert.match(loading.html, /data-loading="true"/);
  noMerchantLinks(loading.html);
  const failed = render(p, { state: { loading: false,
    data: { requestKey: key(p.id, 'gr', undefined), product: null, variants: [], offers: [], failed: true } } });
  assert.match(failed.html, /product.loadError/);
  assert.match(failed.html, /product.retry/);
  noMerchantLinks(failed.html);
});

test('selecting a size preserves search and language parameters', () => {
  const { tree } = render(product({ size: '34, 35' }), { query: 'q=running+shoes&lang=en&size=34' });
  const select = visit(tree, (node) => node.type === 'select')[0];
  select.props.onChange({ target: { value: '35' } });
  assert.equal(context.changedParams.get('q'), 'running shoes');
  assert.equal(context.changedParams.get('lang'), 'en');
  assert.equal(context.changedParams.get('size'), '35');
  assert.equal(context.navigationOptions.preventScrollReset, true);
});

test('variant links preserve the search query and discard the prior size', () => {
  const { tree } = render(product(), { query: 'q=running+shoes&size=99', variants: [product({ id: 'variant-36', size: '36' })] });
  const link = visit(tree, (node) => node.props.className === 'variant')[0];
  const url = new URL(link.props.to, 'https://tagora.online');
  assert.match(url.pathname, /variant\/variant-36$/);
  assert.equal(url.searchParams.get('q'), 'running shoes');
  assert.equal(url.searchParams.has('size'), false);
});

test('the real loader passes reference/size and filters out a different-size offer', async () => {
  const p = product();
  render(p, { query: 'size=34', offers: [p, other({ size: '32, 33.5, 38 2/3' })] });
  const result = await context.load();
  assert.equal(JSON.stringify(context.offerArgs), JSON.stringify([p.matchKey, 'gr', p.id, '34']));
  assert.equal(JSON.stringify(result.offers.map((o) => o.id)), JSON.stringify([p.id]));
});

test('the real loader also validates invalid size when the product has no comparison key', async () => {
  render(product({ matchKey: undefined, mpn: undefined }), { query: 'size=99' });
  const result = await context.load();
  assert.equal(result.offers.length, 0);
  assert.equal(context.offerArgs, undefined);
});

test('the real loader tags failures with the current request rather than retaining an old product', async () => {
  const p = product();
  render(p, { query: 'size=34' });
  context.fail = true;
  const result = await context.load();
  assert.equal(result.requestKey, key(p.id, 'gr', '34'));
  assert.equal(result.failed, true);
  assert.equal(result.product, null);
  assert.equal(result.offers.length, 0);
});
