import { useLocale } from '../i18n';
import type { StringKey } from '../i18n/strings';
import type { Issue } from '../lib/api';
import { Icon } from './Icons';

/** Codes that keep a product off the site (shown red); the rest are warnings. */
const BLOCKING = new Set(['missing_id', 'missing_title', 'missing_price', 'missing_link', 'duplicate_id']);

export function IssueList({ issues }: { issues: Issue[] }) {
  const { t, num } = useLocale();
  if (!issues.length) return null;
  return (
    <ul className="issues">
      {issues.map((i) => (
        <li key={i.code} className={BLOCKING.has(i.code) ? 'is-blocking' : i.code === 'out_of_stock' ? 'is-info' : 'is-warning'}>
          <Icon name={BLOCKING.has(i.code) ? 'alert' : 'info'} />
          <div>
            <span><strong>{i.code === 'truncated' ? '' : num(i.count)}</strong> {t(`issue.${i.code}` as StringKey)}</span>
            {i.examples.length > 0 && <small>{t('dash.examples')} {i.examples.slice(0, 3).join(' · ')}</small>}
          </div>
        </li>
      ))}
    </ul>
  );
}
