import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ACCOUNT, PROJECT_ID, PROJECT_NUMBER, PROVIDER, SCOPE, SERVICE_ACCOUNT, PreflightError, publicError, assertGithubContext, assertSafeRequest, assertSafeRegistrationRequest, assertAccount, requestUrl, registrationRequestUrl, runPreflight } from './css-preflight.mjs';

const token = 'TEST-BEARER-TOKEN-DO-NOT-PRINT';
const key = 'TEST-API-KEY-DO-NOT-PRINT';
const account = { name: ACCOUNT, accountType: 'CSS_DOMAIN', homepageUri: 'https://tagora.online/' };
const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'dimosbc89/pazari', GITHUB_REPOSITORY_ID: '1442881486', GITHUB_REPOSITORY_OWNER_ID: '72251765', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: 'dimosbc89/pazari/.github/workflows/css-preflight.yml@refs/heads/main', GCP_WIF_PROVIDER: PROVIDER, CSS_OAUTH_SCOPE: SCOPE };
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const product = suffix => ({ name: `${ACCOUNT}/cssProducts/el~GR~${suffix}`, attributes: { description: 'A response body must never appear in the summary.' } });
const quota = suffix => ({ name: `${ACCOUNT}/quotas/${suffix}`, quotaUsage: '0', quotaLimit: '10000', quotaMinuteLimit: '100' });
const registered = (id = PROJECT_NUMBER) => [json({ name: ACCOUNT }), json({ name: `${ACCOUNT}/developerRegistration`, gcpIds: [id] })];
const cssReads = () => [json(account), json({}), json({})];
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
test('successful read checks CSS before both registration GETs and keeps key on CSS', async () => {
  const mock = stub([json(account), json({ quotaGroups: [quota('list')] }), json({ cssProducts: [product('one')] }), ...registered()]);
  const result = await runPreflight(mock.options);
  assert.equal(result.processedProducts, 1); assert.equal(result.requests, 5); assert.equal(result.writes, 0); assert.equal(result.submittedProducts, 0);
  assert.equal(result.ok, true); assert.equal(result.registration.status, 'confirmed');
  assert.equal(result.quotaGroups[0].dailyLimit, '10000');
  assert.deepEqual(mock.calls.map(call => new URL(call.url).hostname), ['css.googleapis.com', 'css.googleapis.com', 'css.googleapis.com', 'merchantapi.googleapis.com', 'merchantapi.googleapis.com']);
  for (const call of mock.calls) { assert.equal(call.options.method, 'GET'); assert.equal(call.options.redirect, 'error'); assert.equal(call.options.body, undefined); assert.equal(call.options.headers.Authorization, `Bearer ${token}`); assert.equal(call.options.headers['X-Goog-Api-Key'], new URL(call.url).hostname === 'css.googleapis.com' ? key : undefined); assert(!call.url.includes(token)); assert(!call.url.includes(key)); }
  for (const call of mock.calls.slice(3)) { assert.equal(new URL(call.url).search, ''); assert(!JSON.stringify(call.options).includes(key)); }
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
  const mock = stub([...cssReads(), ...registered()]);
  const result = await runPreflight(mock.options); assert.equal(result.processedProducts, 0); assert.equal(result.pages.products, 1);
});
test('pagination uses unchanged own-account endpoint and counts both pages', async () => {
  const mock = stub([json(account), json({ quotaGroups: [quota('one')] }), json({ cssProducts: [product('one')], nextPageToken: 'opaque/token?x=1' }), json({ cssProducts: [product('two')] }), ...registered()]);
  const result = await runPreflight(mock.options); assert.equal(result.processedProducts, 2); assert.equal(result.pages.products, 2);
  assert.equal(new URL(mock.calls[3].url).searchParams.get('pageToken'), 'opaque/token?x=1');
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
  const mock = stub([json({}, 429, { 'retry-after': '99999' }), ...cssReads(), ...registered()]);
  const result = await runPreflight(mock.options); assert.equal(result.requests, 6); assert.deepEqual(mock.sleepCalls, [2000]);
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

test('Merchant allowlist accepts only two exact GET URLs and no request body', () => {
  for (const kind of ['project', 'account']) {
    const url = registrationRequestUrl(kind);
    assert.equal(assertSafeRegistrationRequest(url), url);
    assert.throws(() => assertSafeRequest(url), code('URL'));
    for (const method of ['POST', 'PATCH', 'DELETE', 'PUT', 'HEAD']) assert.throws(() => assertSafeRegistrationRequest(url, { method }), code('URL'));
    for (const body of ['', null, {}, 'developerEmail=test@example.com']) assert.throws(() => assertSafeRegistrationRequest(url, { body }), code('URL'));
    for (const unsafe of [`${url}?key=${key}`, `${url}?pageSize=100`, `${url}#token`, `${url}/`, url.replace('https:', 'http:'), url.replace('merchantapi.googleapis.com', 'merchantapi.googleapis.com.evil.example'), url.replace('https://', 'https://user:pass@'), url.replace('googleapis.com/', 'googleapis.com:443/')]) assert.throws(() => assertSafeRegistrationRequest(unsafe), code('URL'));
  }
  for (const unsafe of [requestUrl('account'), registrationRequestUrl('account').replace('5900257120', '5899395261'), `${registrationRequestUrl('account')}:registerGcp`, `${registrationRequestUrl('account')}:unregisterGcp`]) assert.throws(() => assertSafeRegistrationRequest(unsafe), code('URL'));
  assert.throws(() => registrationRequestUrl('registerGcp'), code('URL'));
});

test('registration confirms only both matching responses for the current project', async () => {
  for (const id of [PROJECT_NUMBER, PROJECT_ID]) {
    const mock = stub([...cssReads(), ...registered(id)]);
    const result = await runPreflight(mock.options);
    assert.equal(result.ok, true); assert.equal(result.registration.status, 'confirmed');
    assert.deepEqual(result.registration.checks, { project: { ok: true, matchesAccount: true }, account: { ok: true, matchesAccount: true, containsProject: true } });
    assert(result.limitation.includes('Human developer-contact acceptance is not checked'));
  }
});

test('different registration account or absent project membership is a mismatch', async () => {
  const cases = [
    [{ name: 'accounts/5899395261' }, { name: `${ACCOUNT}/developerRegistration`, gcpIds: [PROJECT_NUMBER] }],
    [{ name: ACCOUNT }, { name: 'accounts/5899395261/developerRegistration', gcpIds: [PROJECT_NUMBER] }],
    [{ name: ACCOUNT }, { name: `${ACCOUNT}/developerRegistration`, gcpIds: ['111111111111'] }],
    [{ name: ACCOUNT }, { name: `${ACCOUNT}/developerRegistration`, gcpIds: [] }]
  ];
  for (const pair of cases) {
    const mock = stub([...cssReads(), ...pair.map(body => json(body))]);
    const result = await runPreflight(mock.options);
    assert.equal(result.ok, false); assert.equal(result.registration.status, 'project_mismatch'); assert.equal(result.writes, 0); assert.equal(mock.calls.length, 5);
    assert(!JSON.stringify(result).includes('111111111111'));
  }
});

const disabledBody = (consumer = `projects/${PROJECT_NUMBER}`, service = 'merchantapi.googleapis.com') => ({ error: { code: 403, status: 'PERMISSION_DENIED', message: `${token} ${key}`, details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', domain: 'googleapis.com', reason: 'SERVICE_DISABLED', metadata: { service, consumer } }] } });
test('disabled Merchant API is unknown, never auto-enabled or retried', async () => {
  const mock = stub([...cssReads(), json(disabledBody(), 403), json(disabledBody(), 403)]);
  const result = await runPreflight(mock.options);
  assert.equal(result.ok, false); assert.equal(result.registration.status, 'unknown'); assert.equal(result.registration.reason, 'SERVICE_DISABLED'); assert.equal(result.processedProducts, 0);
  assert.equal(mock.calls.length, 5); assert.deepEqual(mock.sleepCalls, []);
  assert(!JSON.stringify(result).includes(token)); assert(!JSON.stringify(result).includes(key));
});
test('SERVICE_DISABLED for another project or API is not attributed to Tagora', async () => {
  for (const body of [disabledBody('projects/111111111111'), disabledBody(`projects/${PROJECT_NUMBER}`, 'css.googleapis.com')]) {
    const mock = stub([...cssReads(), json(body, 403), registered()[1]]);
    const result = await runPreflight(mock.options);
    assert.equal(result.registration.status, 'unknown'); assert.equal(result.registration.reason, 'HTTP'); assert.equal(result.registration.checks.project.httpStatus, 403);
  }
});

const unregisteredBody = (projectId = PROJECT_ID, projectNumber = PROJECT_NUMBER) => ({ error: { code: 401, status: 'UNAUTHENTICATED', message: `GCP project with id ${projectId} and number ${projectNumber} is not registered with the merchant account. Follow the registration documentation. ${token} ${key}` } });
test('specific documented unregistered-project error is separated from generic 401', async () => {
  const mock = stub([...cssReads(), json(unregisteredBody(), 401), json(unregisteredBody(), 401)]);
  const result = await runPreflight(mock.options);
  assert.equal(result.ok, false); assert.equal(result.registration.status, 'unknown'); assert.equal(result.registration.reason, 'PROJECT_NOT_REGISTERED'); assert.equal(mock.calls.length, 5);
  assert(!JSON.stringify(result).includes(token)); assert(!JSON.stringify(result).includes(key));
  for (const body of [unregisteredBody('another-project', '111111111111'), { error: { code: 401, status: 'UNAUTHENTICATED', message: 'Invalid credentials' } }]) {
    const other = stub([...cssReads(), json(body, 401), registered()[1]]);
    assert.equal((await runPreflight(other.options)).registration.reason, 'HTTP');
  }
});

test('generic Merchant 403/404 remain unknown and never imply no registration', async () => {
  for (const status of [403, 404]) {
    const mock = stub([...cssReads(), json({ error: { code: status, message: `${token} ${key}` } }, status), registered()[1]]);
    const result = await runPreflight(mock.options);
    assert.equal(result.ok, false); assert.equal(result.registration.status, 'unknown'); assert.equal(result.registration.reason, 'HTTP'); assert.equal(result.registration.checks.project.httpStatus, status);
    assert.equal(mock.calls.length, 5); assert.deepEqual(mock.sleepCalls, []); assert(!JSON.stringify(result).includes(token)); assert(!JSON.stringify(result).includes(key));
  }
});

test('one confirmed response cannot hide an unknown second response', async () => {
  const mock = stub([...cssReads(), registered()[0], json({ error: { code: 403, message: key } }, 403)]);
  const result = await runPreflight(mock.options);
  assert.equal(result.registration.status, 'unknown'); assert.equal(result.ok, false); assert.equal(result.registration.checks.project.ok, true); assert.equal(result.registration.checks.account.ok, false);
});

test('positive identity mismatch remains visible even if the other read fails', async () => {
  const mock = stub([...cssReads(), json({ name: 'accounts/5899395261' }), json({}, 403)]);
  const result = await runPreflight(mock.options);
  assert.equal(result.registration.status, 'project_mismatch'); assert.equal(result.registration.checks.account.reason, 'HTTP'); assert.equal(result.ok, false);
});

test('malformed registration success bodies fail closed without leaking fields', async () => {
  for (const pair of [
    [{ name: `${token}` }, { name: `${ACCOUNT}/developerRegistration`, gcpIds: [PROJECT_NUMBER] }],
    [{ name: ACCOUNT }, { name: `${ACCOUNT}/developerRegistration` }],
    [{ name: ACCOUNT }, { name: `${ACCOUNT}/developerRegistration`, gcpIds: [404604349240] }],
    [{ name: ACCOUNT }, { name: `${ACCOUNT}/developerRegistration`, gcpIds: [key + '\n'] }],
    [{ error: { message: key } }, { name: `${ACCOUNT}/developerRegistration`, gcpIds: [PROJECT_NUMBER] }]
  ]) {
    const result = await runPreflight(stub([...cssReads(), ...pair.map(body => json(body))]).options);
    assert.equal(result.ok, false); assert.equal(result.registration.status, 'unknown'); assert.equal(result.registration.reason, 'RESPONSE');
    assert(!JSON.stringify(result).includes(token)); assert(!JSON.stringify(result).includes(key));
  }
});

test('Merchant response body and content-length limits cover success and error bodies', async () => {
  for (const response of [json({ name: ACCOUNT }, 200, { 'content-length': String(3 * 1024 * 1024) }), json({ name: ACCOUNT, padding: 'x'.repeat(2 * 1024 * 1024) }), new Response(`${token} invalid`, { headers: { 'content-type': 'application/json' } }), json(disabledBody(), 403, { 'content-length': String(3 * 1024 * 1024) })]) {
    const result = await runPreflight(stub([...cssReads(), response, registered()[1]]).options);
    assert.equal(result.ok, false); assert.equal(result.registration.status, 'unknown'); assert(['HTTP', 'RESPONSE'].includes(result.registration.reason));
    assert(!JSON.stringify(result).includes(token)); assert(!JSON.stringify(result).includes(key));
  }
});

test('Merchant redirect and changed response URL are not followed or trusted', async () => {
  for (const altered of ['redirected', 'url']) {
    const response = json({ name: ACCOUNT });
    Object.defineProperty(response, altered, { value: altered === 'redirected' ? true : 'https://evil.example/' });
    const mock = stub([...cssReads(), response, registered()[1]]);
    const result = await runPreflight(mock.options);
    assert.equal(result.registration.status, 'unknown'); assert.equal(result.registration.reason, 'URL'); assert.equal(mock.calls.length, 5);
    assert(mock.calls.every(call => !call.url.includes('evil.example')));
  }
});

test('Merchant retry remains bounded and does not acquire the CSS key', async () => {
  const mock = stub([...cssReads(), ...Array.from({ length: 3 }, () => new Error(`${token} ${key}`)), registered()[1]]);
  const result = await runPreflight(mock.options);
  assert.equal(result.registration.status, 'unknown'); assert.equal(result.registration.reason, 'NETWORK'); assert.equal(mock.calls.length, 7); assert.deepEqual(mock.sleepCalls, [250, 500]);
  for (const call of mock.calls.slice(3)) assert(!JSON.stringify(call.options).includes(key));
  assert(!JSON.stringify(result).includes(token)); assert(!JSON.stringify(result).includes(key));
});

test('Merchant 429 can retry then confirm, without extending the existing bounds', async () => {
  const mock = stub([...cssReads(), json({}, 429, { 'retry-after': '900' }), ...registered()]);
  const result = await runPreflight(mock.options);
  assert.equal(result.registration.status, 'confirmed'); assert.equal(result.requests, 6); assert.deepEqual(mock.sleepCalls, [2000]);
  assert(mock.calls.slice(3).every(call => call.options.headers['X-Goog-Api-Key'] === undefined));
});

test('shared deadline can stop Merchant checks while preserving completed CSS reads', async () => {
  let clockCalls = 0;
  const mock = stub(cssReads());
  const result = await runPreflight({ ...mock.options, now: () => clockCalls++ < 4 ? 0 : 90001 });
  assert.equal(result.ok, false); assert.equal(result.registration.status, 'unknown'); assert.equal(result.registration.reason, 'TIMEOUT'); assert.equal(result.processedProducts, 0); assert.equal(mock.calls.length, 3);
});
