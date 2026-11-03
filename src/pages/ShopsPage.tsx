import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Icon, type IconName } from '../components/Icons';
import { MerchantHeader } from '../components/MerchantHeader';
import { IssueList } from '../components/IssueList';
import { COUNTRIES } from '../config';
import { useLocale } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { api, useErrorText, useMe, type Preview, type SourceType } from '../lib/api';
import { useDocumentTitle } from '../lib/hooks';

const SOURCES: { type: SourceType; icon: IconName }[] = [
  { type: 'feed', icon: 'feed' },
  { type: 'shopify', icon: 'bag' },
  { type: 'woocommerce', icon: 'cart' },
];

/** Source picker + address + "Check" button with the result. Also used in the dashboard. */
export function SourceFields({ type, url, onType, onUrl, check, onCheck }: {
  type: SourceType; url: string; onType: (t: SourceType) => void; onUrl: (u: string) => void;
  check: CheckState; onCheck: () => void;
}) {
  const { t, price } = useLocale();
  const isFeed = type === 'feed';
  return (
    <>
      <div className="sources" role="radiogroup" aria-label={t('shops.form.connect')}>
        {SOURCES.map((s) => (
          <label key={s.type} className={`source ${type === s.type ? 'is-active' : ''}`}>
            <input type="radio" name="source" value={s.type} checked={type === s.type} onChange={() => onType(s.type)} />
            <Icon name={s.icon} />
            <span className="source-name">{t(`source.${s.type}` as StringKey)}</span>
            <span className="source-hint">{t(`source.${s.type}.hint` as StringKey)}</span>
          </label>
        ))}
      </div>
      <div className="field">
        <label htmlFor="source-url">{t(isFeed ? 'source.feed.label' : 'source.shop.label')}</label>
        <div className="field-row">
          <input id="source-url" type="url" inputMode="url" required value={url} onChange={(e) => onUrl(e.target.value)}
            placeholder={t(isFeed ? 'source.feed.placeholder' : 'source.shop.placeholder')} />
          <button type="button" className="btn btn--ghost" onClick={onCheck} disabled={!url.trim() || check.state === 'running'}>
            <Icon name="refresh" /> {check.state === 'running' ? t('check.running') : t('check.button')}
          </button>
        </div>
        <p className="field-help">{t(`source.${isFeed ? 'feed' : type}.help` as StringKey)}</p>
      </div>
      {check.state === 'done' && check.result && (
        <div className={`check ${check.result.ok ? 'is-ok' : 'is-bad'}`} aria-live="polite">
          {check.result.ok ? (
            <>
              <p className="check-title"><Icon name="check" /> {t('check.ok', { ready: check.result.ready ?? 0 })}</p>
              <p className="check-sub">{t('check.found', { found: check.result.found ?? 0, format: t(`format.${check.result.format}` as StringKey) })}</p>
              {!!check.result.sample?.length && (
                <ul className="check-sample" aria-label={t('check.sample')}>
                  {check.result.sample.map((p, i) => (
                    <li key={i}>
                      {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span className="check-noimg"><Icon name="image" /></span>}
                      <span className="check-ptitle">{p.title}</span>
                      <strong>{price(p.price)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <IssueList issues={check.result.issues ?? []} />
            </>
          ) : (
            <p className="check-title"><Icon name="alert" /> {t('check.failed')}: {check.error}</p>
          )}
        </div>
      )}
    </>
  );
}

export interface CheckState { state: 'idle' | 'running' | 'done'; key?: string; result?: Preview; error?: string }

export function useSourceCheck() {
  const errText = useErrorText();
  const { t } = useLocale();
  const [check, setCheck] = useState<CheckState>({ state: 'idle' });
  const run = async (type: SourceType, url: string): Promise<Preview | null> => {
    const key = `${type}|${url.trim()}`;
    setCheck({ state: 'running', key });
    try {
      const result = await api<Preview>('/shops/check', { body: { sourceType: type, sourceUrl: url.trim() } });
      const error = result.ok ? undefined : t(`err.${result.code}` as StringKey) !== `err.${result.code}` ? t(`err.${result.code}` as StringKey) : result.message;
      setCheck({ state: 'done', key, result, error });
      return result;
    } catch (e) {
      setCheck({ state: 'done', key, result: { ok: false }, error: errText(e) });
      return null;
    }
  };
  return { check, run, reset: () => setCheck({ state: 'idle' }) };
}

export function ShopsPage() {
  const { t, path, country, lang } = useLocale();
  const errText = useErrorText();
  const { me } = useMe();
  useDocumentTitle(t('shops.meta'));

  const [type, setType] = useState<SourceType>('feed');
  const [url, setUrl] = useState('');
  const { check, run, reset } = useSourceCheck();
  const [f, setF] = useState({ name: '', website: '', company: '', vat: '', contactName: '', email: '', phone: '', defaultShipping: '', freeShippingOver: '', website2: '' });
  const [countries, setCountries] = useState<string[]>([country.code]);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<string | null>(null);

  const field = (k: keyof typeof f) => ({ value: f[k], onChange: (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value }) });
  const key = `${type}|${url.trim()}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    let ok = check.key === key && check.result?.ok;
    if (!ok) ok = !!(await run(type, url))?.ok;
    if (!ok) { setError(t('check.needed')); return; }
    setSending(true);
    try {
      await api('/shops/signup', { body: { ...f, countries, sourceType: type, sourceUrl: url.trim(), consent, lang } });
      setDone(f.name);
      window.scrollTo({ top: document.getElementById('apply')?.offsetTop ?? 0, behavior: 'smooth' });
    } catch (err) {
      setError(errText(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <MerchantHeader me={me} />
      <main className="shops">
        <section className="shops-hero">
          <div className="awning" aria-hidden="true" />
          <div className="container shops-hero-inner">
            <p className="eyebrow">{t('shops.eyebrow')}</p>
            <h1>{t('shops.title')}</h1>
            <p className="shops-lead">{t('shops.lead')}</p>
            <p className="shops-free"><Icon name="check" /> {t('shops.free')}</p>
            <div className="shops-cta">
              <a href="#apply" className="btn btn--lg">{t('shops.start')}</a>
              <span>{t('shops.haveAccount')} <Link to={path('/merchant/login')}>{t('shops.signinLink')}</Link></span>
            </div>
          </div>
        </section>

        <section className="container steps" aria-label={t('shops.eyebrow')}>
          {[1, 2, 3].map((n) => (
            <div key={n} className="step">
              <span className="step-n">{n}</span>
              <h2>{t(`shops.step${n}.title` as StringKey)}</h2>
              <p>{t(`shops.step${n}.text` as StringKey)}</p>
            </div>
          ))}
        </section>

        <section className="container apply" id="apply">
          {done ? (
            <div className="panel done" role="status">
              <Icon name="check" />
              <h2>{t('shops.done.title')}</h2>
              <p>{t('shops.done.text', { shop: done })}</p>
              <Link to={path('/merchant/login')} className="btn">{t('shops.done.signin')}</Link>
            </div>
          ) : (
            <form className="panel form" onSubmit={submit} noValidate>
              <h2><span className="form-n">1</span>{t('shops.form.connect')}</h2>
              <SourceFields type={type} url={url} check={check}
                onType={(v) => { setType(v); reset(); }} onUrl={(v) => { setUrl(v); if (check.state === 'done') reset(); }}
                onCheck={() => run(type, url)} />

              <h2><span className="form-n">2</span>{t('shops.form.details')}</h2>
              <div className="grid2">
                <div className="field"><label htmlFor="f-name">{t('field.name')}</label><input id="f-name" required maxLength={80} {...field('name')} /></div>
                <div className="field"><label htmlFor="f-web">{t('field.website')}</label><input id="f-web" type="url" inputMode="url" required placeholder="https://" {...field('website')} /></div>
                <div className="field"><label htmlFor="f-company">{t('field.company')}</label><input id="f-company" maxLength={160} {...field('company')} /></div>
                <div className="field"><label htmlFor="f-vat">{t('field.vat')}</label><input id="f-vat" maxLength={30} {...field('vat')} /></div>
                <div className="field"><label htmlFor="f-contact">{t('field.contact')}</label><input id="f-contact" maxLength={120} autoComplete="name" {...field('contactName')} /></div>
                <div className="field"><label htmlFor="f-phone">{t('field.phone')} <small>({t('field.optional')})</small></label><input id="f-phone" type="tel" autoComplete="tel" maxLength={40} {...field('phone')} /></div>
                <div className="field field--wide">
                  <label htmlFor="f-email">{t('field.email')}</label>
                  <input id="f-email" type="email" required autoComplete="email" {...field('email')} />
                  <p className="field-help">{t('field.emailHelp')}</p>
                </div>
              </div>
              {/* Honeypot: hidden from people, filled in by bots */}
              <div className="hp" aria-hidden="true"><label>Website 2<input tabIndex={-1} autoComplete="off" {...field('website2')} /></label></div>

              <h2><span className="form-n">3</span>{t('shops.form.delivery')}</h2>
              <fieldset className="field">
                <legend>{t('field.countries')}</legend>
                <div className="checks">
                  {COUNTRIES.map((c) => (
                    <label key={c.code} className="checkbox">
                      <input type="checkbox" checked={countries.includes(c.code)}
                        onChange={(e) => setCountries(e.target.checked ? [...countries, c.code] : countries.filter((x) => x !== c.code))} />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="grid2">
                <div className="field"><label htmlFor="f-ship">{t('field.shipping')} <small>({t('field.optional')})</small></label><input id="f-ship" inputMode="decimal" placeholder="3,50" {...field('defaultShipping')} /></div>
                <div className="field"><label htmlFor="f-free">{t('field.freeOver')} <small>({t('field.optional')})</small></label><input id="f-free" inputMode="decimal" placeholder="50" {...field('freeShippingOver')} /></div>
              </div>
              <p className="field-help">{t('field.shippingHelp')}</p>

              <label className="checkbox consent">
                <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>{t('field.consent')} <Link to={path('/pages/shop-terms')} target="_blank">{t('field.consentTerms')}</Link> {t('field.consentAnd')} <Link to={path('/pages/privacy-policy')} target="_blank">{t('field.consentLink')}</Link>.</span>
              </label>

              {error && <p className="form-error" role="alert"><Icon name="alert" /> {error}</p>}
              <button type="submit" className="btn btn--lg btn--block" disabled={sending || !consent || !f.name || !f.email || !f.website || !url || !countries.length}>
                {sending ? t('shops.sending') : t('shops.submit')}
              </button>
            </form>
          )}
        </section>

        <section className="container faq">
          <h2>{t('shops.faq.title')}</h2>
          {[5, 1, 2, 3, 4].map((n) => (
            <details key={n}>
              <summary>{t(`shops.faq.q${n}` as StringKey)}</summary>
              <p>{t(`shops.faq.a${n}` as StringKey)}</p>
            </details>
          ))}
          <p className="faq-more"><Link to={path('/pages/shop-help')}>{t('shops.faq.more')}</Link></p>
        </section>
      </main>
      <Footer />
    </>
  );
}
