// Passwordless sign-in: a one-time link by email, then a session cookie.
import { adminEmails, type Env } from './env.ts';
import { addHours, getCookie, HttpError, nowIso } from './http.ts';

export const SESSION_COOKIE = 'tagora_session';
const SESSION_DAYS = 30;
const LINK_MINUTES = 30;

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Creates a sign-in token (max 5 per email per hour). Returns the raw token for the link. */
export async function createLoginToken(env: Env, email: string): Promise<string | null> {
  const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_tokens WHERE email = ? AND created_at > ?')
    .bind(email, addHours(-1)).first<{ n: number }>();
  if ((recent?.n ?? 0) >= 5) return null;
  const token = randomToken();
  await env.DB.prepare('INSERT INTO login_tokens (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), email, nowIso(), new Date(Date.now() + LINK_MINUTES * 60_000).toISOString()).run();
  return token;
}

/** Uses a sign-in token once and opens a session. Returns the cookie header and email. */
export async function redeemLoginToken(env: Env, token: string) {
  const hash = await sha256(token);
  const row = await env.DB.prepare('SELECT email, expires_at, used_at FROM login_tokens WHERE token_hash = ?').bind(hash).first<{ email: string; expires_at: string; used_at: string | null }>();
  if (!row || row.used_at || row.expires_at < nowIso()) throw new HttpError(400, 'link_invalid', 'This sign-in link has expired or was already used.');
  await env.DB.prepare('UPDATE login_tokens SET used_at = ? WHERE token_hash = ?').bind(nowIso(), hash).run();
  const session = randomToken();
  await env.DB.prepare('INSERT INTO sessions (token_hash, email, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(session), row.email, nowIso(), addHours(24 * SESSION_DAYS)).run();
  const cookie = `${SESSION_COOKIE}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`;
  return { email: row.email, cookie };
}

export interface Session {
  email: string;
  admin: boolean;
}

export async function getSession(env: Env, req: Request): Promise<Session | null> {
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const row = await env.DB.prepare('SELECT email FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(await sha256(token), nowIso()).first<{ email: string }>();
  if (!row) return null;
  return { email: row.email, admin: adminEmails(env).includes(row.email) };
}

export async function requireSession(env: Env, req: Request): Promise<Session> {
  const s = await getSession(env, req);
  if (!s) throw new HttpError(401, 'signed_out', 'Please sign in.');
  return s;
}

export async function endSession(env: Env, req: Request): Promise<string> {
  const token = getCookie(req, SESSION_COOKIE);
  if (token) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Housekeeping, run with the schedule. */
export async function purgeExpired(env: Env) {
  const now = nowIso();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM login_tokens WHERE expires_at < ?').bind(addHours(-24)),
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
  ]);
}
