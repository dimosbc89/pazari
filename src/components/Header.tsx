import { Link } from 'react-router-dom';
import { useLocale } from '../i18n';
import { Wordmark } from './Logo';
import { SearchInput } from './SearchInput';

/** Header for every page except the home page: logo + search. */
export function Header({ query = '' }: { query?: string }) {
  const { path, t } = useLocale();
  return (
    <header className="header">
      <div className="header-inner container">
        <Link to={path()} className="header-logo" aria-label={`Tagora: ${t('meta.title')}`}>
          <Wordmark />
        </Link>
        <SearchInput defaultValue={query} />
      </div>
    </header>
  );
}
