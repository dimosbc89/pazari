// Real catalogue modules with an inert VM, fake clock and mocked fetch only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const flush = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const response = (data, status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => data });
const timeoutError = (error) => error?.name === 'TimeoutError';

class Clock {
  now = 0;
  next = 1;
  tasks = new Map();
  setTimeout = (fn, delay) => {
    const id = this.next++;
    this.tasks.set(id, { fn, at: this.now + Number(delay) });
    return id;
  };
  clearTimeout = (id) => { this.tasks.delete(id); };
  async advance(ms) {
    const end = this.now + ms;
    while (true) {
      const due = [...this.tasks].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.now = due[1].at;
      this.tasks.delete(due[0]);
      due[1].fn();
      await flush();
    }
    this.now = end;
    await flush();
  }
}

function harness({ config = 'auto', search = '', storedPreview, fetchImpl } = {}) {
  const clock = new Clock(), calls = [], backendCalls = [], storage = new Map();
  if (storedPreview) storage.set('tagora_catalogue', storedPreview);
  let mountedHook;
  const hooks = {
    useState(initial) {
      assert(mountedHook, 'Hook used outside the test mount');
      const hook = mountedHook, index = hook.cursor++;
      if (!(index in hook.state)) hook.state[index] = initial;
      return [hook.state[index], (value) => {
        hook.state[index] = typeof value === 'function' ? value(hook.state[index]) : value;
        hook.updates.push({ index, value: hook.state[index] });
      }];
    },
    useEffect(effect) { mountedHook.effects.push(effect); },
  };
  const modules = new Map();
  const stubBackend = (kind) => Object.fromEntries(['search', 'getProduct', 'getVariants', 'getOffers', 'stats'].map((method) => [method, async (...args) => {
    backendCalls.push({ kind, method, args });
    return { kind, method };
  }]));
  const globals = {
    AbortController, URLSearchParams,
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    window: { location: { search } },
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    fetch: (url, options) => {
      calls.push({ url, options });
      assert(fetchImpl, 'No live or implicit network is permitted');
      return fetchImpl(url, options, calls.length);
    },
  };
  function evaluate(file, overrides = {}, append = '') {
    const exports = {};
    const code = ts.transpileModule(source(file) + append, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const imports = {
      react: hooks,
      '../config': { SEARCH_CONFIG: { backend: config, typesense: {} } },
      '../lib/request-timeout': () => load('src/lib/request-timeout.ts'),
      './api': () => load('src/search/api.ts'),
      './types': () => load('src/search/types.ts'),
      './local': { createLocalBackend: () => stubBackend('demo') },
      './typesense': { createTypesenseBackend: () => stubBackend('typesense') },
      ...overrides,
    };
    vm.runInNewContext(code, { ...globals, exports, require: (name) => {
      assert(Object.hasOwn(imports, name), `Unexpected import ${name} in ${file}`);
      return typeof imports[name] === 'function' ? imports[name]() : imports[name];
    } }, { filename: file });
    return exports;
  }
  function load(file) {
    if (!modules.has(file)) modules.set(file, evaluate(file));
    return modules.get(file);
  }
  function mountDemoHook() {
    const hook = { state: [], cursor: 0, effects: [], cleanups: [], updates: [] };
    mountedHook = hook;
    try { load('src/search/index.ts').useIsDemo(); } finally { mountedHook = undefined; }
    hook.cleanups = hook.effects.map((effect) => effect());
    return { get value() { return hook.state[0]; }, updates: hook.updates, unmount: () => hook.cleanups.forEach((cleanup) => cleanup?.()) };
  }
  return { clock, calls, backendCalls, storage, load, evaluate, mountDemoHook, setFetch: (read) => { fetchImpl = read; } };
}

test('helper enforces the default 15-second deadline even when read ignores abort', async () => {
  const h = harness(), api = h.load('src/lib/request-timeout.ts'), pending = deferred();
  let signal;
  assert.equal(api.REQUEST_TIMEOUT_MS, 15000);
  const result = api.withRequestTimeout((s) => { signal = s; return pending.promise; });
  const rejected = assert.rejects(result, timeoutError);
  await flush();
  await h.clock.advance(14999);
  assert.equal(signal.aborted, false);
  await h.clock.advance(1);
  await rejected;
  assert.equal(signal.aborted, true);
  assert.equal(signal.reason.name, 'TimeoutError');
  assert.equal(h.clock.tasks.size, 0);
  pending.resolve('late value');
  await flush();
  await assert.rejects(result, timeoutError);
});

test('helper clears timers after success, rejection and synchronous callback throws', async () => {
  for (const kind of ['success', 'rejection', 'throw']) {
    const h = harness(), { withRequestTimeout } = h.load('src/lib/request-timeout.ts');
    let signal;
    const error = new Error('controlled failure');
    const result = withRequestTimeout((s) => {
      signal = s;
      if (kind === 'throw') throw error;
      return kind === 'rejection' ? Promise.reject(error) : Promise.resolve('original value');
    }, 50);
    if (kind === 'success') assert.equal(await result, 'original value');
    else await assert.rejects(result, (actual) => actual === error);
    assert.equal(h.clock.tasks.size, 0);
    await h.clock.advance(100);
    assert.equal(signal.aborted, false);
  }
});

for (const phase of ['headers', 'body']) {
  test(`catalogue API aborts stalled ${phase}; the body shares the original deadline`, async () => {
    const pending = deferred();
    const h = harness({ fetchImpl: () => phase === 'headers' ? pending.promise : Promise.resolve({ ...response(null), json: () => pending.promise }) });
    const api = h.load('src/search/api.ts').createApiBackend();
    const promise = api.getProduct('shop-a');
    const rejected = assert.rejects(promise, timeoutError);
    await flush();
    assert.equal(h.calls.length, 1);
    await h.clock.advance(14999);
    assert.equal(h.calls[0].options.signal.aborted, false);
    assert.equal(h.clock.tasks.size, 1);
    await h.clock.advance(1);
    await rejected;
    assert.equal(h.calls[0].options.signal.aborted, true);
    assert.equal(h.clock.tasks.size, 0);
    assert.equal(h.calls.length, 1, 'timeout must not retry automatically');
  });
}

for (const target of ['api', 'mode']) {
  test(`${target} headers arriving at 10 seconds leave only 5 seconds for the body`, async () => {
    const headers = deferred(), body = deferred();
    const h = harness({ fetchImpl: () => headers.promise });
    const request = target === 'api'
      ? h.load('src/search/api.ts').createApiBackend().getProduct('slow-body')
      : h.load('src/search/index.ts').catalogueMode();
    const rejected = assert.rejects(request, timeoutError);
    await flush();
    await h.clock.advance(10000);
    let bodyReads = 0;
    headers.resolve({ ...response(null), json: () => { bodyReads++; return body.promise; } });
    await flush();
    assert.equal(bodyReads, 1);
    await h.clock.advance(4999);
    assert.equal(h.calls[0].options.signal.aborted, false);
    await h.clock.advance(1);
    await rejected;
    assert.equal(h.clock.now, 15000);
    assert.equal(h.calls[0].options.signal.aborted, true);
    assert.equal(h.calls.length, 1);
    assert.equal(h.clock.tasks.size, 0);
  });
}

test('API success preserves encoded identity, selected size, queries and stats cache option', async () => {
  const h = harness({ fetchImpl: async (url) => {
    if (url.includes('/products/')) return response({ ok: true, product: { id: 'same' } });
    if (url.includes('/stats')) return response({ ok: true, offers: 1, shops: 1, brands: 1 });
    return response({ ok: true, products: [], hits: [], total: 0, facets: {} });
  } });
  const api = h.load('src/search/api.ts').createApiBackend('/custom/catalogue');
  assert.equal((await api.getProduct('shop/id ?')).id, 'same');
  await api.getOffers('mpn:brand:model', 'gr', 'shop/id ?', '38 2/3');
  await api.getOffers('mpn:brand:model', 'gr', 'shop/id ?', '');
  await api.getVariants('group/id', 'cy');
  await api.search({ country: 'gr', query: ' shoes ', sort: 'price_asc', limit: 40, refinements: { brand: ['Zeta', 'Alpha'], size: ['38'] } });
  await api.stats('gr');
  assert.match(h.calls[0].url, /\/products\/shop%2Fid%20%3F$/);
  const offer = new URL(h.calls[1].url, 'https://offline.invalid');
  assert.equal(offer.searchParams.get('key'), 'mpn:brand:model');
  assert.equal(offer.searchParams.get('product'), 'shop/id ?');
  assert.equal(offer.searchParams.get('country'), 'gr');
  assert.equal(offer.searchParams.get('size'), '38 2/3');
  assert.equal(new URL(h.calls[2].url, 'https://offline.invalid').searchParams.get('size'), '');
  const search = new URL(h.calls[4].url, 'https://offline.invalid');
  assert.equal(search.searchParams.get('q'), 'shoes');
  assert.deepEqual(search.searchParams.getAll('brand'), ['Alpha', 'Zeta']);
  assert.equal(search.searchParams.get('limit'), '40');
  assert.equal(h.calls[5].options.cache, 'no-store');
  assert.equal(h.calls[0].options.cache, undefined);
  assert(h.calls.every((call) => call.options.signal instanceof AbortSignal));
  assert.equal(h.clock.tasks.size, 0);
  const count = h.calls.length;
  assert.equal((await api.getOffers('key', 'gr')).length, 0);
  assert.equal(h.calls.length, count, 'missing reference must still avoid fetch');
});

test('API 404 is null without reading its body; unsuccessful or invalid JSON responses reject', async () => {
  const h = harness({ fetchImpl: async () => ({ ...response(null, 404), json: () => { throw new Error('404 body must not be read'); } }) });
  const api = h.load('src/search/api.ts').createApiBackend();
  assert.equal(await api.getProduct('missing'), null);
  assert.equal(h.clock.tasks.size, 0);
  for (const res of [response({ product: {} }, 500), response({ ok: false }, 200), response(null), { ...response(null), json: async () => { throw new SyntaxError('bad JSON'); } }]) {
    h.setFetch(async () => res);
    await assert.rejects(api.getProduct('broken'));
    assert.equal(h.clock.tasks.size, 0);
  }
});

for (const phase of ['headers', 'body']) {
  test(`shared mode ${phase} timeout rejects without demo and manual retry makes a new request`, async () => {
    const pending = deferred();
    const h = harness({ fetchImpl: () => phase === 'headers' ? pending.promise : Promise.resolve({ ...response(null), json: () => pending.promise }) });
    const { catalogueMode, backend } = h.load('src/search/index.ts');
    const first = catalogueMode(), second = catalogueMode();
    assert.equal(first, second, 'concurrent callers must share a promise');
    const modeFailure = assert.rejects(first, timeoutError);
    const backendFailure = assert.rejects(backend.getProduct('real-product'), timeoutError);
    await flush();
    assert.equal(h.calls.length, 1);
    await h.clock.advance(15000);
    await Promise.all([modeFailure, backendFailure]);
    assert.equal(h.calls[0].options.signal.aborted, true);
    assert.equal(h.backendCalls.length, 0, 'mode errors must never select demo');
    assert.equal(h.clock.tasks.size, 0);
    await h.clock.advance(15000);
    assert.equal(h.calls.length, 1, 'no automatic mode retry');
    h.setFetch(async (url) => url === '/api/catalogue/mode' ? response({ mode: 'live' }) : response({ product: { id: 'real-product' } }));
    const third = catalogueMode();
    assert.notEqual(third, first);
    assert.equal(await third, 'live');
    assert.equal((await backend.getProduct('real-product')).id, 'real-product');
    assert.equal(h.calls.filter((call) => call.url === '/api/catalogue/mode').length, 2);
    assert.equal(h.backendCalls.length, 0);
    assert.equal(h.clock.tasks.size, 0);
  });
}

test('late failure of timed-out mode read cannot clear a newer in-flight or successful mode', async () => {
  const old = deferred(), next = deferred();
  const h = harness({ fetchImpl: () => old.promise });
  const { catalogueMode } = h.load('src/search/index.ts');
  const failed = assert.rejects(catalogueMode(), timeoutError);
  await flush();
  await h.clock.advance(15000);
  await failed;
  h.setFetch(() => next.promise);
  const retry = catalogueMode();
  await flush();
  old.reject(new Error('late old network failure'));
  await flush();
  assert.equal(catalogueMode(), retry);
  assert.equal(h.calls.length, 2);
  next.resolve(response({ mode: 'live' }));
  assert.equal(await retry, 'live');
  assert.equal(await catalogueMode(), 'live');
  assert.equal(h.calls.length, 2);
});

test('configured and explicit preview modes make no mode HTTP request', async () => {
  for (const [config, search, storedPreview, expected] of [
    ['local', '?catalogue=live', undefined, 'demo'],
    ['typesense', '?catalogue=demo', undefined, 'live'],
    ['auto', '?catalogue=live', undefined, 'live'],
    ['auto', '?catalogue=demo', undefined, 'demo'],
    ['auto', '', 'demo', 'demo'],
    ['auto', '', 'live', 'live'],
  ]) {
    const h = harness({ config, search, storedPreview });
    const { catalogueMode } = h.load('src/search/index.ts');
    assert.equal(await catalogueMode(), expected);
    assert.equal(h.calls.length, 0);
    assert.equal(h.clock.tasks.size, 0);
  }
  const h = harness({ search: '?catalogue=auto', storedPreview: 'demo', fetchImpl: async () => response({ mode: 'live' }) });
  assert.equal(await h.load('src/search/index.ts').catalogueMode(), 'live');
  assert.equal(h.storage.has('tagora_catalogue'), false);
  assert.equal(h.calls.length, 1);
});

test('only explicit valid mode or HTTP404 selects and caches demo/live', async () => {
  for (const [res, expected] of [[response({ ok: true, mode: 'live' }), 'live'], [response({ mode: 'demo' }), 'demo'], [{ ...response(null, 404), json: () => { throw new Error('404 body not needed'); } }, 'demo']]) {
    const h = harness({ fetchImpl: async () => res });
    const { catalogueMode } = h.load('src/search/index.ts');
    assert.equal(await catalogueMode(), expected);
    assert.equal(await catalogueMode(), expected);
    assert.equal(h.calls.length, 1);
    assert.equal(h.clock.tasks.size, 0);
  }
});

test('mode network, non404 status, malformed, unknown and ok:false failures never select demo', async () => {
  const cases = [
    () => Promise.reject(new Error('offline')),
    ...[403, 429, 500].map((status) => async () => response({ mode: 'demo' }, status)),
    ...[null, {}, { mode: 'unknown' }, { ok: false, mode: 'demo' }, { mode: 1 }].map((data) => async () => response(data)),
    async () => ({ ...response(null), json: async () => { throw new SyntaxError('broken'); } }),
  ];
  for (const fetchImpl of cases) {
    const h = harness({ fetchImpl });
    const { backend, catalogueMode } = h.load('src/search/index.ts');
    await assert.rejects(backend.getProduct('real'));
    assert.equal(h.backendCalls.length, 0);
    assert.equal(h.clock.tasks.size, 0);
    h.setFetch(async () => response({ mode: 'demo' }));
    assert.equal(await catalogueMode(), 'demo');
    assert.equal((await backend.getProduct('example')).kind, 'demo');
    assert.equal(h.calls.length, 2);
  }
});

test('useIsDemo consumes rejection, observes successful manual retry and stops updates on unmount', async () => {
  const h = harness({ fetchImpl: async () => response({ mode: 'demo' }, 503) });
  const mounted = h.mountDemoHook(), removed = h.mountDemoHook();
  await flush();
  assert.equal(h.calls.length, 1);
  assert.equal(mounted.value, false);
  assert.equal(removed.value, false);
  removed.unmount();
  const updates = removed.updates.length;
  h.setFetch(async () => response({ mode: 'demo' }));
  assert.equal(await h.load('src/search/index.ts').catalogueMode(), 'demo');
  await flush();
  assert.equal(mounted.value, true, 'already mounted footer must recover after retry');
  assert.equal(removed.value, false);
  assert.equal(removed.updates.length, updates, 'unmounted subscriber must receive no update');
  mounted.unmount();
});

test('useIsDemo unmount ignores its initial unresolved mode callback', async () => {
  const pending = deferred();
  const h = harness({ fetchImpl: () => pending.promise });
  const hook = h.mountDemoHook();
  await flush();
  hook.unmount();
  const updates = hook.updates.length;
  pending.resolve(response({ mode: 'demo' }));
  await flush();
  assert.equal(hook.value, false);
  assert.equal(hook.updates.length, updates);
  assert.equal(h.clock.tasks.size, 0);
});

function productLoader(h, backend) {
  // Extract the complete existing loader by its exported component boundary; no rewritten logic.
  const page = source('src/pages/ProductPage.tsx');
  const begin = page.indexOf('async function loadProduct('), end = page.indexOf('\nexport function ProductPage');
  assert(begin > 0 && end > begin, 'ProductPage loader boundary changed; update this integration harness');
  const comparison = h.load('shared/offer-comparison.ts');
  const code = ts.transpileModule(`${page.slice(begin, end)}\nexport { loadProduct };`, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, backend, matchingOffers: comparison.matchingOffers }, { filename: 'ProductPage.loadProduct.ts' });
  return exports.loadProduct;
}

test('actual ProductPage loader turns stalled offers into keyed failure, then succeeds on manual retry', async () => {
  const p = { id: 'shop-a', groupId: 'group-a', shopId: 'a', shop: 'A', brand: 'Adidas', mpn: 'GW6453', matchKey: 'mpn:adidas:gw6453', countries: ['gr'], title: 'Shoe', size: '34', price: 45, color: 'black' };
  let stallOffers = true;
  const h = harness({ fetchImpl: async (url) => {
    if (url === '/api/catalogue/mode') return response({ mode: 'live' });
    if (url.includes('/products/')) return response({ product: p });
    if (url.includes('/variants')) return response({ products: [p] });
    if (url.includes('/offers')) return stallOffers ? new Promise(() => {}) : response({ products: [p] });
    assert.fail(`Unexpected request ${url}`);
  } });
  const load = productLoader(h, h.load('src/search/index.ts').backend);
  const key = JSON.stringify([p.id, 'gr', '34', 0]);
  const initial = load(p.id, 'gr', '34', key);
  await flush();
  assert.equal(h.calls.length, 4);
  await h.clock.advance(15000);
  const failed = await initial;
  assert.equal(failed.requestKey, key);
  assert.equal(failed.failed, true);
  assert.equal(failed.product, null);
  assert.equal(failed.offers.length, 0);
  assert.equal(failed.variants.length, 0);
  assert.equal(h.calls.find((c) => c.url.includes('/offers')).options.signal.aborted, true);
  stallOffers = false;
  const retryKey = JSON.stringify([p.id, 'gr', '34', 1]);
  const result = await load(p.id, 'gr', '34', retryKey);
  assert.equal(result.requestKey, retryKey);
  assert.equal(result.failed, undefined);
  assert.equal(result.product.id, p.id);
  assert.equal(result.offers.length, 1);
  assert.equal(h.calls.filter((c) => c.url === '/api/catalogue/mode').length, 1);
  assert.equal(h.clock.tasks.size, 0);
});

test('actual ProductPage loader does not fall into demo after mode timeout and retries the mode', async () => {
  const h = harness({ fetchImpl: () => new Promise(() => {}) });
  const load = productLoader(h, h.load('src/search/index.ts').backend);
  const failed = load('missing', 'gr', undefined, 'attempt-0');
  await flush();
  await h.clock.advance(15000);
  assert.equal((await failed).failed, true);
  assert.equal(h.backendCalls.length, 0);
  h.setFetch(async (url) => url === '/api/catalogue/mode' ? response({ mode: 'live' }) : response(null, 404));
  const retry = await load('missing', 'gr', undefined, 'attempt-1');
  assert.equal(retry.failed, undefined);
  assert.equal(retry.product, null, 'a real 404 stays a missing product, not a demo substitute');
  assert.equal(retry.requestKey, 'attempt-1');
  assert.equal(h.calls.filter((c) => c.url === '/api/catalogue/mode').length, 2);
});

test('actual useAsync cleanup prevents an older timeout replacing a newer product result', async () => {
  const h = harness({ fetchImpl: async (url) => url.endsWith('/old')
    ? new Promise(() => {}) : response({ product: { id: 'new' } }) });
  const backend = h.load('src/search/api.ts').createApiBackend();
  const hooksSource = source('src/lib/hooks.ts');
  const begin = hooksSource.indexOf('export function useAsync<');
  const end = hooksSource.indexOf('\n/**', begin);
  assert(begin >= 0 && end > begin, 'useAsync boundary changed; update the integration harness');
  const code = ts.transpileModule(hooksSource.slice(begin, end), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  let state = { loading: true }, effect;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    useState: () => [state, (value) => { state = typeof value === 'function' ? value(state) : value; }],
    useEffect: (value) => { effect = value; },
  }, { filename: 'hooks.useAsync.ts' });
  exports.useAsync(() => backend.getProduct('old'), ['old']);
  const leaveOld = effect();
  await flush();
  leaveOld();
  exports.useAsync(() => backend.getProduct('new'), ['new']);
  const leaveNew = effect();
  await flush();
  assert.equal(state.data.id, 'new');
  assert.equal(state.loading, false);
  await h.clock.advance(15000);
  assert.equal(h.calls[0].options.signal.aborted, true);
  assert.equal(state.data.id, 'new');
  assert.equal(state.loading, false);
  assert.equal(state.error, undefined);
  assert.equal(h.clock.tasks.size, 0);
  leaveNew();
});
