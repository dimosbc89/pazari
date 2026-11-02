import { useEffect, useRef, useState } from 'react';
import { useLocale } from '../i18n';
import { SORTS, type SortKey } from '../search';
import type { StringKey } from '../i18n/strings';
import { Icon } from './Icons';

const LABEL: Record<SortKey, StringKey> = {
  relevance: 'sort.relevance',
  price_asc: 'sort.priceAsc',
  price_desc: 'sort.priceDesc',
  discount: 'sort.discount',
};

export function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  return (
    <div className="sort" ref={box}>
      <button type="button" className="sort-button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="sort-label">{t('sort.label')}:</span> <strong>{t(LABEL[value])}</strong>
        <Icon name="chevron" className={`chevron ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <ul className="sort-list" role="listbox" aria-label={t('sort.label')}>
          {SORTS.map((s) => (
            <li key={s} role="option" aria-selected={s === value}>
              <button type="button" className={s === value ? 'is-active' : ''} onClick={() => { onChange(s); setOpen(false); }}>
                <span className="radio" />{t(LABEL[s])}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
