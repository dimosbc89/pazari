import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Carts } from '../components/Carts';
import { Footer } from '../components/Footer';
import { Wordmark } from '../components/Logo';
import { SearchInput } from '../components/SearchInput';
import { useLocale } from '../i18n';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { backend } from '../search';

export function Home() {
  const { t, num, path, country } = useLocale();
  const [typed, setTyped] = useState(0);
  const stats = useAsync(() => backend.stats(country.code), [country.code]);
  useDocumentTitle(t('meta.title'));
  const s = stats.data;

  return (
    <div className="home">
      <div className="awning" aria-hidden="true" />
      <div className="home-stage">
        <main className="home-main container">
          <h1 className="home-logo">
            <Wordmark title="Tagora" />
          </h1>
          <p className="home-title">{t('home.title')}</p>
          <SearchInput size="lg" onType={(v) => setTyped(v.trim().length)} />
          <p className="home-description">{t('home.description', { shops: s ? num(s.shops) : '…' })}</p>
          <p className="home-try">
            <span>{t('home.try')}</span>
            {t('home.suggestions').split('|').map((w) => (
              <Link key={w} to={`${path('/products')}?q=${encodeURIComponent(w)}`} className="tag">{w}</Link>
            ))}
          </p>
          <dl className="home-stats">
            <div><dt>{t('home.stat.offers')}</dt><dd>{s ? num(s.offers) : '–'}</dd></div>
            <div><dt>{t('home.stat.shops')}</dt><dd>{s ? num(s.shops) : '–'}</dd></div>
            <div><dt>{t('home.stat.brands')}</dt><dd>{s ? num(s.brands) : '–'}</dd></div>
            <div><dt>{t('home.stat.free')}</dt><dd>0 €</dd></div>
          </dl>
        </main>
        <Carts progress={typed} />
      </div>
      <Footer />
    </div>
  );
}
