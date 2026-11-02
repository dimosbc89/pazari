import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { COUNTRIES } from '../config';
import { useLocale } from '../i18n';
import { Icon } from './Icons';

/** Footer country switch. Keeps the current page (and search) when it exists in the new country. */
export function CountryPicker() {
  const { country, t } = useLocale();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const go = (code: string) => {
    setOpen(false);
    if (code === country.code) return;
    const rest = location.pathname.split('/').slice(2);
    // A product page may not exist in another country: fall back to the results.
    const keep = rest[0] === 'pages' || (rest[0] === 'products' && rest.length === 1);
    const q = new URLSearchParams(location.search).get('q');
    if (keep) navigate(`/${code}/${rest.join('/')}${location.search}`);
    else if (rest[0] === 'products') navigate(`/${code}/products${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    else navigate(`/${code}`);
  };

  return (
    <div className="country" ref={box}>
      <button type="button" className="country-current" aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${t('country.change')}: ${country.label}`} onClick={() => setOpen(!open)}>
        <Icon name="location" />
        <span>{country.label}</span>
        <Icon name="chevron" className={`chevron ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <ul className="country-list" role="listbox" aria-label={t('country.label')}>
          {COUNTRIES.map((c) => (
            <li key={c.code} role="option" aria-selected={c.code === country.code}>
              <button type="button" onClick={() => go(c.code)} className={c.code === country.code ? 'is-active' : ''}>
                <span className="country-code">{c.code.toUpperCase()}</span> {c.label}
                {c.code === country.code && <Icon name="check" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
