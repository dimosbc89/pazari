import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Icon } from '../components/Icons';
import { MerchantHeader } from '../components/MerchantHeader';
import { Loader } from '../components/ui';
import { useLocale } from '../i18n';
import { api, useErrorText, type Me } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';

export function MerchantLogin() {
  const { t, path, country, lang } = useLocale();
  const errText = useErrorText();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'sent' | 'verifying'>(token ? 'verifying' : 'form');
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState('');
  const once = useRef(false);
  useDocumentTitle(t('login.meta'));

  useEffect(() => {
    if (!token || once.current) return;
    once.current = true; // a link works only once, so never send it twice
    api<Me>('/auth/verify', { body: { token } }).then(
      (me) => navigate(path(me.admin && me.shops.length === 0 ? '/admin' : '/merchant'), { replace: true }),
      (e) => { setError(errText(e)); setState('form'); navigate(path('/merchant/login'), { replace: true }); },
    );
  }, [token, navigate, path, errText]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setState('sending');
    try {
      const r = await api<{ devLink?: string }>('/auth/login', { body: { email, country: country.code, lang } });
      setDevLink(r.devLink ?? null);
      setState('sent');
    } catch (err) {
      setError(errText(err));
      setState('form');
    }
  };

  return (
    <>
      <MerchantHeader />
      <main className="container auth">
        <div className="panel auth-panel">
          {state === 'verifying' ? (
            <><Loader /><p className="center">{t('login.verifying')}</p></>
          ) : state === 'sent' ? (
            <div role="status">
              <Icon name="check" className="auth-icon" />
              <h1>{t('login.sent.title')}</h1>
              <p>{t('login.sent.text', { email })}</p>
              {devLink && (
                <p className="devlink">{t('login.dev')} <a href={devLink}>{devLink}</a></p>
              )}
              <button type="button" className="linklike" onClick={() => setState('form')}>{t('login.again')}</button>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h1>{t('login.title')}</h1>
              <p>{t('login.text')}</p>
              <div className="field">
                <label htmlFor="l-email">{t('field.email')}</label>
                <input id="l-email" type="email" required autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {error && <p className="form-error" role="alert"><Icon name="alert" /> {error}</p>}
              <button type="submit" className="btn btn--block" disabled={state === 'sending' || !email}>{t('login.button')}</button>
              <p className="auth-foot">{t('login.noShop')} <Link to={path('/shops')}>{t('login.register')}</Link></p>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
