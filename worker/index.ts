// Cloudflare Worker: serves the API under /api/* (static files and the app are served
// from dist/ by Workers static assets) and runs the scheduled product sync.
import { purgeExpired } from './auth.ts';
import type { Env } from './env.ts';
import { handleApi } from './routes.ts';
import { syncDueShops } from './shops.ts';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env, ctx);
    return env.ASSETS.fetch(req);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(purgeExpired(env));
    await syncDueShops(env);
  },
} satisfies ExportedHandler<Env>;
