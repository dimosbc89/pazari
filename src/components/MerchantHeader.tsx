import { Link, useNavigate } from 'react-router-dom';
import { useLocale } from '../i18n';
import { api, type Me } from '../lib/api';
import { Icon } from './Icons';
import { LangSwitch } from './LangSwitch';
import { Wordmark } from './Logo';

/** Header for the shop area: logo, "for shops" label, and who is signed in. */
export function MerchantHeader({ me, onSignedOut }: { me?: Me | null; onSignedOut?: () => void }) {
  const { t, path } = useLocale();
  const navigate = useNavigate();
  const signOut = async () => {
    await api('/auth/logout', { body: {} }).catch(() => {});
    onSignedOut?.();
    navigate(path('/merchant/login'));
  };
  return (
    <header className="header mheader">
      <div className="header-inner container">
        <Link to={path()} className="header-logo" aria-label="Tagora"><Wordmark /></Link>
        <Link to={path('/shops')} className="mheader-label">{t('footer.forShops')}</Link>
        <div className="mheader-right">
          <LangSwitch />
          {me ? (
            <>
              {me.admin && <Link to={path('/admin')} className="mheader-link">{t('dash.admin')}</Link>}
              {me.shops.length > 0 && <Link to={path('/merchant')} className="mheader-link">{t('dash.shop')}</Link>}
              <span className="mheader-email" title={me.email}>{me.email}</span>
              <button type="button" className="icon-btn" onClick={signOut} aria-label={t('dash.signout')} title={t('dash.signout')}><Icon name="logout" /></button>
            </>
          ) : (
            <Link to={path('/merchant/login')} className="btn btn--ghost">{t('shops.signinLink')}</Link>
          )}
        </div>
      </div>
    </header>
  );
}
