import type { Lang } from './lang';
export type { Lang };

export { COUNTRIES, type Country } from '../shared/markets.ts';
import { COUNTRIES } from '../shared/markets.ts';

export const DEFAULT_COUNTRY = 'gr';

export const findCountry = (code?: string) => COUNTRIES.find((c) => c.code === code?.toLowerCase());

export const SITE = {
  name: 'Tagora',
  version: __APP_VERSION__,
  /** Fill these in before launch (they show in the footer and the legal pages). */
  company: {
    legalName: 'GROW Agency Ε.Ε.',
    address: 'Κολοκοτρώνη 64Α, 173 43 Άγιος Δημήτριος, Αττική',
    gemi: '[GEMI NUMBER]',
    vat: '[VAT NUMBER]',
    email: 'hello@tagora.online',
    phone: '+30 210 9713335',
  },
  poweredBy: { name: 'GROW Agency', url: 'https://growagency.online' },
  gtmId: import.meta.env.VITE_GTM_ID || '',
  hitsPerPage: 16,
};

export const SEARCH_CONFIG = {
  // auto: the admin page decides (demo or the partner shops' products in D1).
  // local: always the demo. typesense: a Typesense cluster (VITE_TYPESENSE_*).
  backend: (import.meta.env.VITE_SEARCH_BACKEND || 'auto') as 'auto' | 'local' | 'typesense',
  typesense: {
    host: import.meta.env.VITE_TYPESENSE_HOST || '',
    port: import.meta.env.VITE_TYPESENSE_PORT || '443',
    protocol: import.meta.env.VITE_TYPESENSE_PROTOCOL || 'https',
    apiKey: import.meta.env.VITE_TYPESENSE_SEARCH_KEY || '',
    collection: import.meta.env.VITE_TYPESENSE_COLLECTION || 'products',
  },
};

export const STORAGE_KEYS = {
  country: 'tagora_country',
  consent: 'tagora_consent',
};
