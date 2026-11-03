import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ActiveFilters } from '../components/ActiveFilters';
import { FacetList } from '../components/FacetList';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { HitCard } from '../components/HitCard';
import { Icon } from '../components/Icons';
import { SortSelect } from '../components/SortSelect';
import { Loader } from '../components/ui';
import { SITE } from '../config';
import { useLocale } from '../i18n';
import { useAsync, useDocumentTitle, useScrollLock, useSearchState } from '../lib/hooks';
import { backend, FACETS } from '../search';

export function Products() {
  const { t, num, country, lang, path } = useLocale();
  // Right after launch the catalogue can be empty: say so instead of "no results".
  const catalogueEmpty = useAsync(() => backend.stats(country.code), [country.code]).data?.offers === 0;
  const { query, sort, refinements, toggle, remove, clear, setSort } = useSearchState();
  const [drawer, setDrawer] = useState(false);
  useScrollLock(drawer);

  // "Load more" page count, reset whenever the search itself changes.
  const searchKey = JSON.stringify([query, sort, refinements, country.code]);
  const [more, setMore] = useState({ key: searchKey, pages: 1 });
  const pages = more.key === searchKey ? more.pages : 1;
  const setPages = (n: number) => setMore({ key: searchKey, pages: n });

  const { data, loading, error } = useAsync(
    () => backend.search({ query, sort, refinements, country: country.code, lang, limit: pages * SITE.hitsPerPage }),
    [searchKey, pages],
  );

  useDocumentTitle(query ? `${query} · Tagora` : t('meta.title'));

  const total = data?.total ?? 0;
  const countText = total === 1 ? t('results.countOne') : t('results.count', { n: num(total) });
  const hasFilters = FACETS.some((f) => refinements[f]?.length);
  const refinedCount = FACETS.reduce((n, f) => n + (refinements[f]?.length ?? 0), 0);

  return (
    <>
      <Header query={query} />
      <main className="results container">
        <aside className={`filters ${drawer ? 'is-open' : ''}`} aria-label={t('filters.title')}>
          <div className="filters-head">
            <h2>{t('filters.title')}</h2>
            <button type="button" className="icon-btn filters-close" onClick={() => setDrawer(false)} aria-label={t('filters.close')}>
              <Icon name="close" />
            </button>
          </div>
          <div className="filters-body">
            {data && FACETS.map((f) => (
              <FacetList key={`${f}-${country.code}`} facet={f} values={data.facets[f]} selected={refinements[f] ?? []} onToggle={(v) => toggle(f, v)} />
            ))}
          </div>
          <div className="filters-foot">
            {hasFilters && <button type="button" className="btn btn--ghost" onClick={clear}>{t('filters.clearAll')}</button>}
            <button type="button" className="btn" onClick={() => setDrawer(false)}>{t('filters.apply', { n: num(total) })}</button>
          </div>
        </aside>
        {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}

        <section className="results-main" aria-busy={loading}>
          <div className="results-head">
            <h1 className="results-count">
              {data ? countText : ' '}
              {query && data && <span className="results-for"> {t('results.for', { q: query })}</span>}
            </h1>
            <div className="results-tools">
              <button type="button" className="btn btn--ghost filters-open" onClick={() => setDrawer(true)}>
                <Icon name="filters" /> {t('filters.show')}
                {refinedCount > 0 && <span className="count-badge">{refinedCount}</span>}
              </button>
              <SortSelect value={sort} onChange={setSort} />
            </div>
          </div>
          <ActiveFilters refinements={refinements} onRemove={remove} onClear={clear} />
          <p className="ranking-note"><Link to={path('/pages/ranking')}>{t('results.howRanked')}</Link></p>

          {error && <p className="notice notice--error">{t('results.error')}</p>}
          {!data && loading && <Loader />}

          {data && total === 0 && !loading && (
            catalogueEmpty ? (
              <div className="empty">
                <Icon name="store" />
                <h2>{t('launch.results.title')}</h2>
                <p>{t('launch.results.text')}</p>
                <Link to={path('/shops')} className="btn btn--ghost">{t('launch.shops')}</Link>
              </div>
            ) : (
              <div className="empty">
                <Icon name="search" />
                <h2>{t('results.empty.title')}</h2>
                <p>{t('results.empty.text')}</p>
                {hasFilters && <button type="button" className="btn" onClick={clear}>{t('results.empty.clear')}</button>}
              </div>
            )
          )}

          {data && data.hits.length > 0 && (
            <div className={`grid ${loading ? 'is-stale' : ''}`}>
              {data.hits.map((h) => <HitCard key={h.id} hit={h} query={query} />)}
            </div>
          )}

          {data && data.hits.length < total && (
            <div className="more">
              <button type="button" className="btn btn--ghost btn--wide" disabled={loading} onClick={() => setPages(pages + 1)}>
                {loading ? <Loader inline /> : t('results.loadMore')}
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
