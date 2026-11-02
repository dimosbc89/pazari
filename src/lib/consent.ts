// Cookie consent. Nothing but strictly necessary storage runs until the visitor accepts.
// Analytics / ads tags (Google Tag Manager) load only after "Accept all".
import { SITE, STORAGE_KEYS } from '../config';

export interface Consent {
  analytics: boolean;
  /** When the choice was made (ms). Asked again after 12 months. */
  ts: number;
}

const TWELVE_MONTHS = 365 * 24 * 60 * 60 * 1000;
export const OPEN_SETTINGS_EVENT = 'tagora:cookie-settings';

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.consent);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    return Date.now() - c.ts > TWELVE_MONTHS ? null : c;
  } catch {
    return null;
  }
}

export function saveConsent(analytics: boolean) {
  const c: Consent = { analytics, ts: Date.now() };
  try { localStorage.setItem(STORAGE_KEYS.consent, JSON.stringify(c)); } catch { /* private mode: keep for this visit only */ }
  if (analytics) loadTagManager();
  window.dispatchEvent(new CustomEvent('tagora:consent', { detail: c }));
}

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));

let loaded = false;
export function loadTagManager() {
  const id = SITE.gtmId;
  if (!id || loaded) return;
  loaded = true;
  const w = window as unknown as { dataLayer: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

/** Pushes an analytics event (only reaches Google once consent is given and GTM is loaded). */
export function track(event: string, data: Record<string, unknown> = {}) {
  const w = window as unknown as { dataLayer?: unknown[] };
  if (loaded && w.dataLayer) w.dataLayer.push({ event, ...data });
}
