import { SyncError } from './types.ts';

export interface FetchOptions {
  /** Allow localhost and private network addresses (local development only). */
  allowPrivate?: boolean;
  /** Largest response accepted, in bytes. */
  maxBytes?: number;
  timeoutMs?: number;
}

const UA = 'TagoraBot/1.0 (+https://tagora.online/gr/shops; product sync)';
const DEFAULT_MAX = 80 * 1024 * 1024;

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  return h === '::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80');
}

/** Parses and checks a shop-supplied URL. Throws SyncError('bad_url') when it can't be used. */
export function checkUrl(raw: string, opts: FetchOptions = {}): URL {
  let url: URL;
  try {
    url = new URL(raw.trim().match(/^https?:\/\//i) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    throw new SyncError('bad_url', 'This is not a valid web address.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new SyncError('bad_url', 'Only http and https addresses are supported.');
  if (url.username || url.password) throw new SyncError('bad_url', 'Addresses with a username or password are not supported.');
  if (!opts.allowPrivate && isPrivateHost(url.hostname)) throw new SyncError('bad_url', 'This address is not reachable from the internet.');
  return url;
}

async function get(url: string, opts: FetchOptions, accept: string): Promise<Response> {
  checkUrl(url, opts);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: accept },
      redirect: 'follow',
      signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new SyncError(timeout ? 'timeout' : 'unreachable', timeout ? 'The shop took too long to answer.' : `Could not connect to ${new URL(url).host}.`);
  }
  if (res.url) checkUrl(res.url, opts); // a redirect must not lead somewhere private either
  return res;
}

async function readBody(res: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new SyncError('too_large', `The file is larger than ${Math.round(maxBytes / 1048576)} MB.`);
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new SyncError('too_large', `The file is larger than ${Math.round(maxBytes / 1048576)} MB.`);
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}

/** Decodes using the charset from the headers or the XML declaration (Greek feeds sometimes use windows-1253). */
function decode(bytes: Uint8Array, contentType: string | null): string {
  const head = new TextDecoder('latin1').decode(bytes.subarray(0, 200));
  const charset = (contentType?.match(/charset=([\w-]+)/i)?.[1] || head.match(/encoding=["']([\w-]+)["']/i)?.[1] || 'utf-8').toLowerCase();
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const res = await get(url, opts, 'application/xml, text/xml, text/csv, text/plain, */*');
  if (!res.ok) throw new SyncError('http_error', `The address answered with an error (HTTP ${res.status}).`);
  return decode(await readBody(res, opts.maxBytes ?? DEFAULT_MAX), res.headers.get('content-type'));
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<{ data: T; headers: Headers; status: number }> {
  const res = await get(url, opts, 'application/json');
  if (!res.ok) return { data: null as T, headers: res.headers, status: res.status };
  const text = decode(await readBody(res, opts.maxBytes ?? DEFAULT_MAX), res.headers.get('content-type'));
  try {
    return { data: JSON.parse(text) as T, headers: res.headers, status: res.status };
  } catch {
    return { data: null as T, headers: res.headers, status: 0 };
  }
}
