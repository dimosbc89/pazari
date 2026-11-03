// Client for the shop API (worker/routes.ts).
import { useCallback, useEffect, useState } from 'react';
import { useLocale } from '../i18n';
import type { StringKey } from '../i18n/strings';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      headers: init.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'network', 'Network error');
  }
  // Anything that isn't our JSON (e.g. a static host answering with index.html) is an error.
  const data = (await res.json().catch(() => null)) as { ok?: boolean; code?: string; message?: string } | null;
  if (!data || typeof data !== 'object') throw new ApiError(res.status, 'generic', 'The service is not available.');
  if (!res.ok || data.ok === false) throw new ApiError(res.status, data.code ?? 'generic', data.message ?? 'Error');
  return data as T;
}

/** Counts a click-out for the shop (shop + day only). Fire and forget. */
export function trackClick(shopId?: string) {
  if (!shopId) return;
  try {
    navigator.sendBeacon?.('/api/click', JSON.stringify({ shopId }));
  } catch { /* ignore */ }
}

/** Translated text for an API error: our own wording when we know the code, else the server's. */
export function useErrorText() {
  const { t } = useLocale();
  return useCallback((e: unknown) => {
    if (e instanceof ApiError) {
      const key = `err.${e.code}` as StringKey;
      const known = t(key);
      return known !== key ? known : e.message || t('err.generic');
    }
    return t('err.generic');
  }, [t]);
}

// ---------- types (mirror worker/shops.ts) ----------

export type ShopStatus = 'pending' | 'active' | 'paused' | 'rejected';
export type SourceType = 'feed' | 'shopify' | 'woocommerce' | 'plugin';
export interface Issue { code: string; count: number; examples: string[] }

export interface Shop {
  id: string; name: string; website: string; email: string; contactName: string | null; phone: string | null;
  company: string | null; vat: string | null; countries: string[]; lang: string;
  sourceType: SourceType; sourceUrl: string; sourceFormat: string | null;
  defaultShipping: number | null; freeShippingOver: number | null;
  status: ShopStatus; statusReason: string | null; createdAt: string; approvedAt: string | null;
  lastSyncAt: string | null; lastSyncStatus: 'ok' | 'warning' | 'error' | null; lastSyncMessage: string | null;
  lastIssues: Issue[]; productCount: number; nextSyncAt: string | null;
  termsVersion: string | null; termsAcceptedAt: string | null;
  pluginConnected: boolean; pluginSeenAt: string | null; pluginInfo: { plugin?: string; woocommerce?: string; site?: string } | null;
  clicks30?: number;
}

export interface Run {
  id: number; trigger: 'schedule' | 'manual' | 'approve' | 'plugin'; started_at: string; finished_at: string | null;
  status: 'running' | 'ok' | 'warning' | 'error'; found: number | null; imported: number | null; skipped: number | null; removed: number | null; message: string | null;
}

export interface RunResult { status: 'ok' | 'warning' | 'error'; found: number; imported: number; skipped: number; removed: number; message: string | null; issues: Issue[] }

export interface Preview {
  ok: boolean; code?: string; message?: string; format?: string; found?: number; ready?: number; skipped?: number; issues?: Issue[];
  sample?: { title: string; price: number; oldPrice?: number; image: string; brand: string; shipping?: number }[];
}

export interface Me { email: string; admin: boolean; shops: { id: string; name: string; status: ShopStatus }[] }

/** The signed-in user, or null. `reload` after signing in or out. */
export function useMe() {
  const [state, setState] = useState<{ me: Me | null; loading: boolean }>({ me: null, loading: true });
  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    api<Me>('/auth/me').then(
      (me) => setState({ me: me && typeof me.email === 'string' && Array.isArray(me.shops) ? me : null, loading: false }),
      () => setState({ me: null, loading: false }),
    );
  }, []);
  useEffect(reload, [reload]);
  return { ...state, reload };
}

/** "5 minutes ago" / "σε 2 ώρες" */
export function useRelativeTime() {
  const { lang } = useLocale();
  return useCallback((iso: string | null | undefined) => {
    if (!iso) return '';
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    const diff = (Date.parse(iso) - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 60) return rtf.format(Math.round(diff), 'second');
    if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
    return rtf.format(Math.round(diff / 86400), 'day');
  }, [lang]);
}
