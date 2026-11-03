export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;

  /** Public address of the site, e.g. https://tagora.online (used in emails) */
  SITE_URL?: string;
  /** Comma-separated emails that can open the admin page */
  ADMIN_EMAILS?: string; // a secret, so it is not in the repo
  /** production | development. Development allows localhost sources and shows sign-in links without email. */
  ENVIRONMENT?: string;
  /** Hours between automatic syncs of a shop (default 6) */
  SYNC_INTERVAL_HOURS?: string;
  /** Shops synced per scheduled run (default 3; the cron runs every 10 minutes) */
  SYNC_BATCH?: string;

  TYPESENSE_HOST?: string;
  TYPESENSE_PORT?: string;
  TYPESENSE_PROTOCOL?: string;
  TYPESENSE_COLLECTION?: string;
  /** Secret: admin key (writes the index) */
  TYPESENSE_ADMIN_KEY?: string;

  /** Secret: Resend API key for sign-in and notification emails */
  RESEND_API_KEY?: string;
  /** Sender, e.g. "Tagora <hello@tagora.online>" (the domain must be verified in Resend) */
  MAIL_FROM?: string;

  /** The Tagora app for Shopify: its Client ID (public, in wrangler.jsonc) */
  SHOPIFY_API_KEY?: string;
  /** Secret: the app's Client secret (signs session tokens and webhooks) */
  SHOPIFY_API_SECRET?: string;
  /** Development only: send Shopify API calls to a test server, e.g. http://localhost:8790 */
  SHOPIFY_TEST_ORIGIN?: string;
}

export const isDev = (env: Env) => env.ENVIRONMENT === 'development';

export const adminEmails = (env: Env) =>
  (env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
