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
    legalName: '[COMPANY LEGAL NAME]',
    address: '[ADDRESS]',
    gemi: '[GEMI NUMBER]',
    vat: '[VAT NUMBER]',
    email: '[CONTACT EMAIL]',
    phone: '[CUSTOMER SERVICE PHONE]',
    hours: '[OPENING HOURS]',
  },
  poweredBy: { name: 'GROW Agency', url: 'https://growagency.online' },
  gtmId: import.meta.env.VITE_GTM_ID || '',
  hitsPerPage: 16,
};

export const SEARCH_CONFIG = {
  backend: (import.meta.env.VITE_SEARCH_BACKEND || 'local') as 'local' | 'typesense',
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
