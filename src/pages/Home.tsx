import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Carts } from '../components/Carts';
import { Footer } from '../components/Footer';
import { Wordmark } from '../components/Logo';
import { SearchInput } from '../components/SearchInput';
import { useLocale } from '../i18n';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { backend } from '../search';
import { LangSwitch } from '../components/LangSwitch';
import { categorySuggestions } from '../../shared/category-suggestions';

export function Home() {
  const { t, num, path, country, facetLabel } = useLocale();
  const [typed, setTyped] = useState(0);
  const stats = useAsync(async () => ({ country: country.code, stats: await backend.stats(country.code) }), [country.code]);
  useDocumentTitle(t('meta.title'));
  // useAsync retains previous data; never show another country's shortcuts while loading.
  const s = stats.data?.country === country.code ? stats.data.stats : undefined;
  const suggestions = !stats.loading && !stats.error
    ? categorySuggestions(s?.categories ?? [], (value) => facetLabel('category', value)) : [];

  return (
    <div className="home">
      <div className="awning" aria-hidden="true" />
      <div className="home-stage">
        <div className="home-top container"><LangSwitch className="lang-switch--full" /></div>
        <main className="home-main container">
          <h1 className="home-logo">
            <Wordmark title="Tagora" />
          </h1>
          <p className="home-title">{t('home.title')}</p>
          <SearchInput size="lg" onType={(v) => setTyped(v.trim().length)} />
          {s && s.offers === 0 ? (
            // Just launched: no partner products yet.
            <>
              <p className="home-description">{t('launch.home')}</p>
              <p className="home-try"><Link to={path('/shops')} className="btn btn--ghost">{t('launch.shops')}</Link></p>
            </>
          ) : (
            <>
              <p className="home-description">{t('home.description', { shops: s ? num(s.shops) : '…' })}</p>
              {suggestions.length > 0 && <p className="home-try">
                <span>{t('home.try')}</span>
                {suggestions.map(({ value }) => (
                  <Link key={value} to={`${path('/products')}?${new URLSearchParams({ category: value })}`} className="tag">{facetLabel('category', value)}</Link>
                ))}
              </p>}
            </>
          )}
          {!(s && s.offers === 0) && <dl className="home-stats">
            <div><dt>{t('home.stat.offers')}</dt><dd>{s ? num(s.offers) : '–'}</dd></div>
            <div><dt>{t('home.stat.shops')}</dt><dd>{s ? num(s.shops) : '–'}</dd></div>
            <div><dt>{t('home.stat.brands')}</dt><dd>{s ? num(s.brands) : '–'}</dd></div>
            <div><dt>{t('home.stat.free')}</dt><dd>0 €</dd></div>
          </dl>}
        </main>
        <Carts progress={typed} />
      </div>
      <Footer />
    </div>
  );
}
