import { Fragment, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Icon } from '../components/Icons';
import { IssueList } from '../components/IssueList';
import { MerchantHeader } from '../components/MerchantHeader';
import { Loader } from '../components/ui';
import { useLocale } from '../i18n';
import type { StringKey } from '../i18n/strings';
import { api, useErrorText, useMe, useRelativeTime, type RunResult, type Shop, type ShopStatus } from '../lib/api';
import { useAsync, useDocumentTitle } from '../lib/hooks';
import { StatusPill, SyncBadge } from './MerchantDashboard';

const TABS: (ShopStatus | 'all')[] = ['pending', 'active', 'paused', 'rejected', 'all'];

export function AdminPage() {
  const { t, path } = useLocale();
  const { me, loading, reload } = useMe();
  useDocumentTitle(t('admin.meta'));
  if (loading) return <><MerchantHeader /><main className="container dash"><Loader /></main></>;
  if (!me) return <Navigate to={path('/merchant/login')} replace />;
  return (
    <>
      <MerchantHeader me={me} onSignedOut={reload} />
      <main className="container dash">
        {me.admin ? <ShopsAdmin /> : <p className="notice notice--error">{t('admin.denied')}</p>}
      </main>
      <Footer />
    </>
  );
}

function ShopsAdmin() {
  const { t, num, path } = useLocale();
  const errText = useErrorText();
  const ago = useRelativeTime();
  const [version, setVersion] = useState(0);
  const { data, loading, error } = useAsync(() => api<{ shops: Shop[] }>('/admin/shops'), [version]);
  const [tab, setTab] = useState<ShopStatus | 'all'>('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const shops = data?.shops ?? [];
  const counts = useMemo(() => Object.fromEntries(TABS.map((s) => [s, s === 'all' ? shops.length : shops.filter((x) => x.status === s).length])), [shops]);
  const list = tab === 'all' ? shops : shops.filter((s) => s.status === tab);

  const act = async (shop: Shop, action: 'approve' | 'reject' | 'pause' | 'resume' | 'sync') => {
    let reason: string | null = null;
    if (action === 'reject') { reason = window.prompt(t('admin.reasonPrompt')); if (reason === null) return; }
    if (action === 'pause') { reason = window.prompt(t('admin.pausePrompt')); if (reason === null) return; }
    setBusy(shop.id);
    setNotice(null);
    try {
      const endpoint = action === 'sync' ? `/shops/${shop.id}/sync` : `/admin/shops/${shop.id}/${action}`;
      const r = await api<{ result?: RunResult }>(endpoint, { body: { reason } });
      const res = r.result;
      setNotice(res
        ? { ok: res.status !== 'error', text: `${shop.name}: ${res.status === 'error' ? res.message : t('dash.syncDone', { imported: num(res.imported), removed: num(res.removed) })}` }
        : { ok: true, text: `${shop.name}: ${t('admin.done')}` });
      setVersion((v) => v + 1);
    } catch (e) {
      setNotice({ ok: false, text: `${shop.name}: ${errText(e)}` });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="dash-head"><h1>{t('admin.title')}</h1></div>
      <div className="tabs" role="tablist">
        {TABS.map((s) => (
          <button key={s} type="button" role="tab" aria-selected={tab === s} className={tab === s ? 'is-active' : ''} onClick={() => setTab(s)}>
            {s === 'all' ? t('admin.all') : t(`status.${s}` as StringKey)} <span className="count">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>
      {notice && <div className={`banner ${notice.ok ? 'banner--ok' : 'banner--error'}`} role="status"><Icon name={notice.ok ? 'check' : 'alert'} /><p>{notice.text}</p></div>}
      {error && <p className="notice notice--error">{errText(error)}</p>}
      {!data && loading ? <Loader /> : list.length === 0 ? <p className="panel center muted">{t('admin.empty')}</p> : (
        <div className="panel table-wrap">
          <table className="admin">
            <thead><tr>
              <th scope="col">{t('admin.col.shop')}</th><th scope="col">{t('admin.col.source')}</th>
              <th scope="col" className="num">{t('admin.col.products')}</th><th scope="col">{t('admin.col.sync')}</th>
              <th scope="col" className="num">{t('admin.col.clicks')}</th><th scope="col">{t('admin.col.created')}</th><th scope="col" />
            </tr></thead>
            <tbody>
              {list.map((s) => (
                <Fragment key={s.id}>
                  <tr className={open === s.id ? 'is-open' : ''}>
                    <td>
                      <button type="button" className="linklike admin-name" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>{s.name}</button>
                      <div className="muted small">{s.website.replace(/^https?:\/\//, '')} · <StatusPill status={s.status} /></div>
                    </td>
                    <td>{t(`source.${s.sourceType}` as StringKey)}<div className="muted small">{s.sourceFormat ? t(`format.${s.sourceFormat}` as StringKey) : ''}</div></td>
                    <td className="num">{num(s.productCount)}</td>
                    <td><SyncBadge status={s.lastSyncStatus} /><div className="muted small">{s.lastSyncAt ? ago(s.lastSyncAt) : '–'}</div></td>
                    <td className="num">{num(s.clicks30 ?? 0)}</td>
                    <td className="small">{ago(s.createdAt)}</td>
                    <td className="actions">
                      {busy === s.id ? <Loader inline /> : (
                        <>
                          {s.status === 'pending' && <><button type="button" className="btn btn--sm" onClick={() => act(s, 'approve')}>{t('admin.approve')}</button>
                            <button type="button" className="btn btn--sm btn--ghost" onClick={() => act(s, 'reject')}>{t('admin.reject')}</button></>}
                          {s.status === 'active' && <><button type="button" className="btn btn--sm btn--ghost" onClick={() => act(s, 'sync')}>{t('admin.sync')}</button>
                            <button type="button" className="btn btn--sm btn--ghost" onClick={() => act(s, 'pause')}>{t('admin.pause')}</button></>}
                          {(s.status === 'paused' || s.status === 'rejected') && <button type="button" className="btn btn--sm btn--ghost" onClick={() => act(s, 'resume')}>{t('admin.resume')}</button>}
                          <Link className="btn btn--sm btn--ghost" to={`${path('/merchant')}?shop=${s.id}`}>{t('admin.open')}</Link>
                        </>
                      )}
                    </td>
                  </tr>
                  {open === s.id && (
                    <tr className="admin-detail"><td colSpan={7}>
                      <dl className="facts">
                        <div><dt>{t('admin.contact')}</dt><dd>{[s.contactName, s.email, s.phone].filter(Boolean).join(' · ')}</dd></div>
                        <div><dt>{t('admin.company')}</dt><dd>{[s.company, s.vat && `${t('field.vat')} ${s.vat}`].filter(Boolean).join(' · ') || '–'}</dd></div>
                        <div><dt>{t('dash.source')}</dt><dd className="mono">{s.sourceUrl}</dd></div>
                        <div><dt>{t('field.countries')}</dt><dd>{s.countries.join(', ').toUpperCase()}</dd></div>
                        {s.statusReason && <div><dt>{t('dash.reason', { reason: '' }).replace(/[:\s]+$/, '')}</dt><dd>{s.statusReason}</dd></div>}
                        {s.lastSyncMessage && <div><dt>{t('admin.col.sync')}</dt><dd>{s.lastSyncMessage}</dd></div>}
                      </dl>
                      <IssueList issues={s.lastIssues} />
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
