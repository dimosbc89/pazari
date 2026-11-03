import { Link } from 'react-router-dom';
import { SITE } from '../config';
import { useLocale } from '../i18n';
import { openCookieSettings } from '../lib/consent';
import { useIsDemo } from '../search';
import { CountryPicker } from './CountryPicker';
import { LangSwitch } from './LangSwitch';

export function Footer() {
  const { t, path } = useLocale();
  const c = SITE.company;
  const isDemo = useIsDemo();
  return (
    <footer className="footer">
      <div className="footer-inner container">
        <div className="footer-row">
          <div className="footer-locale"><CountryPicker /><LangSwitch className="lang-switch--full" /></div>
          <nav className="footer-links" aria-label="Footer">
            <Link to={path('/pages/about')}>{t('footer.about')}</Link>
            <Link to={path('/shops')}>{t('footer.forShops')}</Link>
            <Link to={path('/pages/contact')}>{t('footer.contact')}</Link>
            <Link to={path('/pages/ranking')}>{t('footer.ranking')}</Link>
            <Link to={path('/pages/terms')}>{t('footer.terms')}</Link>
            <Link to={path('/pages/privacy-policy')}>{t('footer.privacy')}</Link>
            <Link to={path('/pages/cookies-policy')}>{t('footer.cookies')}</Link>
            <button type="button" className="linklike" onClick={openCookieSettings}>{t('footer.cookieSettings')}</button>
          </nav>
        </div>
        <div className="footer-info">
          <p>{t('footer.css')}</p>
          {isDemo && <p className="footer-demo">{t('footer.demo')}</p>}
          <p className="footer-company">
            {c.legalName} · {c.address} · {t('footer.gemi')} {c.gemi} · {t('footer.vat')} {c.vat}
          </p>
        </div>
        <div className="footer-bottom">
          <span className="version">v. {SITE.version}</span>
          <a className="powered" href={SITE.poweredBy.url} target="_blank" rel="noopener">
            {t('footer.poweredBy')} <strong>{SITE.poweredBy.name}</strong>
          </a>
        </div>
      </div>
    </footer>
  );
}
