import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocale } from '../i18n';
import { loadTagManager, OPEN_SETTINGS_EVENT, readConsent, saveConsent } from '../lib/consent';

export function CookieBanner() {
  const { t, path } = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = readConsent();
    if (!c) setOpen(true);
    else if (c.analytics) loadTagManager();
    const show = () => setOpen(true);
    window.addEventListener(OPEN_SETTINGS_EVENT, show);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, show);
  }, []);

  if (!open) return null;
  const choose = (analytics: boolean) => { saveConsent(analytics); setOpen(false); };

  return (
    <div className="cookies" role="dialog" aria-live="polite" aria-label={t('cookie.title')}>
      <p>
        <strong>{t('cookie.title')}.</strong> {t('cookie.text')}{' '}
        <Link to={path('/pages/cookies-policy')}>{t('cookie.more')}</Link>
      </p>
      <div className="cookies-actions">
        <button type="button" className="btn btn--ghost" onClick={() => choose(false)}>{t('cookie.reject')}</button>
        <button type="button" className="btn" onClick={() => choose(true)}>{t('cookie.accept')}</button>
      </div>
    </div>
  );
}
