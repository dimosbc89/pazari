import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACCOUNT, PROVIDER, SCOPE, SERVICE_ACCOUNT, PreflightError, publicError, assertGithubContext, assertSafeRequest, assertAccount, requestUrl, runPreflight } from './css-preflight.mjs';

const token = 'TEST-BEARER-TOKEN-DO-NOT-PRINT';
const key = 'TEST-API-KEY-DO-NOT-PRINT';
const account = { name: ACCOUNT, accountType: 'CSS_DOMAIN', homepageUri: 'https://tagora.online/' };
const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'dimosbc89/pazari', GITHUB_REPOSITORY_ID: '1442881486', GITHUB_REPOSITORY_OWNER_ID: '72251765', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: 'dimosbc89/pazari/.github/workflows/css-preflight.yml@refs/heads/main', GCP_WIF_PROVIDER: PROVIDER, CSS_OAUTH_SCOPE: SCOPE };
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const product = suffix => ({ name: `${ACCOUNT}/cssProducts/el~GR~${suffix}`, attributes: { description: 'A response body must never appear in the summary.' } });
const quota = suffix => ({ name: `${ACCOUNT}/quotas/${suffix}`, quotaUsage: '0', quotaLimit: '10000', quotaMinuteLimit: '100' });
function stub(sequence) {
  const calls = [], sleepCalls = [];
  return { calls, sleepCalls, options: { accessToken: token, apiKey: key, scope: SCOPE,
    sleep: async ms => { sleepCalls.push(ms); },
    fetchImpl: async (url, options) => { calls.push({ url, options }); const next = sequence.shift(); assert(next, 'Unexpected extra request'); if (next instanceof Error) throw next; return typeof next === 'function' ? next(url, options) : next; } } };
}
const code = value => error => error instanceof PreflightError && error.code === value;

test('only exact manual main workflow, repo IDs, provider and scope accepted', () => {
  assert.doesNotThrow(() => assertGithubContext(env));
  for (const name of Object.keys(env)) assert.throws(() => assertGithubContext({ ...env, [name]: 'wrong' }));
});
test('only fixed account and three GET paths are constructible', () => {
  for (const kind of ['account', 'quotas', 'products']) assert.doesNotThrow(() => assertSafeRequest(requestUrl(kind)));
  assert.throws(() => requestUrl('cssProductInputs'), code('URL'));
  assert.throws(() => requestUrl('account', 'token'), code('URL'));
});
test('unsafe URLs, child scopes, mutation paths, body and methods rejected', () => {
  const base = `https://css.googleapis.com/v1/${ACCOUNT}`;
  for (const unsafe of ['https://evil.example/', base.replace('5900257120', '5899395261'), `${base}/cssProductInputs`, `${base}/cssProducts/product`, `${base}:updateLabels`, `${base}?parent=accounts/other`, `${base}/cssProducts?pageSize=100&key=secret`, `${base}/cssProducts?pageSize=100&pageSize=100`, `${base}/../5900257120`, `https://css.googleapis.com:443/v1/${ACCOUNT}`, `${base}#token`, `https://user:pass@css.googleapis.com/v1/${ACCOUNT}`]) assert.throws(() => assertSafeRequest(unsafe), code('URL'));
  for (const method of ['POST', 'PATCH', 'DELETE', 'PUT', 'HEAD']) assert.throws(() => assertSafeRequest(base, { method }), code('URL'));
  assert.throws(() => assertSafeRequest(base, { body: '' }), code('URL'));
});
test('opaque pagination data is encoded, never followed as a URL', () => {
  const result = requestUrl('products', 'https://evil.example/path?token=other');
  assert.equal(new URL(result).origin, 'https://css.googleapis.com');
  assert.equal(new URL(result).searchParams.get('pageToken'), 'https://evil.example/path?token=other');
  assert.throws(() => requestUrl('products', '\nInjected'), code('PAGINATION'));
});
test('wrong account, merchant account, homepage and homepage credentials rejected', () => {
  assert.doesNotThrow(() => assertAccount(account));
  for (const bad of [{ ...account, name: 'accounts/5899395261' }, { ...account, accountType: 'MC_CSS_MCA' }, { ...account, homepageUri: 'https://evil.example/' }, { ...account, homepageUri: 'https://tagora.online.evil.example/' }, { ...account, homepageUri: 'https://user:pass@tagora.online/' }, { ...account, homepageUri: 'https://tagora.online/?redirect=evil' }]) assert.throws(() => assertAccount(bad), code('ACCOUNT'));
});
test('successful read fetches account first, quotas, products with headers only', async () => {
  const mock = stub([json(account), json({ quotaGroups: [quota('list')] }), json({ cssProducts: [product('one')] })]);
  const result = await runPreflight(mock.options);
  assert.equal(result.processedProducts, 1); assert.equal(result.requests, 3); assert.equal(result.writes, 0); assert.equal(result.submittedProducts, 0);
  assert.equal(result.quotaGroups[0].dailyLimit, '10000');
  for (const call of mock.calls) { assert.equal(call.options.method, 'GET'); assert.equal(call.options.redirect, 'error'); assert.equal(call.options.body, undefined); assert.equal(call.options.headers.Authorization, `Bearer ${token}`); assert.equal(call.options.headers['X-Goog-Api-Key'], key); assert(!call.url.includes(token)); assert(!call.url.includes(key)); }
  assert(!JSON.stringify(result).includes(token)); assert(!JSON.stringify(result).includes(key)); assert(!JSON.stringify(result).includes('response body'));
});
test('account mismatch stops before quota/product requests', async () => {
  const mock = stub([json({ ...account, name: 'accounts/other' })]);
  await assert.rejects(runPreflight(mock.options), code('ACCOUNT')); assert.equal(mock.calls.length, 1);
});
test('only auth/content scope accepted and credentials required before network', async () => {
  const mock = stub([]);
  await assert.rejects(runPreflight({ ...mock.options, scope: 'https://www.googleapis.com/auth/cloud-platform' }), code('SCOPE'));
  await assert.rejects(runPreflight({ ...mock.options, accessToken: '' }), code('CREDENTIALS'));
  await assert.rejects(runPreflight({ ...mock.options, apiKey: 'secret\ninjection' }), code('CREDENTIALS'));
  assert.equal(mock.calls.length, 0);
});
test('empty processed collection is a valid complete read', async () => {
  const mock = stub([json(account), json({}), json({})]);
  const result = await runPreflight(mock.options); assert.equal(result.processedProducts, 0); assert.equal(result.pages.products, 1);
});
test('pagination uses unchanged own-account endpoint and counts both pages', async () => {
  const mock = stub([json(account), json({ quotaGroups: [quota('one')] }), json({ cssProducts: [product('one')], nextPageToken: 'opaque/token?x=1' }), json({ cssProducts: [product('two')] })]);
  const result = await runPreflight(mock.options); assert.equal(result.processedProducts, 2); assert.equal(result.pages.products, 2);
  assert.equal(new URL(mock.calls.at(-1).url).searchParams.get('pageToken'), 'opaque/token?x=1');
});
test('other-account returned product is rejected', async () => {
  const mock = stub([json(account), json({}), json({ cssProducts: [{ name: 'accounts/other/cssProducts/el~GR~one' }] })]);
  await assert.rejects(runPreflight(mock.options), code('ACCOUNT'));
});
test('other-account returned quota is rejected before products', async () => {
  const mock = stub([json(account), json({ quotaGroups: [{ name: 'accounts/other/quotas/list' }] })]);
  await assert.rejects(runPreflight(mock.options), code('ACCOUNT')); assert.equal(mock.calls.length, 2);
});
test('repeated page token or duplicate product does not loop or double count', async () => {
  for (const responses of [[{ cssProducts: [product('one')], nextPageToken: 'a' }, { cssProducts: [product('two')], nextPageToken: 'a' }], [{ cssProducts: [product('one')], nextPageToken: 'a' }, { cssProducts: [product('one')] }]]) {
    const mock = stub([json(account), json({}), ...responses.map(r => json(r))]); await assert.rejects(runPreflight(mock.options)); assert.equal(mock.calls.length, 4);
  }
});
test('pagination is capped at five pages, not silently truncated', async () => {
  const mock = stub([json(account), json({}), ...Array.from({ length: 5 }, (_, i) => json({ cssProducts: [product(i)], nextPageToken: `page-${i}` }))]);
  await assert.rejects(runPreflight(mock.options), code('PAGINATION')); assert.equal(mock.calls.length, 7);
});
test('429 retry is bounded and Retry-After capped', async () => {
  const mock = stub([json({}, 429, { 'retry-after': '99999' }), json(account), json({}), json({})]);
  const result = await runPreflight(mock.options); assert.equal(result.requests, 4); assert.deepEqual(mock.sleepCalls, [2000]);
});
test('503 failure stops after three attempts', async () => {
  const mock = stub([json({}, 503), json({}, 503), json({}, 503)]);
  await assert.rejects(runPreflight(mock.options), code('HTTP')); assert.equal(mock.calls.length, 3); assert.deepEqual(mock.sleepCalls, [250, 500]);
});
test('403 is not retried and response error secrets never enter exceptions', async () => {
  const mock = stub([json({ error: { message: `${token} ${key}` } }, 403)]);
  try { await runPreflight(mock.options); assert.fail(); } catch (error) { assert.equal(error.code, 'HTTP'); const output = JSON.stringify(publicError(error)); assert(!output.includes(token)); assert(!output.includes(key)); assert.equal(publicError(error).httpStatus, 403); }
  assert.equal(mock.calls.length, 1);
});
test('network failures are retried without printing sensitive exception text', async () => {
  const mock = stub(Array.from({ length: 3 }, () => new Error(`Authorization: Bearer ${token}; key=${key}`)));
  try { await runPreflight(mock.options); assert.fail(); } catch (error) { assert.equal(error.code, 'NETWORK'); assert(!String(error).includes(token)); assert(!JSON.stringify(publicError(error)).includes(key)); }
  assert.equal(mock.calls.length, 3);
});
test('unexpected thrown errors are reduced to a fixed public code', () => {
  assert.deepEqual(publicError(new Error(`${token} ${key}`)), { ok: false, error: 'RESPONSE', account: ACCOUNT, writes: 0 });
});
test('redirected responses fail without trusting their body', async () => {
  const response = json(account); Object.defineProperty(response, 'redirected', { value: true });
  await assert.rejects(runPreflight(stub([response]).options), code('URL'));
});
test('invalid JSON, oversized response and 200 error envelope fail closed', async () => {
  for (const response of [new Response(`${token} invalid`, { headers: { 'content-type': 'application/json' } }), json(account, 200, { 'content-length': String(3 * 1024 * 1024) }), json({ error: { message: key } })]) {
    const mock = stub([response]); await assert.rejects(runPreflight(mock.options), code('RESPONSE')); assert.equal(mock.calls.length, 1);
  }
});
test('overall 90-second deadline prevents further calls', async () => {
  let i = 0; const mock = stub([]);
  await assert.rejects(runPreflight({ ...mock.options, now: () => i++ === 0 ? 0 : 90001 }), code('TIMEOUT')); assert.equal(mock.calls.length, 0);
});
test('workflow is manual, main-only, SHA-pinned and secret passed only as env', async () => {
  const workflow = await readFile(new URL('../.github/workflows/css-preflight.yml', import.meta.url), 'utf8');
  const actions = [...workflow.matchAll(/uses: ([^\s]+)@([a-f0-9]{40})/g)]; assert.equal(actions.length, 3);
  assert(workflow.includes('workflow_dispatch:')); assert(!/\n\s*(push|pull_request|schedule|workflow_call):/.test(workflow));
  assert(workflow.includes("github.ref == 'refs/heads/main'")); assert(workflow.includes('persist-credentials: false'));
  assert(workflow.includes('create_credentials_file: false')); assert(workflow.includes('export_environment_variables: false'));
  assert(workflow.includes(`service_account: ${SERVICE_ACCOUNT}`)); assert(workflow.includes(`access_token_scopes: ${SCOPE}`));
  assert(workflow.includes('CSS_API_KEY: ${{ secrets.TAGORA_CSS_API_KEY }}')); assert(!workflow.includes('credentials_json:'));
  assert(workflow.indexOf('node --test') < workflow.indexOf('id: google-auth')); assert(!workflow.includes('npm install'));
});
test('workflow audience, secret name and token lifetime match the fixed contract', async () => {
  const workflow = await readFile(new URL('../.github/workflows/css-preflight.yml', import.meta.url), 'utf8');
  const audience = `https://iam.googleapis.com/${PROVIDER}`;
  assert.equal(workflow.match(/^\s+audience:\s*(\S+)$/m)?.[1], audience);
  assert(workflow.includes('CSS_API_KEY: ${{ secrets.TAGORA_CSS_API_KEY }}'));
  assert.equal(workflow.match(/^\s+access_token_lifetime:\s*(\S+)$/m)?.[1], '600s');
  assert(workflow.includes('            /.github/workflows/css-preflight.yml'));
});
