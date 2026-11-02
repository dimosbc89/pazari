import { useLocale } from '../i18n';
import { FACETS, type FacetKey, type Refinements } from '../search';
import { Icon } from './Icons';

export function ActiveFilters({ refinements, onRemove, onClear }: {
  refinements: Refinements;
  onRemove: (facet: FacetKey, value: string) => void;
  onClear: () => void;
}) {
  const { t, facetLabel } = useLocale();
  const chips = FACETS.flatMap((f) => (refinements[f] ?? []).map((v) => ({ f, v })));
  if (chips.length === 0) return null;
  return (
    <div className="chips">
      {chips.map(({ f, v }) => {
        const label = facetLabel(f, v);
        return (
          <button key={`${f}:${v}`} type="button" className="chip" onClick={() => onRemove(f, v)} aria-label={t('filters.remove', { v: label })}>
            <span className="chip-facet">{t(`facet.${f}`)}:</span> {label}
            <Icon name="close" />
          </button>
        );
      })}
      {chips.length > 1 && <button type="button" className="chips-clear linklike" onClick={onClear}>{t('filters.clearAll')}</button>}
    </div>
  );
}
