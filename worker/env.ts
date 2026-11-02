export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;

  /** Public address of the site, e.g. https://pazari.gr (used in emails) */
  SITE_URL?: string;
  /** Comma-separated emails that can open the admin page */
  ADMIN_EMAILS?: string;
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
  /** Sender, e.g. "Pazari <hello@pazari.gr>" (the domain must be verified in Resend) */
  MAIL_FROM?: string;
}

export const isDev = (env: Env) => env.ENVIRONMENT === 'development';

export const adminEmails = (env: Env) =>
  (env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
