// Which products the website shows: the partner shops' (live) or the fictional demo
// catalogue (demo). The admin page switches it for everyone (/api/catalogue/mode).
// `?catalogue=live` or `?catalogue=demo` previews one or the other in this browser tab
// only; `?catalogue=auto` goes back to the site's setting.
import { useEffect, useState } from 'react';
import { SEARCH_CONFIG } from '../config';
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
/** The catalogue this visitor sees. Without the shop API (e.g. a static host), the demo. */
export function catalogueMode(): Promise<CatalogueMode> {
  return (mode ??= (async (): Promise<CatalogueMode> => {
    if (SEARCH_CONFIG.backend === 'local') return 'demo';
    if (SEARCH_CONFIG.backend === 'typesense') return 'live';
    const forced = preview();
    if (forced) return forced;
    try {
      const res = await fetch('/api/catalogue/mode');
      const data = (await res.json()) as { mode?: string };
      return data.mode === 'live' ? 'live' : 'demo';
    } catch {
      return 'demo';
    }
  })());
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
  useEffect(() => { let on = true; catalogueMode().then((m) => on && setIsDemo(m === 'demo')); return () => { on = false; }; }, []);
  return isDemo;
}

export * from './types';
