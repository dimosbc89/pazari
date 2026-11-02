// Markets the site serves. Shared by the website (src/config.ts) and the Worker.
// Add a country here and tag products with its code.
import type { Lang } from '../src/lang.ts';

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

export const COUNTRIES: Country[] = [
  { code: 'gr', label: 'Ελλάδα', lang: 'el', currency: 'EUR', locale: 'el-GR' },
  { code: 'cy', label: 'Κύπρος', lang: 'el', currency: 'EUR', locale: 'el-CY' },
  { code: 'ie', label: 'Ireland', lang: 'en', currency: 'EUR', locale: 'en-IE' },
  { code: 'mt', label: 'Malta', lang: 'en', currency: 'EUR', locale: 'en-MT' },
];
