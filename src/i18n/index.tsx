import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STORAGE_KEYS, type Country, type Lang } from '../config';
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

// ---------- language choice ----------
// The language follows the country (Greece/Cyprus: Greek, Ireland/Malta: English) until the
// visitor picks one with the ΕΛ | EN switch. The choice is remembered and kept across countries.
// A link with ?lang=en or ?lang=el sets it too.

const LANGS: Lang[] = ['el', 'en'];
const isLang = (v: unknown): v is Lang => LANGS.includes(v as Lang);

function initialChoice(): Lang | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lang');
    if (isLang(fromUrl)) { localStorage.setItem(STORAGE_KEYS.lang, fromUrl); return fromUrl; }
    const saved = localStorage.getItem(STORAGE_KEYS.lang);
    return isLang(saved) ? saved : null;
  } catch {
    return null;
  }
}

const LangChoice = createContext<{ choice: Lang | null; choose: (l: Lang) => void }>({ choice: null, choose: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<Lang | null>(initialChoice);
  const choose = useCallback((l: Lang) => {
    setChoice(l);
    try { localStorage.setItem(STORAGE_KEYS.lang, l); } catch { /* storage blocked */ }
  }, []);
  const value = useMemo(() => ({ choice, choose }), [choice, choose]);
  return <LangChoice.Provider value={value}>{children}</LangChoice.Provider>;
}

/** Switches the interface language (keeps the country, its prices and shops). */
export const useChooseLanguage = () => useContext(LangChoice).choose;

export function pickLang(v: Localized | undefined, lang: Lang): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  return v[lang] ?? v.en ?? v.el ?? Object.values(v)[0] ?? '';
}

export function LocaleProvider({ country, children }: { country: Country; children: ReactNode }) {
  const { choice } = useContext(LangChoice);
  const lang: Lang = choice ?? country.lang;
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const value = useMemo<Locale>(() => {
    const dict = STRINGS[lang];
    // English in Greece formats like "€1,234.50"; Greek like "1.234,50 €".
    const locale = lang === country.lang ? country.locale : `${lang}-${country.code.toUpperCase()}`;
    const money = new Intl.NumberFormat(locale, { style: 'currency', currency: country.currency });
    const number = new Intl.NumberFormat(locale);
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
  }, [country, lang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale {
  const v = useContext(Ctx);
  if (!v) throw new Error('useLocale must be used inside <LocaleProvider>');
  return v;
}
