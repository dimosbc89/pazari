// Which products the website shows: the partner shops' (live) or the fictional demo
// catalogue (demo). The admin page switches it for everyone (/api/catalogue/mode).
// `?catalogue=live` or `?catalogue=demo` previews one or the other in this browser tab
// only; `?catalogue=auto` goes back to the site's setting.
import { useEffect, useState } from 'react';
import { SEARCH_CONFIG } from '../config';
import { withRequestTimeout } from '../lib/request-timeout';
import { createApiBackend } from './api';
import { createLocalBackend } from './local';
import { createTypesenseBackend } from './typesense';
import type { SearchBackend } from './types';

export type CatalogueMode = 'demo' | 'live';
const PREVIEW_KEY = 'tagora_catalogue';

const demo = createLocalBackend();
const live: SearchBackend = SEARCH_CONFIG.backend === 'typesense' ? createTypesenseBackend(SEARCH_CONFIG.typesense) : createApiBackend();

function preview(): CatalogueMode | null {
  try {
    const p = new URLSearchParams(window.location.search).get('catalogue');
    if (p === 'live' || p === 'demo') sessionStorage.setItem(PREVIEW_KEY, p);
    if (p === 'auto') sessionStorage.removeItem(PREVIEW_KEY);
    const v = sessionStorage.getItem(PREVIEW_KEY);
    return v === 'live' || v === 'demo' ? v : null;
  } catch {
    return null;
  }
}

let mode: Promise<CatalogueMode> | null = null;
const modeListeners = new Set<(value: CatalogueMode) => void>();

async function resolveMode(): Promise<CatalogueMode> {
  if (SEARCH_CONFIG.backend === 'local') return 'demo';
  if (SEARCH_CONFIG.backend === 'typesense') return 'live';
  const forced = preview();
  if (forced) return forced;
  return withRequestTimeout(async (signal) => {
    const res = await fetch('/api/catalogue/mode', { signal });
    // A static host has no shop API. Temporary failures must not select demo products.
    if (res.status === 404) return 'demo';
    if (!res.ok) throw new Error(`Catalogue mode ${res.status}`);
    const data = (await res.json()) as { mode?: unknown; ok?: unknown } | null;
    if (!data || typeof data !== 'object' || data.ok === false || (data.mode !== 'live' && data.mode !== 'demo')) {
      throw new Error('Invalid catalogue mode');
    }
    return data.mode;
  });
}

/** Share an in-flight or successful mode; allow a fresh attempt after failure. */
export function catalogueMode(): Promise<CatalogueMode> {
  if (mode) return mode;
  const attempt = resolveMode();
  mode = attempt;
  void attempt.then(
    (value) => { if (mode === attempt) for (const listener of modeListeners) listener(value); },
    () => { if (mode === attempt) mode = null; },
  );
  return attempt;
}

const pick = async () => ((await catalogueMode()) === 'live' ? live : demo);

export const backend: SearchBackend = {
  search: async (p) => (await pick()).search(p),
  getProduct: async (id) => (await pick()).getProduct(id),
  getVariants: async (g, c) => (await pick()).getVariants(g, c),
  getOffers: async (k, c, referenceId, size) => (await pick()).getOffers(k, c, referenceId, size),
  stats: async (c) => (await pick()).stats(c),
};

/** True while the site shows the demo catalogue (the footer says so). */
export function useIsDemo() {
  const [isDemo, setIsDemo] = useState(false);
  useEffect(() => {
    let on = true;
    const update = (value: CatalogueMode) => { if (on) setIsDemo(value === 'demo'); };
    modeListeners.add(update);
    // Stay subscribed so a later successful Retry also updates the demo notice.
    void catalogueMode().then(update, () => {});
    return () => { on = false; modeListeners.delete(update); };
  }, []);
  return isDemo;
}

export * from './types';
