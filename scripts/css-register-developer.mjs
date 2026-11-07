// Fixed link-only registration. Default execution is offline; a reviewed manual run permits one POST {}.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const ACCOUNT = 'accounts/5900257120';
export const PROJECT_ID = 'tagora-css-2026';
export const PROJECT_NUMBER = '404604349240';
export const SERVICE_ACCOUNT = 'tagora-css-sync@tagora-css-2026.iam.gserviceaccount.com';
export const SCOPE = 'https://www.googleapis.com/auth/content';
export const PROVIDER = 'projects/404604349240/locations/global/workloadIdentityPools/tagora-css/providers/github-pazari-register';
export const PLAN = {
  "version": 2,
  "action": "link_css_project",
  "account": "accounts/5900257120",
  "projectId": "tagora-css-2026",
  "projectNumber": "404604349240",
  "bodySha256": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  "provider": "projects/404604349240/locations/global/workloadIdentityPools/tagora-css/providers/github-pazari-register",
  "serviceAccount": "tagora-css-sync@tagora-css-2026.iam.gserviceaccount.com",
  "scope": "https://www.googleapis.com/auth/content",
  "linkOnly": true,
  "contactSetupOutstanding": true,
  "developerContactWritesIntended": false,
  "notificationWritesIntended": false,
  "allowOnlyOnBothExactNotRegistered": true,
  "maximumPostAttempts": 1,
  "targetEvidence": {
    "observedAt": "2026-11-07T08:45:40.6456950Z",
    "runId": "42356828310",
    "commit": "fc7b20481584f8658526487c5a3f8d5781bf6bd6",
    "receiptSha256": "04a132713ee4d8a03fa947eab4f09112f5d1c112cda95f83727a802226a975a2",
    "accountType": "CSS_DOMAIN",
    "homepageHost": "tagora.online",
    "bothExactNotRegistered": true,
    "writes": 0
  },
  "callerEvidence": {
    "observedAt": "2026-11-07T08:35:07.223Z",
    "receiptSha256": "257e6b9337e50534308133804fc0b8dcd5b70c408a0aeb5de87d20b454c2803f",
    "account": "accounts/5900257120",
    "directAdminVerified": true
  },
  "requiresExactApproval": true
};
export const PINNED_PLAN_SHA256 = '2c0aa573d5ebbdffeb129e382a278ec52822387c58c1e9a2e0c7483d18d628da';
export const POST_BODY = '{}';
const URLS = Object.freeze({ project: 'https://merchantapi.googleapis.com/accounts/v1/accounts:getAccountForGcpRegistration', account: `https://merchantapi.googleapis.com/accounts/v1/${ACCOUNT}/developerRegistration`, register: `https://merchantapi.googleapis.com/accounts/v1/${ACCOUNT}/developerRegistration:registerGcp` });
const MAX_BYTES = 2 * 1024 * 1024, MAX_DIAGNOSTIC_BYTES = 16 * 1024, DAY = 86400000;
const CODES = new Set(['CONFIG', 'HASH', 'FRESHNESS', 'CONTEXT', 'CREDENTIALS', 'URL', 'NETWORK', 'TIMEOUT', 'HTTP', 'RESPONSE', 'STATUS_UNRESOLVED', 'PROJECT_MISMATCH', 'ACK_IDENTITY', 'READBACK_UNCONFIRMED']);
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export class RegistrationError extends Error {
  constructor(code, httpStatus) { super(CODES.has(code) ? code : 'RESPONSE'); this.code = this.message; this.httpStatus = Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? httpStatus : undefined; }
}
const assert = (condition, code) => { if (!condition) throw new RegistrationError(code); };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
export function validatePlan(plan = PLAN, now = Date.now()) {
  assert(sha256(JSON.stringify(plan)) === PINNED_PLAN_SHA256, 'HASH');
  assert(plan.version === 2 && plan.action === 'link_css_project' && plan.account === ACCOUNT && plan.projectId === PROJECT_ID && plan.projectNumber === PROJECT_NUMBER && !Object.hasOwn(plan, 'developerEmail') && plan.bodySha256 === sha256(POST_BODY) && plan.provider === PROVIDER && plan.serviceAccount === SERVICE_ACCOUNT && plan.scope === SCOPE && plan.allowOnlyOnBothExactNotRegistered === true && plan.maximumPostAttempts === 1 && plan.linkOnly === true && plan.contactSetupOutstanding === true && plan.developerContactWritesIntended === false && plan.notificationWritesIntended === false && plan.requiresExactApproval === true, 'CONFIG');
  assert(plan.targetEvidence.accountType === 'CSS_DOMAIN' && plan.targetEvidence.homepageHost === 'tagora.online' && plan.targetEvidence.bothExactNotRegistered === true && plan.targetEvidence.writes === 0 && plan.callerEvidence.account === ACCOUNT && plan.callerEvidence.directAdminVerified === true, 'CONFIG');
  for (const evidence of [plan.targetEvidence, plan.callerEvidence]) {
    const time = Date.parse(evidence.observedAt);
    assert(Number.isFinite(time) && now - time >= -300000 && now - time <= DAY && /^[a-f0-9]{64}$/.test(evidence.receiptSha256), 'FRESHNESS');
  }
  return { planSha256: PINNED_PLAN_SHA256, account: ACCOUNT, projectNumber: PROJECT_NUMBER, linkOnly: true, contactSetupOutstanding: true, maximumPostAttempts: 1, developerContactWritesIntended: false, notificationWritesIntended: false };
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
async function responseJson(response, allowError = false, maxBytes = MAX_BYTES) {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (!/\bapplication\/json\b/i.test(response.headers.get('content-type') ?? '') || !Number.isFinite(declared) || declared < 0 || declared > maxBytes) { await response.body?.cancel(); throw new RegistrationError('RESPONSE'); }
  const reader = response.body?.getReader(); assert(reader, 'RESPONSE');
  let bytes = 0; const chunks = [];
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > maxBytes) { await reader.cancel(); throw new RegistrationError('RESPONSE'); } chunks.push(Buffer.from(value)); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    assert(object(data) && (allowError || !Object.hasOwn(data, 'error')), 'RESPONSE'); return data;
  } catch (error) { throw error instanceof RegistrationError ? error : new RegistrationError('RESPONSE'); }
}

// Error data is untrusted. Emit only fixed vocabulary, never arbitrary metadata,
// raw messages, headers or bodies. Unknown diagnostic values are deliberately omitted.
const GOOGLE_STATUSES = new Set(['CANCELLED', 'UNKNOWN', 'INVALID_ARGUMENT', 'DEADLINE_EXCEEDED', 'NOT_FOUND', 'ALREADY_EXISTS', 'PERMISSION_DENIED', 'RESOURCE_EXHAUSTED', 'FAILED_PRECONDITION', 'ABORTED', 'OUT_OF_RANGE', 'UNIMPLEMENTED', 'INTERNAL', 'UNAVAILABLE', 'DATA_LOSS', 'UNAUTHENTICATED']);
const GOOGLE_REASONS = new Set([
  'GCP_NOT_REGISTERED', 'GCP_NOT_REGISTERED_NO_CONTACT', 'ALREADY_REGISTERED',
  'NOT_FOUND_DEVELOPER_REGISTRATION', 'NOT_FOUND_PROJECT_REGISTRATION_STATE',
  'PERMISSION_DENIED_TO_REGISTER_GCP_WITH_SERVICE_ACCOUNT', 'PERMISSION_DENIED_REGISTER_SHARED_GCP_ID',
  'PERMISSION_DENIED_ADMIN', 'PERMISSION_DENIED_DIRECT_USER', 'PERMISSION_DENIED_ACCOUNT', 'PERMISSION_DENIED_ACCOUNTS',
  'PERMISSION_DENIED_TO_USE_ENDPOINT', 'PERMISSION_DENIED_TERMS_OF_SERVICE_UNSIGNED',
  'PERMISSION_DENIED_NOT_ELIGIBLE_TO_USE_METHOD_TEST_ACCOUNT',
  'NOT_FOUND_USER_OR_NOT_GAIA_USER', 'INVALID_ACCOUNT_ID', 'INVALID_ACCOUNT_VALIDATION_FAILED',
  'SERVICE_DISABLED', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'INTERNAL_ERROR', 'BACKEND_ERROR',
]);
const LEGACY_REASONS = Object.freeze({ internal_error: 'INTERNAL_ERROR', backendError: 'BACKEND_ERROR' });
const SAFE_MESSAGES = new Map([
  ['Internal error encountered.', 'Google reported an internal error.'],
  ['Internal error.', 'Google reported an internal error.'],
  ['Internal server error.', 'Google reported an internal error.'],
  ['Internal Server Error', 'Google reported an internal error.'],
  ['An internal error occurred.', 'Google reported an internal error.'],
  ['The caller does not have permission', 'Google reported insufficient permission.'],
  ['The caller does not have permission.', 'Google reported insufficient permission.'],
  ['Request had insufficient authentication scopes.', 'Google reported insufficient authentication scope.'],
]);
export function sanitizeGoogleError(data, secrets = []) {
  const error = object(data?.error) ? data.error : {};
  const forbidden = secrets.filter((secret) => typeof secret === 'string' && secret.length > 0);
  const safe = (value) => typeof value === 'string' && !forbidden.some((secret) => value.includes(secret));
  const result = { reasons: [], messageOmitted: true };
  if (Number.isInteger(error.code) && error.code >= 100 && error.code <= 599) result.code = error.code;
  if (GOOGLE_STATUSES.has(error.status) && safe(error.status)) result.status = error.status;
  const addReason = (value) => {
    const reason = typeof value === 'string' && Object.hasOwn(LEGACY_REASONS, value) ? LEGACY_REASONS[value] : value;
    if (GOOGLE_REASONS.has(reason) && safe(reason) && !result.reasons.includes(reason)) result.reasons.push(reason);
  };
  for (const detail of Array.isArray(error.details) ? error.details.slice(0, 8) : []) {
    if (detail?.['@type'] !== 'type.googleapis.com/google.rpc.ErrorInfo' || !['merchantapi.googleapis.com', 'googleapis.com'].includes(detail.domain)) continue;
    addReason(detail.metadata?.REASON);
    addReason(detail.reason);
  }
  if (typeof error.message === 'string' && error.message.length <= 2048 && safe(error.message)) {
    const message = SAFE_MESSAGES.get(error.message.trim());
    if (message && safe(message)) { result.message = message; result.messageOmitted = false; }
  }
  return result;
}
async function readGoogleError(response, accessToken) {
  try {
    const data = await responseJson(response, true, MAX_DIAGNOSTIC_BYTES);
    return { data, diagnostics: sanitizeGoogleError(data, [accessToken]) };
  } catch {
    return { data: undefined, diagnostics: { reasons: [], messageOmitted: true, diagnosticUnavailable: true } };
  }
}
function exactNotRegistered(status, data) {
  const error = data?.error;
  return status === 401 && error?.code === 401 && error.status === 'UNAUTHENTICATED' && typeof error.message === 'string' && error.message.startsWith(`GCP project with id ${PROJECT_ID} and number ${PROJECT_NUMBER} is not registered with the merchant account.`);
}
// Admission is deliberately independent of the public diagnostic allowlist.
// An unknown business reason must block a write even though it is never logged.
// Inspect every detail within the already bounded body, not the diagnostic first 8.
function hasRegistrationContradiction(data) {
  const details = data?.error?.details;
  if (details !== undefined && !Array.isArray(details)) return true;
  for (const detail of details ?? []) {
    if (detail?.['@type'] !== 'type.googleapis.com/google.rpc.ErrorInfo' || !['merchantapi.googleapis.com', 'googleapis.com'].includes(detail.domain)) continue;
    const metadataReason = detail.metadata?.REASON;
    if (metadataReason !== undefined && metadataReason !== '' && metadataReason !== 'GCP_NOT_REGISTERED') return true;
    const reason = detail.reason;
    if (reason === undefined || reason === '' || reason === 'GCP_NOT_REGISTERED') continue;
    const genericAuthentication = ['UNAUTHENTICATED', 'unauthenticated', 'UNAUTHORIZED', 'unauthorized'].includes(reason);
    const wrapperForExactReason = metadataReason === 'GCP_NOT_REGISTERED' && ['AUTH_ERROR', 'authError'].includes(reason);
    if (!genericAuthentication && !wrapperForExactReason) return true;
  }
  return false;
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
  const journal = { mode: ['validate', 'register'].includes(mode) ? mode : 'invalid', account: ACCOUNT, projectNumber: PROJECT_NUMBER, planSha256: PINNED_PLAN_SHA256, networkRequests: 0, postAttempts: 0, postAcknowledged: false, postOutcome: 'not_attempted', registrationConfirmed: false, projectLinkAcknowledged: false, projectLinkConfirmed: false, linkOnly: true, contactSetupOutstanding: true, apiOnboardingComplete: false, developerContactWritesIntended: false, notificationWritesIntended: false, contactAcceptanceVerified: false, automaticWriteRetries: 0, googleProductWrites: 0, stopped: false,
    limitation: 'This fixed POST {} only requests the project link; no developerEmail is sent and no contact, API_DEVELOPER role or notification change is requested. Developer contact setup remains outstanding. Link acknowledgement or confirmation does not establish complete API onboarding. After any POST attempt, do not dispatch again without read-only reconciliation and separate approval.' };
  const snapshot = () => structuredClone(journal), record = () => emit(snapshot());
  try {
    validatePlan(PLAN, now());
    if (mode === 'validate') return { ...snapshot(), ok: true, offline: true };
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
      const { data, diagnostics } = await readGoogleError(response, accessToken);
      // A linked project lacking a contact must never authorize another registration POST.
      if (diagnostics.reasons.includes('GCP_NOT_REGISTERED_NO_CONTACT')) return { state: 'unknown', reason: 'GCP_NOT_REGISTERED_NO_CONTACT', httpStatus: response.status, diagnostics };
      // Do not let a legacy message override contradictory structured diagnostics.
      if (hasRegistrationContradiction(data)) return { state: 'unknown', reason: 'HTTP', httpStatus: response.status, diagnostics };
      return exactNotRegistered(response.status, data)
        ? { state: 'not_registered', reason: 'PROJECT_NOT_REGISTERED', httpStatus: 401, diagnostics }
        : { state: 'unknown', reason: 'HTTP', httpStatus: response.status, diagnostics };
    }
    async function readPair() { return { project: await read('project'), account: await read('account') }; }
    journal.stage = 'before_write';
    journal.before = await readPair(); record();
    if (Object.values(journal.before).every(check => check.state === 'confirmed')) return { ...snapshot(), ok: true, registrationConfirmed: true, projectLinkConfirmed: true, action: 'already_registered_no_write' };
    assert(!Object.values(journal.before).some(check => check.state === 'mismatch'), 'PROJECT_MISMATCH');
    assert(Object.values(journal.before).every(check => check.state === 'not_registered' && check.reason === 'PROJECT_NOT_REGISTERED'), 'STATUS_UNRESOLVED');
    validatePlan(PLAN, now());
    journal.stage = 'registration_post';
    // No retries, even for a timeout, 429, 5xx, malformed acknowledgement, or redirect.
    const response = await request(URLS.register, 'POST', POST_BODY);
    if (response.status !== 200) {
      journal.googleError = (await readGoogleError(response, accessToken)).diagnostics;
      throw new RegistrationError('HTTP', response.status);
    }
    assert(inspectRegistration('account', await responseJson(response)).state === 'confirmed', 'ACK_IDENTITY');
    journal.postAcknowledged = true; journal.projectLinkAcknowledged = true; journal.postOutcome = 'acknowledged'; record();
    journal.stage = 'readback'; journal.after = await readPair(); record();
    assert(Object.values(journal.after).every(check => check.state === 'confirmed'), 'READBACK_UNCONFIRMED');
    journal.registrationConfirmed = true; journal.projectLinkConfirmed = true;
    return { ...snapshot(), ok: true, action: 'project_link_confirmed_contact_outstanding' };
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
