export type Lang = 'el' | 'en';

export interface Country {
  /** URL segment, e.g. /gr */
  code: string;
  /** Name shown in the country picker, in that country's language */
  label: string;
  lang: Lang;
  currency: string;
  /** Used for number and price formatting */
  locale: string;
}

/** Markets the site serves. Add a country here and tag products with its code. */
export const COUNTRIES: Country[] = [
  { code: 'gr', label: 'Ελλάδα', lang: 'el', currency: 'EUR', locale: 'el-GR' },
  { code: 'cy', label: 'Κύπρος', lang: 'el', currency: 'EUR', locale: 'el-CY' },
  { code: 'ie', label: 'Ireland', lang: 'en', currency: 'EUR', locale: 'en-IE' },
  { code: 'mt', label: 'Malta', lang: 'en', currency: 'EUR', locale: 'en-MT' },
];

export const DEFAULT_COUNTRY = 'gr';

export const findCountry = (code?: string) => COUNTRIES.find((c) => c.code === code?.toLowerCase());

export const SITE = {
  name: 'Pazari',
  version: __APP_VERSION__,
  /** Fill these in before launch (they show in the footer and the legal pages). */
  company: {
    legalName: '[COMPANY LEGAL NAME]',
    address: '[ADDRESS]',
    gemi: '[GEMI NUMBER]',
    vat: '[VAT NUMBER]',
    email: '[CONTACT EMAIL]',
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
  country: 'pazari_country',
  consent: 'pazari_consent',
};
