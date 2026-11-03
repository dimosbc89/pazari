import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ClicksChart } from '../components/ClicksChart';
import { Footer } from '../components/Footer';
import { Icon } from '../components/Icons';
import { IssueList } from '../components/IssueList';
import { MerchantHeader } from '../components/MerchantHeader';
import { Loader } from '../components/ui';
import { COUNTRIES, PLUGIN_ZIP } from '../config';
import { useLocale } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { api, useErrorText, useMe, useRelativeTime, type Run, type RunResult, type Shop } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { KeyBox, SourceFields, useSourceCheck } from './ShopsPage';

/** Shops are free for 12 months from approval (shop terms, section 8). */
export const FREE_MONTHS = 12;
const freeUntil = (approvedAt: string, lang: string) => {
  const d = new Date(approvedAt);
  d.setMonth(d.getMonth() + FREE_MONTHS);
  return d.toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' });
};

interface Detail { shop: Shop; runs: Run[]; clicks: { day: string; clicks: number }[]; syncEveryHours: number }

export function StatusPill({ status }: { status: string }) {
  const { t } = useLocale();
  return <span className={`pill pill--${status}`}>{t(`status.${status}` as StringKey)}</span>;
}

export function SyncBadge({ status }: { status: string | null }) {
  const { t } = useLocale();
  if (!status) return null;
  return <span className={`sync sync--${status}`}><i />{t(`sync.${status}` as StringKey)}</span>;
}

export function MerchantDashboard() {
  const { t, path } = useLocale();
  const { me, loading, reload: reloadMe } = useMe();
  const [params, setParams] = useSearchParams();
  useDocumentTitle(t('dash.meta'));

  if (loading) return <><MerchantHeader /><main className="container dash"><Loader /></main></>;
  if (!me) return <Navigate to={path('/merchant/login')} replace />;
  const shopId = params.get('shop') || me.shops[0]?.id;

  return (
    <>
      <MerchantHeader me={me} onSignedOut={reloadMe} />
      <main className="container dash">
        {me.shops.length > 1 && (
          <div className="dash-switch">
            <label htmlFor="shop-switch">{t('dash.shop')}</label>
            <select id="shop-switch" value={shopId} onChange={(e) => setParams({ shop: e.target.value })}>
              {me.shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        {shopId ? <ShopPanel key={shopId} id={shopId} /> : (
          <div className="panel center">
            <p>{t('dash.none')}</p>
            {me.admin ? <Link className="btn" to={path('/admin')}>{t('dash.admin')}</Link> : <Link className="btn" to={path('/shops')}>{t('login.register')}</Link>}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

function ShopPanel({ id }: { id: string }) {
  const { t, num, country, price, path, lang } = useLocale();
  const errText = useErrorText();
  const ago = useRelativeTime();
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useAsync(() => api<Detail>(`/shops/${id}`), [id, version]);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [pluginKey, setPluginKey] = useState<string | null>(null);

  if (!data && loading) return <Loader />;
  if (error && !data) return <p className="notice notice--error">{errText(error)}</p>;
  const { shop, runs, clicks, syncEveryHours } = data!;
  const totalClicks = clicks.reduce((n, c) => n + c.clicks, 0);
  const dt = new Intl.DateTimeFormat(country.locale, { dateStyle: 'short', timeStyle: 'short' });

  const newKey = async () => {
    if (!window.confirm(t('plugin.newKey.confirm'))) return;
    setNotice(null);
    try {
      const r = await api<{ pluginKey: string }>(`/shops/${shop.id}/plugin-key`, { body: {} });
      setPluginKey(r.pluginKey);
    } catch (e) {
      setNotice({ ok: false, text: errText(e) });
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setNotice(null);
    try {
      const { result, started } = await api<{ result?: RunResult; started?: boolean }>(`/shops/${id}/sync`, { body: {} });
      if (started || !result) setNotice({ ok: true, text: t('dash.syncStarted') });
      else setNotice(result.status === 'error'
        ? { ok: false, text: result.message ?? t('sync.error') }
        : { ok: true, text: t('dash.syncDone', { imported: num(result.imported), removed: num(result.removed) }) });
      setVersion((v) => v + 1);
    } catch (e) {
      setNotice({ ok: false, text: errText(e) });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <div className="dash-head">
        <div>
          <h1>{shop.name} <StatusPill status={shop.status} /></h1>
          <a href={shop.website} target="_blank" rel="noopener" className="dash-site">{shop.website.replace(/^https?:\/\//, '')} <Icon name="external" /></a>
        </div>
        {shop.status === 'active' && shop.sourceType !== 'plugin' && (
          <button type="button" className="btn" onClick={syncNow} disabled={syncing}>
            <Icon name="refresh" /> {syncing ? t('dash.syncing') : t('dash.syncNow')}
          </button>
        )}
      </div>

      {shop.status !== 'active' && (
        <div className={`banner banner--${shop.status}`} role="status">
          <Icon name={shop.status === 'pending' ? 'clock' : 'alert'} />
          <p>{t(`dash.${shop.status}` as StringKey)}{shop.statusReason && <> {t('dash.reason', { reason: shop.statusReason })}</>}</p>
        </div>
      )}
      {notice && <div className={`banner ${notice.ok ? 'banner--ok' : 'banner--error'}`} role="status"><Icon name={notice.ok ? 'check' : 'alert'} /><p>{notice.text}</p></div>}

      <div className="tiles">
        <div className="tile">
          <span className="tile-label">{t('dash.products')}</span>
          <strong className="tile-value">{num(shop.productCount)}</strong>
          <span className="tile-sub">{t('dash.every', { hours: syncEveryHours })}</span>
        </div>
        <div className="tile">
          <span className="tile-label">{t('dash.lastSync')}</span>
          <strong className="tile-value tile-value--sm">{shop.lastSyncAt ? ago(shop.lastSyncAt) : t('dash.never')}</strong>
          <span className="tile-sub"><SyncBadge status={shop.lastSyncStatus} />{shop.status === 'active' && shop.nextSyncAt && <> · {t('dash.nextSync', { when: ago(shop.nextSyncAt) })}</>}</span>
        </div>
        <div className="tile">
          <span className="tile-label">{t('dash.visits')}</span>
          <strong className="tile-value">{num(totalClicks)}</strong>
          <span className="tile-sub">{t('dash.visitsSub')}</span>
        </div>
      </div>

      <p className="dash-plan">
        <Icon name="check" />{' '}
        {shop.approvedAt
          ? t('dash.freeUntil', { date: freeUntil(shop.approvedAt, lang) })
          : t('dash.freeAfterApproval')}{' '}
        <Link to={path('/pages/shop-terms')}>{t('dash.planTerms')}</Link>
      </p>

      {shop.lastSyncStatus === 'error' && shop.lastSyncMessage && (
        <div className="banner banner--error" role="alert"><Icon name="alert" /><p>{shop.lastSyncMessage}</p></div>
      )}

      <div className="dash-grid">
        <section className="panel">
          <h2>{t('dash.issues')}</h2>
          {shop.lastSyncAt && shop.lastIssues.length === 0 && <p className="ok-line"><Icon name="check" /> {t('dash.noIssues')}</p>}
          <IssueList issues={shop.lastIssues} />
          {shop.lastIssues.some((i) => ['missing_price', 'missing_link', 'missing_title', 'missing_id', 'duplicate_id'].includes(i.code)) && <p className="field-help">{t('dash.skipNote')}</p>}
        </section>
        <section className="panel"><ClicksChart data={clicks} /></section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{t('dash.connection')}</h2>
          {!editing && <button type="button" className="btn btn--ghost" onClick={() => setEditing(true)}>{t('dash.edit')}</button>}
        </div>
        {editing ? (
          <ConnectionForm shop={shop} onDone={(saved, key) => { setEditing(false); if (key) setPluginKey(key); if (saved) { setNotice({ ok: true, text: t('dash.saved') }); setVersion((v) => v + 1); } }} />
        ) : (
          <>
          {shop.sourceType === 'plugin' && (
            <div className="plugin-status">
              <p>{shop.pluginSeenAt ? t('plugin.seen', { when: ago(shop.pluginSeenAt) }) : t('plugin.never')}
                {shop.pluginInfo?.plugin && <span className="muted"> · {t('plugin.versions', { plugin: shop.pluginInfo.plugin, wc: shop.pluginInfo.woocommerce ?? '–' })}</span>}</p>
              <p className="field-help">{t('plugin.syncFromWp')}</p>
              {pluginKey && <KeyBox pluginKey={pluginKey} />}
              <div className="plugin-actions">
                <button type="button" className="btn btn--ghost" onClick={newKey}>{t('plugin.newKey')}</button>
                <a href={PLUGIN_ZIP} className="btn btn--ghost" download>{t('plugin.download')}</a>
              </div>
            </div>
          )}
          <dl className="facts">
            <div><dt>{t('dash.source')}</dt><dd>{t(`source.${shop.sourceType}` as StringKey)} · <span className="mono">{shop.sourceUrl}</span>
              {shop.sourceType === 'shopify-app' && <span className="field-help">{t('shopify.note')}</span>}</dd></div>
            {shop.sourceFormat && <div><dt>{t('dash.format')}</dt><dd>{t(`format.${shop.sourceFormat}` as StringKey)}</dd></div>}
            <div><dt>{t('field.countries')}</dt><dd>{shop.countries.map((c) => COUNTRIES.find((x) => x.code === c)?.label ?? c).join(', ')}</dd></div>
            <div><dt>{t('field.shipping')}</dt><dd>{shop.defaultShipping != null ? price(shop.defaultShipping) : t('dash.noShipping')}{shop.freeShippingOver != null && <> · {t('field.freeOver')}: {price(shop.freeShippingOver)}</>}</dd></div>
          </dl>
          </>
        )}
      </section>

      {runs.length > 0 && (
        <section className="panel">
          <h2>{t('dash.history')}</h2>
          <div className="table-wrap">
            <table className="runs">
              <thead><tr>
                <th scope="col">{t('runs.when')}</th><th scope="col">{t('runs.trigger')}</th><th scope="col">{t('runs.status')}</th>
                <th scope="col" className="num">{t('runs.found')}</th><th scope="col" className="num">{t('runs.imported')}</th>
                <th scope="col" className="num">{t('runs.skipped')}</th><th scope="col" className="num">{t('runs.removed')}</th>
              </tr></thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.id} title={r.message ?? undefined}>
                    <td>{dt.format(new Date(r.started_at))}</td>
                    <td>{t(`trigger.${r.trigger}` as StringKey)}</td>
                    <td><SyncBadge status={r.status} /></td>
                    <td className="num">{r.found ?? '–'}</td><td className="num">{r.imported ?? '–'}</td>
                    <td className="num">{r.skipped ?? '–'}</td><td className="num">{r.removed ?? '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function ConnectionForm({ shop, onDone }: { shop: Shop; onDone: (saved: boolean, pluginKey?: string) => void }) {
  const { t } = useLocale();
  const errText = useErrorText();
  const [type, setType] = useState(shop.sourceType);
  const [url, setUrl] = useState(shop.sourceUrl);
  const [ship, setShip] = useState(shop.defaultShipping?.toString() ?? '');
  const [free, setFree] = useState(shop.freeShippingOver?.toString() ?? '');
  const { check, run, reset } = useSourceCheck();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const shopifyApp = shop.sourceType === 'shopify-app';

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      // The Shopify app's connection is managed in Shopify: only the delivery costs change here.
      const source = shopifyApp ? {} : { sourceType: type, sourceUrl: type === 'plugin' ? shop.website : url };
      const r = await api<{ pluginKey?: string }>(`/shops/${shop.id}`, { method: 'PATCH', body: { ...source, defaultShipping: ship, freeShippingOver: free } });
      onDone(true, r.pluginKey);
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="form">
      {shopifyApp
        ? <p className="field-help">{t('shopify.note')}</p>
        : <SourceFields type={type} url={url} check={check} onType={(v) => { setType(v); reset(); }} onUrl={(v) => { setUrl(v); reset(); }} onCheck={() => run(type, url)} />}
      <div className="grid2">
        <div className="field"><label htmlFor="c-ship">{t('field.shipping')}</label><input id="c-ship" inputMode="decimal" value={ship} onChange={(e) => setShip(e.target.value)} /></div>
        <div className="field"><label htmlFor="c-free">{t('field.freeOver')}</label><input id="c-free" inputMode="decimal" value={free} onChange={(e) => setFree(e.target.value)} /></div>
      </div>
      {error && <p className="form-error" role="alert"><Icon name="alert" /> {error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={() => onDone(false)}>{t('dash.cancel')}</button>
        <button type="button" className="btn" onClick={save} disabled={saving}>{t('dash.save')}</button>
      </div>
    </div>
  );
}
