export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message?: string) {
    super(message ?? code);
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export const errorResponse = (e: HttpError) => json({ ok: false, code: e.code, message: e.message }, e.status);

/** Reads a JSON body (max 64 KB unless a larger limit is given). */
export async function body<T = Record<string, unknown>>(req: Request, maxBytes = 65_536): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'too_large');
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

/**
 * Blocks cross-site requests that change data: the request must be JSON and, when the
 * browser sends an Origin, it must be this site. (Session cookies are also SameSite=Lax.)
 */
export function checkSameOrigin(req: Request) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = req.headers.get('Origin');
  if (origin && origin !== new URL(req.url).origin) throw new HttpError(403, 'bad_origin');
  if (!(req.headers.get('Content-Type') || '').includes('application/json')) throw new HttpError(415, 'json_required');
}

export function getCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get('Cookie') || '';
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return undefined;
}

export const nowIso = () => new Date().toISOString();
export const addHours = (h: number, from = Date.now()) => new Date(from + h * 3_600_000).toISOString();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (s: unknown): s is string => typeof s === 'string' && s.length <= 200 && EMAIL.test(s.trim());

/** Trimmed string or undefined; throws when longer than max. */
export function str(v: unknown, max = 200): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string') throw new HttpError(400, 'bad_field');
  const s = v.trim();
  if (s.length > max) throw new HttpError(400, 'too_long');
  return s || undefined;
}

export function num(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > 100_000) throw new HttpError(400, 'bad_number');
  return Math.round(n * 100) / 100;
}
