import { useId, useMemo, useState } from 'react';
import { useLocale } from '../i18n';
import { fold } from '../search/local';
import type { FacetKey, FacetValue } from '../search';
import { Icon } from './Icons';

const VISIBLE = 5;

/** A checkbox list for one facet: first five values, then "show all" with a search box. */
export function FacetList({ facet, values, selected, onToggle }: {
  facet: FacetKey;
  values: FacetValue[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const { t, num, facetLabel } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState('');
  const id = useId();
  const title = t(`facet.${facet}`);

  const list = useMemo(() => {
    const f = fold(filter.trim());
    const all = f ? values.filter((v) => fold(facetLabel(facet, v.value)).includes(f)) : values;
    return expanded || f ? all : all.slice(0, VISIBLE);
  }, [values, filter, expanded, facet, facetLabel]);

  if (values.length === 0) return null;

  return (
    <fieldset className="facet">
      <legend className="facet-title">{title}</legend>
      {expanded && values.length > VISIBLE && (
        <div className="facet-search">
          <Icon name="search" />
          <input type="search" value={filter} placeholder={t('filters.searchIn', { f: title.toLowerCase() })}
            aria-label={t('filters.searchIn', { f: title.toLowerCase() })} onChange={(e) => setFilter(e.target.value)} />
        </div>
      )}
      <ul className="facet-list">
        {list.map((v) => {
          const checked = selected.includes(v.value);
          const inputId = `${id}-${v.value}`;
          return (
            <li key={v.value} className={checked ? 'is-checked' : ''}>
              <input type="checkbox" id={inputId} checked={checked} onChange={() => onToggle(v.value)} />
              <label htmlFor={inputId}>
                {facet === 'color' && /^[a-z]+$/.test(v.value) && <i className={`swatch swatch--${v.value}`} />}
                <span className="facet-label">{facetLabel(facet, v.value)}</span>
                <span className="facet-count">{num(v.count)}</span>
              </label>
            </li>
          );
        })}
        {list.length === 0 && <li className="facet-empty">{t('filters.noMatch')}</li>}
      </ul>
      {values.length > VISIBLE && (
        <button type="button" className="facet-more linklike" onClick={() => { setExpanded(!expanded); setFilter(''); }}>
          {expanded ? t('filters.viewLess') : t('filters.viewMore', { n: values.length })}
        </button>
      )}
    </fieldset>
  );
}
