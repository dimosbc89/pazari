// Cloudflare Worker: serves the API under /api/* (static files and the app are served
// from dist/ by Workers static assets) and runs the scheduled product sync.
import { purgeExpired } from './auth.ts';
import { getSetting, setSetting } from './catalogue.ts';
import { mailFor, sendMail } from './email.ts';
import { adminEmails, type Env } from './env.ts';
import { handleApi } from './routes.ts';
import { syncDueShops } from './shops.ts';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env, ctx);
    return env.ASSETS.fetch(req);
  },

  async scheduled(_event, env, ctx) {
    // Heartbeat for /api/health: an uptime monitor can tell when the schedule stops running.
    await setSetting(env, 'last_cron_at', new Date().toISOString());
    ctx.waitUntil(purgeExpired(env));
    await syncDueShops(env);
    await alertAdmins(env);
  },
} satisfies ExportedHandler<Env>;

/** At most once a day, emails the admins the shops whose last sync failed. */
async function alertAdmins(env: Env) {
  const admins = adminEmails(env);
  if (!admins.length) return;
  const last = await getSetting(env, 'last_alert_at');
  if (last && Date.now() - Date.parse(last) < 24 * 3_600_000) return;
  const { results } = await env.DB.prepare("SELECT name FROM shops WHERE status = 'active' AND last_sync_status = 'error' ORDER BY name LIMIT 50").all<{ name: string }>();
  if (!results.length) return;
  const url = `${(env.SITE_URL || '').replace(/\/$/, '')}/gr/admin`;
  await sendMail(env, mailFor('adminAlert', 'el', admins, { count: results.length, list: results.map((r) => r.name).join(', ') }, url));
  await setSetting(env, 'last_alert_at', new Date().toISOString());
}
