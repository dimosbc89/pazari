import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import * as api from './css-register-developer.mjs';

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('Live HTTP prohibited in this test suite'); };
after(() => { globalThis.fetch = originalFetch; });
const NOW = Date.parse('2026-11-06T22:10:00Z');
const token = 'OFFLINE-TEST-TOKEN-NEVER-LOG', key = 'OFFLINE-CSS-KEY-NEVER-SEND';
const env = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'dimosbc89/pazari', GITHUB_REPOSITORY_ID: '1442881486', GITHUB_REPOSITORY_OWNER_ID: '72251765', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: 'dimosbc89/pazari/.github/workflows/css-register-developer.yml@refs/heads/main', GITHUB_RUN_ATTEMPT: '1', GCP_WIF_PROVIDER_REGISTER: api.PROVIDER, CSS_OAUTH_SCOPE: api.SCOPE, CSS_REGISTER_CONFIRM_SHA256: api.PINNED_PLAN_SHA256, CSS_REGISTER_ALLOW_NOT_REGISTERED: 'true' };
const response = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const registration = (id = api.PROJECT_NUMBER) => ({ name: `${api.ACCOUNT}/developerRegistration`, gcpIds: [id] });
const confirmed = () => [response({ name: api.ACCOUNT }), response(registration())];
const unregistered = (project = api.PROJECT_ID, number = api.PROJECT_NUMBER) => response({ error: { code: 401, status: 'UNAUTHENTICATED', message: `GCP project with id ${project} and number ${number} is not registered with the merchant account. Follow the documentation. ${token}` } }, 401);
const missing = () => [unregistered(), unregistered()];
function mock(sequence = []) {
  const calls = [], journals = [];
  return { calls, journals, options: { mode: 'register', confirmation: api.PINNED_PLAN_SHA256, allowIfNotRegistered: true, env: { ...env }, accessToken: token, apiKey: key, now: () => NOW, emit: data => journals.push(data),
    fetchImpl: async (url, options) => { calls.push({ url, options }); const next = sequence.shift(); assert(next, 'Unexpected request'); if (next instanceof Error) throw next; return typeof next === 'function' ? next(url, options) : next; } } };
}
const stopped = (result, code, posts = 0) => { assert.equal(result.ok, false); assert.equal(result.stopped, true); assert.equal(result.error, code); assert.equal(result.postAttempts, posts); assert.equal(result.automaticWriteRetries, 0); assert.equal(result.googleProductWrites, 0); };

test('pinned plan binds exact account, project, body, human contact and source receipts', () => {
  assert.equal(api.sha256(JSON.stringify(api.PLAN)), api.PINNED_PLAN_SHA256);
  assert.equal(api.POST_BODY, '{"developerEmail":"dimos@growagency.online"}');
  assert.equal(api.PLAN.bodySha256, api.sha256(api.POST_BODY));
  assert.equal(api.PLAN.contactEvidence.directDomainUser, false); assert.equal(api.PLAN.possibleGoogleInvitation, true);
  assert.doesNotThrow(() => api.validatePlan(api.PLAN, NOW));
  for (const field of ['account', 'projectId', 'developerEmail', 'provider']) assert.throws(() => api.validatePlan({ ...api.PLAN, [field]: 'wrong' }, NOW));
});
test('default mode is offline and never acquires a token or invokes fetch', async () => {
  const m = mock(); const result = await api.runRegistration({ now: () => NOW, fetchImpl: m.options.fetchImpl });
  assert.equal(result.ok, true); assert.equal(result.offline, true); assert.equal(result.postAttempts, 0); assert.equal(m.calls.length, 0);
});
test('stale or future receipt times prevent all requests', async () => {
  for (const time of [NOW + 86400000, Date.parse('2026-11-06T20:00:00Z')]) { const m = mock(); stopped(await api.runRegistration({ ...m.options, now: () => time }), 'FRESHNESS'); assert.equal(m.calls.length, 0); }
});
test('register requires both exact hash approval and explicit missing-project flag', async () => {
  for (const change of [{ confirmation: 'other' }, { confirmation: undefined }, { allowIfNotRegistered: false }, { allowIfNotRegistered: 'true' }, { mode: 'submit' }]) { const m = mock(); stopped(await api.runRegistration({ ...m.options, ...change }), 'CONFIG'); assert.equal(m.calls.length, 0); }
});
test('every numeric GitHub identity, main ref, event, workflow, provider and attempt is fixed', async () => {
  assert.doesNotThrow(() => api.assertContext(env));
  for (const field of Object.keys(env)) { const m = mock(); stopped(await api.runRegistration({ ...m.options, env: { ...env, [field]: 'wrong' } }), 'CONTEXT'); assert.equal(m.calls.length, 0); }
});
test('empty token or header injection fails before HTTP', async () => {
  for (const accessToken of ['', 'bad\ninjection']) { const m = mock(); stopped(await api.runRegistration({ ...m.options, accessToken }), 'CREDENTIALS'); assert.equal(m.calls.length, 0); }
});
test('only two exact GET URLs and one byte-exact POST body are allowed', () => {
  for (const kind of ['project', 'account']) {
    const url = api.requestUrl(kind); assert.equal(api.assertRequest(url), url);
    for (const body of ['', null, {}]) assert.throws(() => api.assertRequest(url, 'GET', body));
    for (const suffix of ['?key=x', '?pageSize=1', '#x', '/']) assert.throws(() => api.assertRequest(url + suffix));
  }
  const url = api.requestUrl('register'); assert.equal(api.assertRequest(url, 'POST', api.POST_BODY), url);
  for (const body of [api.POST_BODY + ' ', '{"developerEmail":"other@example.com"}', '{}', undefined]) assert.throws(() => api.assertRequest(url, 'POST', body));
  for (const method of ['GET', 'PATCH', 'DELETE', 'PUT', 'HEAD']) assert.throws(() => api.assertRequest(url, method, api.POST_BODY));
  for (const target of [url.replace('5900257120', '5899395261'), url.replace('registerGcp', 'unregisterGcp'), url + '?key=x', url.replace('merchantapi.googleapis.com', 'evil.example'), url.replace('https://', 'https://user:pass@'), 'https://css.googleapis.com/v1/accounts/5900257120']) assert.throws(() => api.assertRequest(target, 'POST', api.POST_BODY));
});
test('already registered to exact account/project skips POST entirely', async () => {
  const m = mock(confirmed()); const result = await api.runRegistration(m.options);
  assert.equal(result.ok, true); assert.equal(result.action, 'already_registered_no_write'); assert.equal(result.registrationConfirmed, true); assert.equal(result.postAttempts, 0); assert.equal(m.calls.length, 2); assert.equal(result.contactAcceptanceVerified, false);
});
test('both exact missing-project errors permit only one POST then exact two readbacks', async () => {
  const m = mock([...missing(), response(registration()), ...confirmed()]); const result = await api.runRegistration(m.options);
  assert.equal(result.ok, true); assert.equal(result.registrationConfirmed, true); assert.equal(result.postAttempts, 1); assert.equal(result.postAcknowledged, true); assert.equal(m.calls.length, 5);
  assert.deepEqual(m.calls.map(c => c.options.method), ['GET', 'GET', 'POST', 'GET', 'GET']);
  assert.deepEqual(m.calls.map(c => c.url), ['project', 'account', 'register', 'project', 'account'].map(api.requestUrl));
  assert.equal(m.calls[2].options.body, api.POST_BODY);
  for (const call of m.calls) { assert.equal(call.options.redirect, 'error'); assert.equal(call.options.headers.Authorization, `Bearer ${token}`); assert.equal(call.options.headers['X-Goog-Api-Key'], undefined); assert(!JSON.stringify(call).includes(key)); if (call.options.method === 'GET') assert.equal(call.options.body, undefined); }
});
test('mixed registered/unregistered results stop without a POST', async () => {
  for (const pair of [[confirmed()[0], unregistered()], [unregistered(), confirmed()[1]]]) { const m = mock(pair); stopped(await api.runRegistration(m.options), 'STATUS_UNRESOLVED'); assert.equal(m.calls.length, 2); }
});
test('wrong linked account or project blocks registration', async () => {
  for (const pair of [[response({ name: 'accounts/5899395261' }), response(registration())], [response({ name: api.ACCOUNT }), response(registration('111111111111'))], [response({ name: api.ACCOUNT }), response({ name: 'accounts/5900255128/developerRegistration', gcpIds: [api.PROJECT_NUMBER] })]]) { const m = mock(pair); stopped(await api.runRegistration(m.options), 'PROJECT_MISMATCH'); assert.equal(m.calls.length, 2); }
});
test('generic 401/403/404 or another project unregistered is never write permission', async () => {
  for (const bad of [response({ error: { code: 401, status: 'UNAUTHENTICATED', message: 'Invalid token' } }, 401), response({ error: { code: 403, message: 'SERVICE_DISABLED' } }, 403), response({}, 404), unregistered('other-project', '111111111111')]) { const m = mock([bad, unregistered()]); stopped(await api.runRegistration(m.options), 'STATUS_UNRESOLVED'); assert.equal(m.calls.length, 2); }
});
test('malformed registration GET response fails before any POST', async () => {
  for (const bad of [response({}), response({ error: { message: key } }), new Response('invalid JSON', { headers: { 'content-type': 'application/json' } })]) { const m = mock([bad]); stopped(await api.runRegistration(m.options), 'RESPONSE'); assert.equal(m.calls.length, 1); }
});
test('network or HTTP failures before registration are not retried', async () => {
  const m = mock([new Error(token)]); stopped(await api.runRegistration(m.options), 'NETWORK'); assert.equal(m.calls.length, 1);
  const other = mock([response({}, 503), unregistered()]); stopped(await api.runRegistration(other.options), 'STATUS_UNRESOLVED'); assert.equal(other.calls.length, 2);
});
test('POST network timeout is ambiguous and never repeated or followed by more writes', async () => {
  const m = mock([...missing(), new Error(`${token} ${key}`)]); const result = await api.runRegistration(m.options);
  stopped(result, 'NETWORK', 1); assert.equal(result.postOutcome, 'ambiguous'); assert.equal(result.postAcknowledged, false); assert.equal(m.calls.length, 3);
});
test('all non-200 POST statuses stop without replay; result remains conservatively ambiguous', async () => {
  for (const status of [201, 400, 401, 403, 408, 409, 429, 500, 503]) { const m = mock([...missing(), response({ error: { message: key } }, status)]); const result = await api.runRegistration(m.options); stopped(result, 'HTTP', 1); assert.equal(result.httpStatus, status); assert.equal(result.postOutcome, 'ambiguous'); assert.equal(m.calls.length, 3); }
});
test('malformed or wrong-identity 200 acknowledgements are ambiguous and stop', async () => {
  for (const bad of [response(registration('111111111111')), response({ name: 'accounts/5899395261/developerRegistration', gcpIds: [api.PROJECT_NUMBER] }), response({}), new Response(token, { headers: { 'content-type': 'application/json' } })]) { const m = mock([...missing(), bad]); const result = await api.runRegistration(m.options); assert.equal(result.ok, false); assert(['ACK_IDENTITY', 'RESPONSE'].includes(result.error)); assert.equal(result.postOutcome, 'ambiguous'); assert.equal(m.calls.length, 3); }
});
test('delayed or mismatched readback never repeats acknowledged registration', async () => {
  for (const pair of [missing(), [response({ name: 'accounts/5899395261' }), response(registration())], [response({ name: api.ACCOUNT }), response(registration('111111111111'))]]) { const m = mock([...missing(), response(registration()), ...pair]); const result = await api.runRegistration(m.options); stopped(result, 'READBACK_UNCONFIRMED', 1); assert.equal(result.postAcknowledged, true); assert.equal(result.postOutcome, 'acknowledged'); assert.equal(result.registrationConfirmed, false); assert.equal(m.calls.length, 5); }
});
test('readback network failure preserves acknowledgement without resubmission', async () => {
  const m = mock([...missing(), response(registration()), new Error(token)]); const result = await api.runRegistration(m.options); stopped(result, 'NETWORK', 1); assert.equal(result.postAcknowledged, true); assert.equal(result.postOutcome, 'acknowledged'); assert.equal(m.calls.length, 4);
});
test('redirects fail closed for GET and uncertain POST without following target', async () => {
  for (const isPost of [false, true]) { const r = response(registration()); Object.defineProperty(r, 'redirected', { value: true }); const m = mock([...(isPost ? missing() : []), r]); const result = await api.runRegistration(m.options); stopped(result, 'URL', isPost ? 1 : 0); assert.equal(m.calls.length, isPost ? 3 : 1); }
});
test('response size limits apply to declared length and actual streamed bytes', async () => {
  for (const bad of [response({ name: api.ACCOUNT }, 200, { 'content-length': String(3 * 1024 * 1024) }), response({ name: api.ACCOUNT, padding: 'x'.repeat(2 * 1024 * 1024) })]) { const m = mock([bad]); stopped(await api.runRegistration(m.options), 'RESPONSE'); assert.equal(m.calls.length, 1); }
});
test('deadline after prechecks prevents POST and reports no automatic retry', async () => {
  let time = NOW; const m = mock([response({ error: { code: 401, status: 'UNAUTHENTICATED', message: `GCP project with id ${api.PROJECT_ID} and number ${api.PROJECT_NUMBER} is not registered with the merchant account.` } }, 401), () => { time += 90001; return unregistered(); }]);
  const result = await api.runRegistration({ ...m.options, now: () => time }); stopped(result, 'TIMEOUT', 0); assert.equal(m.calls.length, 2); assert.equal(result.postOutcome, 'not_attempted');
});
test('errors and journal snapshots never include tokens, headers or raw response messages', async () => {
  const m = mock([...missing(), new Error(`Authorization: Bearer ${token}; ${key}`)]); const result = await api.runRegistration(m.options); const text = JSON.stringify([result, ...m.journals]); assert(!text.includes(token)); assert(!text.includes(key)); assert(!text.includes('Authorization')); assert(!text.includes('stack'));
});
test('workflow is separate/manual, has exact approval gates, and contains no API key secret', async () => {
  const workflow = await fs.readFile(new URL('../.github/workflows/css-register-developer.yml', import.meta.url), 'utf8');
  assert.equal([...workflow.matchAll(/uses: [^\s]+@[a-f0-9]{40}/g)].length, 3);
  assert(!/\n\s*(push|pull_request|schedule|workflow_call):/.test(workflow));
  assert(workflow.includes(`inputs.confirm_plan_sha256 == '${api.PINNED_PLAN_SHA256}'`)); assert(workflow.includes('inputs.allow_if_not_registered == true'));
  assert(workflow.includes('github.run_attempt == 1')); assert(workflow.includes(`audience: https://iam.googleapis.com/${api.PROVIDER}`));
  assert(workflow.includes(`service_account: ${api.SERVICE_ACCOUNT}`)); assert(workflow.includes(`access_token_scopes: ${api.SCOPE}`)); assert(workflow.includes('access_token_lifetime: 600s'));
  assert(workflow.includes('create_credentials_file: false')); assert(workflow.includes('export_environment_variables: false'));
  assert(!workflow.includes('API_KEY')); assert(!workflow.includes('secrets.')); assert(!workflow.includes('css-preflight'));
  assert(workflow.indexOf('node --test') < workflow.indexOf('id: registration-auth')); assert(!workflow.includes('npm install'));
});
