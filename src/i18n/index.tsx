import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Country, Lang } from '../config';
import { STRINGS, type StringKey } from './strings';
import type { Localized } from '../search/types';

export interface Locale {
  country: Country;
  lang: Lang;
  /** Translate a UI string; {name} placeholders are filled from vars. */
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  /** Formats a price in the country's currency, e.g. 1.234,50 € */
  price: (n: number) => string;
  num: (n: number) => string;
  /** Label for a facet value: translated for known keys, as-is otherwise (real feeds). */
  facetLabel: (facet: string, value: string) => string;
  /** Picks the right language from a localized field. */
  loc: (v: Localized | undefined) => string;
  /** Prefixes a path with the current country: /gr/products */
  path: (p?: string) => string;
}

const Ctx = createContext<Locale | null>(null);

export function pickLang(v: Localized | undefined, lang: Lang): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[lang] ?? v.en ?? v.el ?? Object.values(v)[0] ?? '';
}

export function LocaleProvider({ country, children }: { country: Country; children: ReactNode }) {
  const value = useMemo<Locale>(() => {
    const lang = country.lang;
    const dict = STRINGS[lang];
    const money = new Intl.NumberFormat(country.locale, { style: 'currency', currency: country.currency });
    const number = new Intl.NumberFormat(country.locale);
    const t: Locale['t'] = (key, vars) => {
      let s = dict[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
      return s;
    };
    return {
      country,
      lang,
      t,
      price: (n) => money.format(n),
      num: (n) => number.format(n),
      facetLabel: (facet, value) => {
        const key = `${facet}.${value}` as StringKey;
        return key in dict ? dict[key] : value;
      },
      loc: (v) => pickLang(v, lang),
      path: (p = '') => `/${country.code}${p ? (p.startsWith('/') ? p : `/${p}`) : ''}`,
    };
  }, [country]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLocale must be used inside <LocaleProvider>');
  return v;
}
