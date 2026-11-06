// LOCAL FUTURE DRAFT. Default execution is offline; registration requires separate approval.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ACCOUNT = 'accounts/5900257120';
export const PROJECT_ID = 'tagora-css-2026';
export const PROJECT_NUMBER = '404604349240';
export const DEVELOPER_EMAIL = 'dimos@growagency.online';
export const SERVICE_ACCOUNT = 'tagora-css-sync@tagora-css-2026.iam.gserviceaccount.com';
export const SCOPE = 'https://www.googleapis.com/auth/content';
export const PROVIDER = 'projects/404604349240/locations/global/workloadIdentityPools/tagora-css/providers/github-pazari-register';
export const PLAN = {
  "version": 1,
  "action": "register_css_developer",
  "account": "accounts/5900257120",
  "projectId": "tagora-css-2026",
  "projectNumber": "404604349240",
  "developerEmail": "dimos@growagency.online",
  "bodySha256": "dccac96f7204e800d7899e7b311b6bf0250585e60d0df5a07043cca744487122",
  "provider": "projects/404604349240/locations/global/workloadIdentityPools/tagora-css/providers/github-pazari-register",
  "serviceAccount": "tagora-css-sync@tagora-css-2026.iam.gserviceaccount.com",
  "scope": "https://www.googleapis.com/auth/content",
  "allowOnlyOnBothExactNotRegistered": true,
  "maximumPostAttempts": 1,
  "possibleGoogleInvitation": true,
  "apiDeveloperAndNotificationChange": true,
  "targetEvidence": {
    "observedAt": "2026-11-06T22:01:48.562Z",
    "runId": "42301241870",
    "commit": "725a604ef96ec2c4a2ea35659a5a78aaeff48c69",
    "receiptSha256": "0763dc8eb9271eaf8b9f10fb063a4920e54b635304754528b14b38e9a01635aa",
    "accountType": "CSS_DOMAIN",
    "homepageHost": "tagora.online",
    "bothExactNotRegistered": true,
    "writes": 0
  },
  "contactEvidence": {
    "observedAt": "2026-11-06T22:03:28.573Z",
    "receiptSha256": "87fc7a73d5dfc40d8edb16e0296fe12fef50d8ea1b72ff54779e2e21d8ed1501",
    "identityVerified": true,
    "verifiedCssGroup": "5900255128",
    "groupRole": "Admin Verified",
    "directDomainUser": false,
    "domainAccess": "inherited_from_group",
    "possibleInvitation": true
  },
  "requiresSeparateApproval": true
};
export const PINNED_PLAN_SHA256 = '278c828bf6439213761bee2f9e919205ffb85fe23befd5b54de044a31fef440d';
export const POST_BODY = JSON.stringify({ developerEmail: DEVELOPER_EMAIL });
const URLS = Object.freeze({ project: 'https://merchantapi.googleapis.com/accounts/v1/accounts:getAccountForGcpRegistration', account: `https://merchantapi.googleapis.com/accounts/v1/${ACCOUNT}/developerRegistration`, register: `https://merchantapi.googleapis.com/accounts/v1/${ACCOUNT}/developerRegistration:registerGcp` });
const MAX_BYTES = 2 * 1024 * 1024, DAY = 86400000;
const CODES = new Set(['CONFIG', 'HASH', 'FRESHNESS', 'CONTEXT', 'CREDENTIALS', 'URL', 'NETWORK', 'TIMEOUT', 'HTTP', 'RESPONSE', 'STATUS_UNRESOLVED', 'PROJECT_MISMATCH', 'ACK_IDENTITY', 'READBACK_UNCONFIRMED']);
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export class RegistrationError extends Error {
  constructor(code, httpStatus) { super(CODES.has(code) ? code : 'RESPONSE'); this.code = this.message; this.httpStatus = Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? httpStatus : undefined; }
}
const assert = (condition, code) => { if (!condition) throw new RegistrationError(code); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function validatePlan(plan = PLAN, now = Date.now()) {
  assert(sha256(JSON.stringify(plan)) === PINNED_PLAN_SHA256, 'HASH');
  assert(plan.account === ACCOUNT && plan.projectId === PROJECT_ID && plan.projectNumber === PROJECT_NUMBER && plan.developerEmail === DEVELOPER_EMAIL && plan.bodySha256 === sha256(POST_BODY) && plan.provider === PROVIDER && plan.serviceAccount === SERVICE_ACCOUNT && plan.scope === SCOPE && plan.allowOnlyOnBothExactNotRegistered === true && plan.maximumPostAttempts === 1 && plan.possibleGoogleInvitation === true && plan.apiDeveloperAndNotificationChange === true, 'CONFIG');
  assert(plan.targetEvidence.accountType === 'CSS_DOMAIN' && plan.targetEvidence.homepageHost === 'tagora.online' && plan.targetEvidence.bothExactNotRegistered === true && plan.targetEvidence.writes === 0 && plan.contactEvidence.identityVerified === true && plan.contactEvidence.directDomainUser === false, 'CONFIG');
  for (const evidence of [plan.targetEvidence, plan.contactEvidence]) {
    const time = Date.parse(evidence.observedAt);
    assert(Number.isFinite(time) && now - time >= -300000 && now - time <= DAY && /^[a-f0-9]{64}$/.test(evidence.receiptSha256), 'FRESHNESS');
  }
  return { planSha256: PINNED_PLAN_SHA256, account: ACCOUNT, projectNumber: PROJECT_NUMBER, developerEmail: DEVELOPER_EMAIL, maximumPostAttempts: 1, possibleGoogleInvitation: true };
}
export function assertContext(env) {
  const expected = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'dimosbc89/pazari', GITHUB_REPOSITORY_ID: '1442881486', GITHUB_REPOSITORY_OWNER_ID: '72251765', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: 'dimosbc89/pazari/.github/workflows/css-register-developer.yml@refs/heads/main', GITHUB_RUN_ATTEMPT: '1', GCP_WIF_PROVIDER_REGISTER: PROVIDER, CSS_OAUTH_SCOPE: SCOPE, CSS_REGISTER_CONFIRM_SHA256: PINNED_PLAN_SHA256, CSS_REGISTER_ALLOW_NOT_REGISTERED: 'true' };
  assert(Object.entries(expected).every(([key, value]) => env?.[key] === value), 'CONTEXT');
}
export function requestUrl(kind) { assert(Object.hasOwn(URLS, kind), 'URL'); return URLS[kind]; }
export function assertRequest(target, method = 'GET', body) {
  if (method === 'POST') assert(target === URLS.register && body === POST_BODY, 'URL');
  else assert(method === 'GET' && body === undefined && [URLS.project, URLS.account].includes(target), 'URL');
  return target;
}
async function responseJson(response, allowError = false) {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (!/\bapplication\/json\b/i.test(response.headers.get('content-type') ?? '') || !Number.isFinite(declared) || declared < 0 || declared > MAX_BYTES) { await response.body?.cancel(); throw new RegistrationError('RESPONSE'); }
  const reader = response.body?.getReader(); assert(reader, 'RESPONSE');
  let bytes = 0; const chunks = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > MAX_BYTES) { await reader.cancel(); throw new RegistrationError('RESPONSE'); } chunks.push(Buffer.from(value)); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert(object(data) && (allowError || !Object.hasOwn(data, 'error')), 'RESPONSE'); return data;
  } catch (error) { throw error instanceof RegistrationError ? error : new RegistrationError('RESPONSE'); }
}
function exactNotRegistered(status, data) {
  const error = data?.error;
  return status === 401 && error?.code === 401 && error.status === 'UNAUTHENTICATED' && typeof error.message === 'string' && error.message.startsWith(`GCP project with id ${PROJECT_ID} and number ${PROJECT_NUMBER} is not registered with the merchant account.`);
}
export function inspectRegistration(kind, data) {
  if (kind === 'project') {
    assert(typeof data?.name === 'string' && /^accounts\/\d{1,20}$/.test(data.name), 'RESPONSE');
    return { state: data.name === ACCOUNT ? 'confirmed' : 'mismatch' };
  }
  assert(kind === 'account' && typeof data?.name === 'string' && /^accounts\/\d{1,20}\/developerRegistration$/.test(data.name) && Array.isArray(data.gcpIds) && data.gcpIds.length <= 1000 && data.gcpIds.every(id => typeof id === 'string' && /^[A-Za-z0-9-]{1,128}$/.test(id)), 'RESPONSE');
  return { state: data.name === `${ACCOUNT}/developerRegistration` && (data.gcpIds.includes(PROJECT_NUMBER) || data.gcpIds.includes(PROJECT_ID)) ? 'confirmed' : 'mismatch' };
}
export async function runRegistration({ mode = 'validate', confirmation, allowIfNotRegistered = false, env, accessToken, fetchImpl = globalThis.fetch, now = Date.now, emit = () => {} } = {}) {
  const journal = { mode: ['validate', 'register'].includes(mode) ? mode : 'invalid', account: ACCOUNT, projectNumber: PROJECT_NUMBER, planSha256: PINNED_PLAN_SHA256, networkRequests: 0, postAttempts: 0, postAcknowledged: false, postOutcome: 'not_attempted', registrationConfirmed: false, contactAcceptanceVerified: false, automaticWriteRetries: 0, googleProductWrites: 0, stopped: false,
    limitation: 'Registration can add API_DEVELOPER access, change API notifications, and trigger a Google invitation to the approved human contact. Link confirmation does not prove invitation acceptance. After any POST attempt, do not rerun or dispatch again without read-only reconciliation and separate approval.' };
  const snapshot = () => structuredClone(journal), record = () => emit(snapshot());
  try {
    validatePlan(PLAN, now());
    if (mode === 'validate') return { ...snapshot(), ok: true, offline: true, developerEmail: DEVELOPER_EMAIL };
    assert(mode === 'register' && confirmation === PINNED_PLAN_SHA256 && allowIfNotRegistered === true, 'CONFIG');
    assertContext(env);
    assert(typeof accessToken === 'string' && accessToken.length >= 10 && !/\s/.test(accessToken), 'CREDENTIALS');
    const deadline = now() + 90000;
    async function request(target, method = 'GET', body) {
      assertRequest(target, method, body);
      const remaining = deadline - now(); assert(remaining > 0, 'TIMEOUT');
      if (method === 'POST') { assert(journal.postAttempts === 0, 'CONFIG'); journal.postAttempts = 1; journal.postOutcome = 'ambiguous'; record(); }
      journal.networkRequests++;
      let response;
      try { response = await fetchImpl(target, { method, ...(body === undefined ? {} : { body }), headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) }, redirect: 'error', signal: AbortSignal.timeout(Math.min(10000, remaining)) }); }
      catch { throw new RegistrationError('NETWORK'); }
      if (response.redirected || (response.url && response.url !== target)) { await response.body?.cancel(); throw new RegistrationError('URL'); }
      return response;
    }
    async function read(kind) {
      const response = await request(requestUrl(kind));
      if (response.status === 200) return inspectRegistration(kind, await responseJson(response));
      const data = await responseJson(response, true);
      return exactNotRegistered(response.status, data) ? { state: 'not_registered', reason: 'PROJECT_NOT_REGISTERED', httpStatus: 401 } : { state: 'unknown', reason: 'HTTP', httpStatus: response.status };
    }
    async function readPair() { return { project: await read('project'), account: await read('account') }; }
    journal.stage = 'before_write';
    journal.before = await readPair(); record();
    if (Object.values(journal.before).every(check => check.state === 'confirmed')) return { ...snapshot(), ok: true, registrationConfirmed: true, action: 'already_registered_no_write' };
    assert(!Object.values(journal.before).some(check => check.state === 'mismatch'), 'PROJECT_MISMATCH');
    assert(Object.values(journal.before).every(check => check.state === 'not_registered' && check.reason === 'PROJECT_NOT_REGISTERED'), 'STATUS_UNRESOLVED');
    validatePlan(PLAN, now());
    journal.stage = 'registration_post';
    // No retries, even for a timeout, 429, 5xx, malformed acknowledgement, or redirect.
    const response = await request(URLS.register, 'POST', POST_BODY);
    if (response.status !== 200) { await response.body?.cancel(); throw new RegistrationError('HTTP', response.status); }
    assert(inspectRegistration('account', await responseJson(response)).state === 'confirmed', 'ACK_IDENTITY');
    journal.postAcknowledged = true; journal.postOutcome = 'acknowledged'; record();
    journal.stage = 'readback'; journal.after = await readPair(); record();
    assert(Object.values(journal.after).every(check => check.state === 'confirmed'), 'READBACK_UNCONFIRMED');
    journal.registrationConfirmed = true;
    return { ...snapshot(), ok: true, action: 'registered_link_confirmed' };
  } catch (error) {
    journal.stopped = true; journal.error = error instanceof RegistrationError && CODES.has(error.code) ? error.code : 'RESPONSE';
    if (error instanceof RegistrationError && error.httpStatus) journal.httpStatus = error.httpStatus;
    record(); return { ...snapshot(), ok: false };
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2); assert(args.length <= 1 && (!args.length || ['--register', '--check-context'].includes(args[0])), 'CONFIG');
    if (args[0] === '--check-context') { validatePlan(); assertContext(process.env); console.log(JSON.stringify({ contextVerified: true, networkRequests: 0 })); }
    else { const result = await runRegistration({ mode: args[0] === '--register' ? 'register' : 'validate', confirmation: process.env.CSS_REGISTER_CONFIRM_SHA256, allowIfNotRegistered: process.env.CSS_REGISTER_ALLOW_NOT_REGISTERED === 'true', env: process.env, accessToken: process.env.CSS_ACCESS_TOKEN, emit: journal => console.log(JSON.stringify({ registrationJournal: journal })) }); console.log(JSON.stringify(result)); if (!result.ok) process.exitCode = 1; }
  } catch (error) { console.error(JSON.stringify({ ok: false, error: error instanceof RegistrationError && CODES.has(error.code) ? error.code : 'CONFIG', account: ACCOUNT, postAttempts: 0 })); process.exitCode = 1; }
}
