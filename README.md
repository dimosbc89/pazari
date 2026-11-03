# tagora

**Tagora** is a comparison shopping service (CSS): one search across many online shops, with filters, price comparison and a click-out to the shop that sells it. It has the same screens and flow as Wisely CSS (`shopping.shopwisely.io`): a home search, results with filters, a product page with offers and variants, and the legal pages. Everything in this repo is new, though: code, design, logo, copy, illustrations and demo data. Nothing was copied from that site.

*Tagora* = price **tag** + **αγορά**, the ancient Greek marketplace: the market where every shop's price tags meet. The logo's "o" is the hole of a price tag; the market-stall awning is the site's motif (see [BRAND.md](BRAND.md)). The GitHub repository is still called `pazari`; rename it in GitHub → Settings if you like (old links keep redirecting).

![Brand sheet](brand/brand-sheet.png)

## What's in it

| Screen | URL | What it does |
| --- | --- | --- |
| Home | `/gr` | Logo, search, suggestions, catalogue stats. Two carts fill up as you type. |
| Results | `/gr/products?q=…` | Filters for category, shop, brand, size, colour and discount (with counts and "show all" search), sorting, active-filter chips and "load more". On mobile the filters open in a drawer. |
| Product | `/gr/products/:group/variant/:id` | Gallery with zoom, price, delivery, a "Buy at {shop}" click-out, a **price comparison** of the same product (same MPN) in every shop with totals including delivery, and the other colours and sizes. A buy bar sticks to the bottom once you scroll. |
| Legal | `/gr/pages/privacy-policy`, `/gr/pages/cookies-policy`, `/gr/pages/terms`, `/gr/pages/shop-terms` | Privacy and cookie policies, terms of use, and terms for shops (Greek and English), with `[PLACEHOLDERS]` highlighted. |
| How we rank | `/gr/pages/ranking` | How results and offers are ordered, which shops appear, no paid placements. Linked from the results and the price comparison. |
| Contact | `/gr/pages/contact` | Customer service, company details, links for shops and for data requests. |
| About | `/gr/pages/about` | What Tagora is, how it works, how ranking stays fair, who runs it. |
| Help for shops | `/gr/pages/shop-help` | How to connect a feed, Shopify or WooCommerce, what each product needs, the checks, sync and cost. |
| For shops | `/gr/shops` | Shops apply: connect an XML feed, Shopify or WooCommerce, see a live check of their products, send the application. |
| Shop dashboard | `/gr/merchant` (sign-in: `/gr/merchant/login`) | Products online, last and next sync, what needs fixing, visitors sent per day, "Sync now", change the connection. |
| Admin | `/gr/admin` | Review applications, approve (runs the first sync), reject, pause, resume, sync. Switch the website between the demo catalogue and the partner shops' products ("Show real products"), with a preview first. |

The other pieces:

* **Countries:** Greece, Cyprus (Greek UI), Ireland and Malta (English UI), switched from the footer. `/` remembers the last country. Add more in `src/config.ts`.
* **Search:** the partner shops' products live in the Cloudflare database (D1) and are searched with SQLite full-text search (`worker/catalogue.ts`): weighted fields, prefix matching, one-typo correction, accent-insensitive Greek, and **Greeklish** (`akoustika` finds ακουστικά). Filter counts stay correct when several filters are combined. Answers are cached at Cloudflare's edge for 5 minutes. No search service or extra account is needed; Typesense remains an option for much larger catalogues (below).
* **Cookie consent:** Google Tag Manager loads only after "Accept all" (set `VITE_GTM_ID`). Click-outs are pushed as a `click_out` event.
* **Demo catalogue:** 347 offers, 20 brands and 8 shops, with drawn product images. **All fictional**, and the footer says so. The site shows it until an admin presses "Show real products" in `/admin` (preview first with `?catalogue=live`, only in your own tab).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build in dist/
npm run preview    # serve dist/ on http://localhost:4173
```

Copy `.env.example` to `.env` to change settings. With no `.env` the site runs on the demo catalogue.

## Shops and product sync

Shops join by themselves and their products stay up to date without anyone at Tagora touching a file.

**How a shop joins**

1. On `/gr/shops` the shop picks how it connects and pastes an address:
   * **XML feed:** the Skroutz, BestPrice or Google Shopping feed it already has (XML or CSV/TSV). Recommended: it carries barcodes (EAN) and MPNs, which is what puts the shop in price comparisons.
   * **Shopify:** just the shop address. Tagora reads the store's public `/products.json` (no app to install; no barcodes or delivery costs).
   * **WooCommerce:** just the shop address. Tagora reads WooCommerce's built-in public Store API (no plugin or keys; no barcodes or delivery costs).
2. "Check" reads the source on the spot: how many products are ready, samples, and problems (no price, sold out, no barcode…).
3. The shop fills in its details, the countries it delivers to, and an optional delivery cost / free-delivery threshold (used when the source has none). The application is saved as **pending** and both the shop and the admins get an email.
4. An admin approves it on `/gr/admin`. That runs the first sync, so the products are live within seconds, and emails the shop.
5. The shop signs in with a one-time email link (no passwords) and sees its dashboard.

**How products stay in sync**

* A Cloudflare cron runs every 10 minutes and syncs the shops that are due, a few at a time. Each shop is synced every `SYNC_INTERVAL_HOURS` (default 6). Shops can also press "Sync now" (once per 5 minutes).
* Each sync reads the whole source, checks every product, saves them in the database (unchanged products are skipped, so a sync costs little), then **removes that shop's products that were not in this sync** (deleted, sold out). Out-of-stock items are left out on purpose.
* **Cost for shops:** free for 12 months from approval, then €19 a month + VAT (shop terms, section 8). The dashboard shows each shop's free-until date.
* If a source fails (site down, broken feed), the products already online stay online, the shop gets one email, and Tagora retries in an hour.
* **Same product in different shops** = same barcode (EAN/GTIN), or same brand + MPN. Shop SKUs are never used for matching.
* Every product-page click-out is counted per shop per day (no visitor data) for the shop dashboard.

**Set it up on Cloudflare** (once)

The database `tagora` already exists (Western Europe) with its tables, and its id is in `wrangler.jsonc`. For a new migration in `migrations/`, run `npm run db:migrate:remote`.

Secrets (Cloudflare → Workers & Pages → tagora → Settings → Variables and Secrets, type "Secret"; or `npx wrangler secret put NAME`):

* `ADMIN_EMAILS`: who can open `/admin` (comma-separated). Kept out of the repo.
* `RESEND_API_KEY`: sends sign-in and notification emails ([resend.com](https://resend.com)).

In `wrangler.jsonc` → `vars`: `SITE_URL` and `MAIL_FROM` (a sender on a domain verified in Resend). Every push to `main` deploys through Workers Builds.

Optional, for much larger catalogues: a [Typesense](https://typesense.org) cluster. Set `TYPESENSE_HOST` (var) and `TYPESENSE_ADMIN_KEY` (secret) and the sync also copies every product there; build with `VITE_SEARCH_BACKEND=typesense` and the `VITE_TYPESENSE_*` settings to search it from the browser.

The scheduled sync needs the **Workers Paid plan** (the free plan's limits on CPU time and outgoing requests are too low for reading catalogues). Feeds up to ~80 MB and Shopify stores up to 25,000 products are read in one go; for much bigger catalogues, move the sync to Cloudflare Queues.

**Try it locally** (fake shops and a fake search index, no accounts needed)

```bash
cp .dev.vars.example .dev.vars
npm run db:migrate                                 # local database
npm run dev:mocks                                  # test shops on :9100 (and a test Typesense on :8108, optional)
npx vite build
npm run dev:api                                    # site + API on http://localhost:8787
```

Open `http://localhost:8787/gr/shops` and apply with `http://localhost:9100/feeds/skroutz.xml` (also `google.xml`, `bestprice.xml`, `products.tsv`, a Shopify store at `http://localhost:9100` and a WooCommerce shop at `http://localhost:9100/woo`). Sign in as `admin@example.com` at `/gr/merchant/login`: without an email key the sign-in link is shown on screen. Approve the shops in `/gr/admin`, then press "Show real products". Run the scheduled sync by hand with `curl -X POST "http://localhost:8787/cdn-cgi/local/explorer/api/local/scheduled?worker=tagora" -H 'Content-Type: application/json' -d '{"cron":"*/10 * * * *"}'`.

### Import from the command line

The same sync engine runs from a terminal, e.g. for a one-off import or a shop you add yourself:

```bash
npm run feed:import -- --type feed --url https://shop.gr/skroutz.xml --shop "Shop name" --countries gr,cy
npm run feed:import -- --type shopify --url https://shop.gr --shop "Shop name" --countries gr --shipping 3.5 --free-over 50
TYPESENSE_HOST=xxx.a1.typesense.net TYPESENSE_ADMIN_KEY=... npm run feed:import -- --type woocommerce --url https://shop.gr --shop "Shop name" --countries gr --push
```

It prints what it found and the problems, writes `data/catalogue.json`, and with `--push` uploads to Typesense and removes the shop's old products. `npm run typesense:push` uploads a whole file (e.g. the demo catalogue: `--recreate --search-key` also creates the browser-safe key).

Only the search-only key goes in `VITE_` variables; they ship to the browser. The admin key stays in Worker secrets, your machine or CI.

## Deploy

`dist/` is a static single-page app, so any static host works. Every route must serve `index.html`; these files handle that:

* **Cloudflare** (`wrangler.jsonc`), needed for the shop sign-up, dashboards and sync: Workers & Pages → Create → Import a repository. Use build command `npm run build` and deploy command `npx wrangler deploy`. Every push then deploys. See "Shops and product sync" for the database and secrets.
* **Netlify** (`public/_redirects`, `public/_headers`): build `npm run build`, publish `dist`. The shop pages need the Worker API, so on Netlify or Vercel they won't work.
* **Vercel** (`vercel.json`): framework preset Vite.

### tagora.online on Cloudflare

The domain is already a Cloudflare zone, so the Worker can serve it directly:

1. **Database:** done (`tagora`, Western Europe). Workers Builds does not run migrations: apply a new file in `migrations/` with `npm run db:migrate:remote` before merging the code that needs it.
2. **Deploy:** Workers & Pages → Create → Import a repository → `dimosbc89/pazari`, project name `tagora` (it must match `wrangler.jsonc`), branch `main`, build command `npm run build`, deploy command `npx wrangler deploy`.
3. **Secrets:** after the first deploy, add `ADMIN_EMAILS` and `RESEND_API_KEY` (see above).
4. **Domain:** the `routes` entry in `wrangler.jsonc` attaches `tagora.online` on deploy (DNS record and certificate included). If the zone already has an A, AAAA or CNAME record for `tagora.online` (for example a parking page), delete it first, or the deploy stops with a conflict.
5. **www:** in DNS add a proxied `A` record `www` → `192.0.2.1`, then Rules → Redirect Rules → "Redirect from WWW to root" (301, keep path and query). One address keeps Google from indexing every page twice.
6. **Email:** in Resend add the domain `tagora.online` and create the DNS records it shows (Resend can add them to Cloudflare for you). Emails go out from `hello@tagora.online` (`MAIL_FROM`).
7. **HTTPS:** SSL/TLS → Edge Certificates → turn on "Always Use HTTPS".
8. **Receiving email:** Email → Email Routing → enable, then forward `hello@tagora.online` to your inbox. It is the contact address on every page, and shops reply to it. To also send from it, add it in Gmail ("Send mail as") with Resend's SMTP server (`smtp.resend.com`, port 465, user `resend`, password: a Resend API key).
9. **DMARC** (so emails don't land in spam): DNS → add `TXT` record `_dmarc` with `v=DMARC1; p=none; rua=mailto:hello@tagora.online`. After a few weeks of clean reports, change `p=none` to `p=quarantine`.

### Monitoring

* `GET /api/health` answers 200 when the database works and the scheduled sync ran in the last 30 minutes, 503 otherwise.
* `.github/workflows/uptime.yml` checks the site and `/api/health` every 30 minutes from GitHub. When a check fails, GitHub emails you (Settings → Notifications → Actions: "Only notify for failed workflows"). GitHub turns scheduled workflows off after 60 days without commits; it emails a warning first.
* Once a day at most, admins get an email listing the shops whose last sync failed.
* Logs: Cloudflare → Workers & Pages → `tagora` → Logs. Backups: D1 keeps 30 days of history (Time Travel).

## Brand

The logo, icon and colours are generated from code, so they stay consistent:

```bash
npm run brand      # rebuilds brand/ and the favicons + og.png in public/
npm run demo:data  # rebuilds the demo catalogue and its images
```

* Geometry and colours: `scripts/brand-geometry.mjs`. The same wordmark lives in the app as `src/components/Logo.tsx`.
* Files to hand out: `brand/` (SVG logos, icon, lockup, PNG exports, brand sheet).
* Design tokens in the app: `src/styles/tokens.css`.

## Before launch

* Company details are in `src/config.ts` (`SITE.company`) and fill every page (GROW Agency Ε.Ε., ΓΕΜΗ 172105303000, ΑΦΜ 802206835). Check that the legal name matches the registry exactly.
* Have a lawyer review the policies and both sets of terms.
* Set the `ADMIN_EMAILS` secret and verify the Resend sender before inviting shops.
* Shop terms: shops accept them at sign-up; the version and date are stored (`terms_version`, `terms_accepted_at`, shown in the admin). When you change the terms, bump `SHOP_TERMS_VERSION` in `worker/routes.ts` and email every shop at least 15 days before (EU Regulation 2019/1150). Rejected and paused shops get an email with the reason.
* Spam: the sign-up form has a hidden honeypot field. If fake applications appear, add Cloudflare Turnstile to the form.
* Switch to real data: approve shops, preview, then "Show real products" in `/admin`.
* Google CSS: see the checklist below.
* Name: check the trademark (EUIPO / Greek registry). The domain is `tagora.online`, on Cloudflare.
* `Powered by GROW Agency` in the footer: change or remove it in `src/config.ts` (`SITE.poweredBy`).

## Apply to Google's CSS program

What Google looks at, and where this repo stands:

| Requirement | Status |
| --- | --- |
| A comparison website people can use: search across shops, filters, product pages, click-out to the shop | Done |
| Your own product pages (not just links to the shop) | Done (`/products/:group/variant/:id`) |
| Clear company and customer-service details | Contact page done; fill `SITE.company` |
| Terms, privacy policy, how ranking works | Done; fill the placeholders and have them reviewed |
| A real catalogue from real shops, updated often | Sign-up and sync done; you need shops, then "Show real products" in `/admin` |
| Your own domain on HTTPS | Register a domain and add it in Cloudflare |
| Product pages Google can read | The app renders in the browser. Google renders JavaScript, but server-rendered product pages and a sitemap would make indexing faster |

Steps:

1. Launch on your domain with real shops and products (Google reviews the live site, not a demo).
2. Create a Google Merchant Center account for Tagora as a CSS and apply through the [CSS Program](https://comparisonshoppingpartners.withgoogle.com/) (or join an existing CSS partner first and switch later).
3. After approval, open a Merchant Center sub-account for each shop under the Tagora CSS. Their Shopping ads then show "By Tagora".
4. To be a **CSS Premium Partner** you need enough ad spend and accounts managed through Google Ads; that comes later.

Shops can then run their Shopping ads through Tagora instead of Google's own CSS: that's the service you sell them.

## Repo layout

```
src/
  config.ts           countries, company details, search backend, storage keys
  i18n/               UI strings (el, en) and the locale hook (prices, labels, paths)
  search/             types; demo (in-browser), D1 (/api/catalogue) and Typesense backends; demo/live switch
  pages/              Home, Products, ProductPage, Legal, NotFound, ShopsPage, MerchantLogin, MerchantDashboard, AdminPage
  components/         Header, Footer, SearchInput, HitCard, FacetList, SortSelect, Carts, Lightbox, …
  content/legal.ts    privacy and cookie policies (el, en)
  content/terms.ts    terms of use, terms for shops (el, en)
  content/pages.ts    how we rank results, contact (el, en)
  content/help.ts     about Tagora, help for shops (el, en)
  lib/                hooks (URL search state), consent + GTM, HTML sanitiser, shop API client
  styles/             tokens, base, components, home, results, product, pages
worker/               Cloudflare Worker: /api (sign-up, sign-in, dashboards, admin, product search, health) and the scheduled sync
sync/                 sync engine shared by the Worker and the CLI: feeds, Shopify, WooCommerce, checks, Typesense (optional)
shared/               markets (countries), search text helpers (accents, Greeklish, typos), the Typesense schema
migrations/           D1 database tables
dev/                  local test shops and test search index
scripts/              brand, demo data, import (CLI), Typesense push
brand/                logo files and brand sheet
public/               favicons, manifest, og.png, demo catalogue
```
