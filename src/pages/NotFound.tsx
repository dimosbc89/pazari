import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import { Icon } from '../components/Icons';
import { useLocale } from '../i18n';
import { useDocumentTitle } from '../lib/hooks';

export function NotFound() {
  const { t, path } = useLocale();
  useDocumentTitle(`${t('notFound.title')} · Tagora`);
  return (
    <>
      <Header />
      <main className="container">
        <div className="empty empty--page">
          <Icon name="search" />
          <h1>{t('notFound.title')}</h1>
          <p>{t('notFound.text')}</p>
          <Link className="btn" to={path()}>{t('notFound.home')}</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
