// Only fixed-account GET requests. No product input, account update, or deletion code.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ACCOUNT = 'accounts/5900257120';
export const SCOPE = 'https://www.googleapis.com/auth/content';
export const PROVIDER = 'projects/404604349240/locations/global/workloadIdentityPools/tagora-css/providers/github-pazari';
export const SERVICE_ACCOUNT = 'tagora-css-sync@tagora-css-2026.iam.gserviceaccount.com';
const ROOT = `https://css.googleapis.com/v1/${ACCOUNT}`;
const PAGE_SIZE = 100, MAX_PAGES = 5, MAX_ATTEMPTS = 3, MAX_BYTES = 2 * 1024 * 1024;
const PATHS = Object.freeze({ account: `/v1/${ACCOUNT}`, quotas: `/v1/${ACCOUNT}/quotas`, products: `/v1/${ACCOUNT}/cssProducts` });
const ERROR_CODES = new Set(['CONFIG', 'CONTEXT', 'SCOPE', 'URL', 'CREDENTIALS', 'NETWORK', 'HTTP', 'RESPONSE', 'ACCOUNT', 'PAGINATION', 'TIMEOUT']);
export class PreflightError extends Error {
  constructor(code, httpStatus) { super(ERROR_CODES.has(code) ? code : 'RESPONSE'); this.name = 'PreflightError'; this.code = this.message; this.httpStatus = Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? httpStatus : undefined; }
}
// Never expose exception messages, response bodies, request headers, URLs or tokens.
export function publicError(error) {
  const code = error instanceof PreflightError && ERROR_CODES.has(error.code) ? error.code : 'RESPONSE';
  const status = error instanceof PreflightError && error.httpStatus ? error.httpStatus : undefined;
  return { ok: false, error: code, ...(status ? { httpStatus: status } : {}), account: ACCOUNT, writes: 0 };
}
export function assertGithubContext(env) {
  const expected = { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'dimosbc89/pazari', GITHUB_REPOSITORY_ID: '1442881486', GITHUB_REPOSITORY_OWNER_ID: '72251765', GITHUB_REF: 'refs/heads/main', GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_WORKFLOW_REF: 'dimosbc89/pazari/.github/workflows/css-preflight.yml@refs/heads/main' };
  if (Object.entries(expected).some(([key, value]) => env[key] !== value)) throw new PreflightError('CONTEXT');
  if (env.GCP_WIF_PROVIDER !== PROVIDER) throw new PreflightError('CONFIG');
  if (env.CSS_OAUTH_SCOPE !== SCOPE) throw new PreflightError('SCOPE');
}
export function assertSafeRequest(value, { method = 'GET', body } = {}) {
  let parsed;
  try { parsed = new URL(value); } catch { throw new PreflightError('URL'); }
  if (typeof value !== 'string' || value !== parsed.href || method !== 'GET' || body !== undefined || parsed.origin !== 'https://css.googleapis.com' || parsed.username || parsed.password || parsed.hash || !Object.values(PATHS).includes(parsed.pathname)) throw new PreflightError('URL');
  const keys = [...parsed.searchParams.keys()];
  if (parsed.pathname === PATHS.account ? keys.length !== 0 : keys.some(key => !['pageSize', 'pageToken'].includes(key)) || parsed.searchParams.getAll('pageSize').length !== 1 || parsed.searchParams.get('pageSize') !== String(PAGE_SIZE) || parsed.searchParams.getAll('pageToken').length > 1) throw new PreflightError('URL');
  const token = parsed.searchParams.get('pageToken');
  if (token !== null && (!token || token.length > 4096 || /[\x00-\x1f\x7f]/.test(token))) throw new PreflightError('PAGINATION');
  return parsed.href;
}
export function requestUrl(kind, token) {
  if (!Object.hasOwn(PATHS, kind) || (kind === 'account' && token !== undefined)) throw new PreflightError('URL');
  const parsed = new URL(kind === 'account' ? ROOT : `${ROOT}/${kind === 'quotas' ? 'quotas' : 'cssProducts'}`);
  if (kind !== 'account') parsed.searchParams.set('pageSize', String(PAGE_SIZE));
  if (token !== undefined) {
    if (typeof token !== 'string' || !token || token.length > 4096 || /[\x00-\x1f\x7f]/.test(token)) throw new PreflightError('PAGINATION');
    parsed.searchParams.set('pageToken', token);
  }
  return assertSafeRequest(parsed.href);
}
export function assertAccount(account) {
  let homepage;
  try { homepage = new URL(account?.homepageUri); } catch { throw new PreflightError('ACCOUNT'); }
  if (account?.name !== ACCOUNT || account?.accountType !== 'CSS_DOMAIN' || !['https:', 'http:'].includes(homepage.protocol) || !['tagora.online', 'www.tagora.online'].includes(homepage.hostname) || homepage.port || homepage.username || homepage.password || !['/', '/gr', '/gr/'].includes(homepage.pathname) || homepage.search || homepage.hash) throw new PreflightError('ACCOUNT');
  return { name: ACCOUNT, accountType: 'CSS_DOMAIN', homepageHost: 'tagora.online' };
}
async function limitedJson(response) {
  const size = Number(response.headers.get('content-length'));
  if (Number.isFinite(size) && size > MAX_BYTES) throw new PreflightError('RESPONSE');
  if (!/\bapplication\/json\b/i.test(response.headers.get('content-type') ?? '')) throw new PreflightError('RESPONSE');
  const reader = response.body?.getReader();
  if (!reader) throw new PreflightError('RESPONSE');
  const chunks = []; let bytes = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > MAX_BYTES) { await reader.cancel(); throw new PreflightError('RESPONSE'); } chunks.push(Buffer.from(value)); }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.hasOwn(data, 'error')) throw new PreflightError('RESPONSE');
    return data;
  } catch (error) { throw error instanceof PreflightError ? error : new PreflightError('RESPONSE'); }
}
export async function runPreflight({ accessToken, apiKey, scope = SCOPE, fetchImpl = globalThis.fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now } = {}) {
  if (scope !== SCOPE) throw new PreflightError('SCOPE');
  if (typeof accessToken !== 'string' || accessToken.length < 10 || /\s/.test(accessToken) || typeof apiKey !== 'string' || apiKey.length < 10 || /\s/.test(apiKey)) throw new PreflightError('CREDENTIALS');
  const deadline = now() + 90000; let requests = 0;
  async function get(kind, pageToken) {
    const target = requestUrl(kind, pageToken);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const remaining = deadline - now();
      if (remaining <= 0) throw new PreflightError('TIMEOUT');
      let response;
      try {
        requests++;
        response = await fetchImpl(target, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}`, 'X-Goog-Api-Key': apiKey, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(Math.min(10000, remaining)) });
      } catch {
        if (attempt + 1 === MAX_ATTEMPTS) throw new PreflightError('NETWORK');
        await sleep(250 * 2 ** attempt); continue;
      }
      if (response.redirected || (response.url && response.url !== target)) throw new PreflightError('URL');
      if (response.status === 429 || [500, 502, 503, 504].includes(response.status)) {
        await response.body?.cancel();
        if (attempt + 1 === MAX_ATTEMPTS) throw new PreflightError('HTTP', response.status);
        const retrySeconds = Number(response.headers.get('retry-after'));
        await sleep(Number.isFinite(retrySeconds) && retrySeconds > 0 ? Math.min(2000, retrySeconds * 1000) : 250 * 2 ** attempt); continue;
      }
      if (response.status !== 200) { await response.body?.cancel(); throw new PreflightError('HTTP', response.status); }
      return limitedJson(response);
    }
    throw new PreflightError('NETWORK');
  }
  const account = assertAccount(await get('account'));
  async function list(kind, field) {
    const seenTokens = new Set(), names = new Set(), rows = []; let token;
    for (let page = 0; page < MAX_PAGES; page++) {
      const result = await get(kind, token), items = result[field] ?? [];
      if (!Array.isArray(items) || items.length > PAGE_SIZE) throw new PreflightError('RESPONSE');
      const prefix = `${ACCOUNT}/${kind === 'quotas' ? 'quotas' : 'cssProducts'}/`;
      for (const item of items) {
        if (typeof item?.name !== 'string' || !item.name.startsWith(prefix) || item.name.length <= prefix.length || names.has(item.name)) throw new PreflightError('ACCOUNT');
        names.add(item.name); rows.push(item);
      }
      token = result.nextPageToken;
      if (token === undefined || token === '') return { rows, pages: page + 1 };
      if (typeof token !== 'string' || seenTokens.has(token)) throw new PreflightError('PAGINATION');
      seenTokens.add(token);
    }
    throw new PreflightError('PAGINATION');
  }
  const quotas = await list('quotas', 'quotaGroups');
  const products = await list('products', 'cssProducts');
  // Only numerical quota fields leave the client; product bodies and resource IDs do not.
  const numberString = value => typeof value === 'string' && /^\d{1,19}$/.test(value) ? value : null;
  return { ok: true, readOnly: true, account, authScopeRequested: SCOPE,
    quotaGroups: quotas.rows.map((row, i) => ({ group: i + 1, dailyUsage: numberString(row.quotaUsage), dailyLimit: numberString(row.quotaLimit), minuteLimit: numberString(row.quotaMinuteLimit) })),
    processedProducts: products.rows.length, pages: { quotas: quotas.pages, products: products.pages }, requests, writes: 0, submittedProducts: 0,
    limitation: 'Access verification only. No product approval or eligibility determination; no product inputs were submitted.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assertGithubContext(process.env);
    if (process.argv.length === 3 && process.argv[2] === '--validate-context') console.log(JSON.stringify({ contextVerified: true, networkRequests: 0 }));
    else {
      if (process.argv.length !== 2) throw new PreflightError('CONFIG');
      const result = await runPreflight({ accessToken: process.env.CSS_ACCESS_TOKEN, apiKey: process.env.CSS_API_KEY, scope: process.env.CSS_OAUTH_SCOPE });
      console.log(JSON.stringify(result));
    }
  } catch (error) { console.error(JSON.stringify(publicError(error))); process.exitCode = 1; }
}
