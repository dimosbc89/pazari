import { useChooseLanguage, useLocale } from '../i18n';
import type { Lang } from '../config';

const LANGS: { code: Lang; short: string; name: string }[] = [
  { code: 'el', short: 'ΕΛ', name: 'Ελληνικά' },
  { code: 'en', short: 'EN', name: 'English' },
];

/** ΕΛ | EN. On small screens only the other language shows, to leave room for the search box. */
export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, t } = useLocale();
  const choose = useChooseLanguage();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label={t('lang.label')}>
      {LANGS.map((l) => (
        <button key={l.code} type="button" lang={l.code} title={l.name} aria-label={l.name}
          aria-pressed={lang === l.code} className={lang === l.code ? 'is-active' : ''} onClick={() => choose(l.code)}>
          {l.short}
        </button>
      ))}
    </div>
  );
}
