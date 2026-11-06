// Exercises the real public route and its edge-cache boundary. No network or writes.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleApi } from '../worker/routes.ts';

const product = (id, size, extras = {}) => ({
  id, groupId:id, shopId:id, shop:id, brand:'Adidas', mpn:'F35555', matchKey:'mpn:adidas:f35555',
  title:'Adidas Adilette', category:'shoes', color:'White', size, countries:['gr'],
  price:20, url:`https://${id}.example/product`, image:`https://${id}.example/image.jpg`, ...extras,
});

test('offers route isolates reference/size cache entries and rejects invalid references', async () => {
  const products = [product('shop-a','38,39'), product('shop-b','38'), product('shop-c','39')];
  let reads=0;
  const DB={prepare(sql) {
    assert.match(sql,/^SELECT doc FROM products WHERE/);
    assert.match(sql,/listed = 1/);
    return {bind(...params) { return {
      async first() { reads++; return products.find(p=>p.id===params[0]) ? {doc:JSON.stringify(products.find(p=>p.id===params[0]))} : null; },
      async all() {
        reads++; assert.match(sql,/match_key = \?/); assert.match(sql,/LIMIT 100/);
        return {results:products.filter(p=>p.matchKey===params[0] && params[1]==='%,gr,%').map(p=>({doc:JSON.stringify(p)}))};
      },
    }; }};
  }};
  const stored=new Map();
  const previous=Object.getOwnPropertyDescriptor(globalThis,'caches');
  Object.defineProperty(globalThis,'caches',{configurable:true,value:{default:{
    async match(req) { return stored.get(req.url)?.clone(); },
    async put(req,res) { stored.set(req.url,res.clone()); },
  }}});
  const call=async values=>{
    const pending=[];
    const url=new URL('https://tagora.example/api/catalogue/offers');
    for(const [k,v] of Object.entries({country:'gr',key:'mpn:adidas:f35555',...values})) if(v!==undefined) url.searchParams.set(k,v);
    const response=await handleApi(new Request(url),{DB},{waitUntil:p=>pending.push(p)});
    await Promise.all(pending);
    return {status:response.status,data:await response.json()};
  };
  try {
    // A stale response with the old URL must never be used after the rollout.
    stored.set('https://tagora.example/api/catalogue/offers?country=gr&key=mpn%3Aadidas%3Af35555&product=shop-a&size=38',Response.json({products:[product('wrong','99')]}));
    assert.deepEqual((await call({product:'shop-a',size:'38'})).data.products.map(p=>p.id),['shop-a','shop-b']);
    const firstReads=reads;
    assert.deepEqual((await call({size:'38',product:'shop-a',ignored:'value'})).data.products.map(p=>p.id),['shop-a','shop-b']);
    assert.equal(reads,firstReads,'same meaningful parameters should hit cache');
    assert.deepEqual((await call({product:'shop-a',size:'39'})).data.products.map(p=>p.id),['shop-a','shop-c']);
    assert.ok(reads>firstReads,'another size must read another cached entry');
    assert.deepEqual((await call({product:'shop-b',size:'39'})).data.products,[],'size unavailable on reference');
    assert.deepEqual((await call({product:'shop-a',size:''})).data.products,[],'explicit empty size cannot fall back');
    assert.deepEqual((await call({product:'shop-a'})).data.products.map(p=>p.id),['shop-a'],'unselected multi-size only shows itself');
    assert.deepEqual((await call({product:'shop-b'})).data.products.map(p=>p.id),['shop-a','shop-b'],'single size is selected implicitly');
    assert.deepEqual((await call({product:'shop-a',key:'mpn:other:model',size:'38'})).data.products,[]);
    assert.deepEqual((await call({product:'unlisted',size:'38'})).data.products,[]);
    assert.deepEqual((await call({product:'shop-a',country:'cy',size:'38'})).data.products,[]);
    assert.deepEqual((await call({size:'38'})).data.products,[],'legacy key-only requests fail closed');
    assert.equal((await call({product:'shop-a',size:'x'.repeat(81)})).status,400);
    assert.equal((await call({product:'shop-a',country:'xx'})).status,400);
    const newKeys=[...stored.keys()].filter(k=>k.includes('_comparison=2'));
    assert.ok(newKeys.some(k=>k.includes('product=shop-a')&&k.includes('size=38')));
    assert.ok(newKeys.some(k=>k.includes('product=shop-a')&&k.includes('size=39')));
    assert.ok(newKeys.some(k=>k.includes('product=shop-b')));
  } finally {
    if(previous) Object.defineProperty(globalThis,'caches',previous); else delete globalThis.caches;
  }
});
