// Cloudflare Worker: serves the API under /api/* (static files and the app are served
// from dist/ by Workers static assets) and runs the scheduled product sync.
import { purgeExpired } from './auth.ts';
import { setSetting } from './catalogue.ts';
import type { Env } from './env.ts';
import { alertAdmins } from './notifications.ts';
import { handleApi } from './routes.ts';
import { shopifyPage } from './shopify-page.ts';
import { shopifyCron } from './shopify.ts';
import { syncDueShops } from './shops.ts';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env, ctx);
    // The Tagora app's page inside the Shopify admin.
    if (url.pathname === '/shopify' || url.pathname.startsWith('/shopify/')) return shopifyPage(req, env);
    return env.ASSETS.fetch(req);
  },

  async scheduled(_event, env, ctx) {
    // Heartbeat for /api/health: an uptime monitor can tell when the schedule stops running.
    await setSetting(env, 'last_cron_at', new Date().toISOString());
    ctx.waitUntil(purgeExpired(env));
    await syncDueShops(env);
    await shopifyCron(env).catch((e) => console.error('shopify cron failed', e));
    await alertAdmins(env);
  },
} satisfies ExportedHandler<Env>;
