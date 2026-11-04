// Per-shop opt-out for scheduled sync notifications. Other shops retain their
// existing notification behavior; an absent or invalid setting means no opt-outs.
import { getSetting, setSetting } from './catalogue.ts';
import { mailFor, sendMail } from './email.ts';
import { adminEmails, type Env } from './env.ts';

export async function silentSyncShopIds(env: Env): Promise<string[]> {
  const value = await getSetting(env, 'silent_sync_shop_ids');
  if (!value) return [];
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids) && ids.every((id) => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
      ? [...new Set(ids as string[])] : [];
  } catch {
    return [];
  }
}

/** At most once a day, emails admins failures for shops that allow notifications. */
export async function alertAdmins(env: Env) {
  const admins = adminEmails(env);
  if (!admins.length) return;
  const last = await getSetting(env, 'last_alert_at');
  if (last && Date.now() - Date.parse(last) < 24 * 3_600_000) return;
  const silentIds = await silentSyncShopIds(env);
  // Failed syncs, and plugin shops whose plugin has been silent for two days.
  const silentSince = new Date(Date.now() - 48 * 3_600_000).toISOString();
  const { results } = await env.DB.prepare(`SELECT name FROM shops WHERE status = 'active'
      AND id NOT IN (SELECT value FROM json_each(?)) AND (last_sync_status = 'error'
      OR (source_type = 'plugin' AND (plugin_seen_at IS NULL OR plugin_seen_at < ?))) ORDER BY name LIMIT 50`)
    .bind(JSON.stringify(silentIds), silentSince).all<{ name: string }>();
  if (!results.length) return;
  const url = `${(env.SITE_URL || '').replace(/\/$/, '')}/gr/admin`;
  await sendMail(env, mailFor('adminAlert', 'el', admins, { count: results.length, list: results.map((r) => r.name).join(', ') }, url));
  await setSetting(env, 'last_alert_at', new Date().toISOString());
}
