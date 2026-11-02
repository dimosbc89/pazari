# pazari

**Pazari** is a comparison shopping service (CSS): one search across many online shops, with filters, price comparison and a click-out to the shop that sells it. It has the same screens and flow as Wisely CSS (`shopping.shopwisely.io`): a home search, results with filters, a product page with offers and variants, and the legal pages. Everything in this repo is new, though: code, design, logo, copy, illustrations and demo data. Nothing was copied from that site.

*Παζάρι* is Greek for both "bazaar" and "haggling for a better price", which is the job a price-comparison site does for you. The logo is a market-stall awning (see [BRAND.md](BRAND.md)).

![Brand sheet](brand/brand-sheet.png)

## What's in it

| Screen | URL | What it does |
| --- | --- | --- |
| Home | `/gr` | Logo, search, suggestions, catalogue stats. Two carts fill up as you type. |
| Results | `/gr/products?q=…` | Filters for category, shop, brand, size, colour and discount (with counts and "show all" search), sorting, active-filter chips and "load more". On mobile the filters open in a drawer. |
| Product | `/gr/products/:group/variant/:id` | Gallery with zoom, price, delivery, a "Buy at {shop}" click-out, a **price comparison** of the same product (same MPN) in every shop with totals including delivery, and the other colours and sizes. A buy bar sticks to the bottom once you scroll. |
| Legal | `/gr/pages/privacy-policy`, `/gr/pages/cookies-policy` | Greek and English policies with `[PLACEHOLDERS]` highlighted. |
| For shops | `/gr/shops` | Shops apply: connect an XML feed, Shopify or WooCommerce, see a live check of their products, send the application. |
| Shop dashboard | `/gr/merchant` (sign-in: `/gr/merchant/login`) | Products online, last and next sync, what needs fixing, visitors sent per day, "Sync now", change the connection. |
| Admin | `/gr/admin` | Review applications, approve (runs the first sync), reject, pause, resume, sync. |

The other pieces:

* **Countries:** Greece, Cyprus (Greek UI), Ireland and Malta (English UI), switched from the footer. `/` remembers the last country. Add more in `src/config.ts`.
* **Search:** weighted fields, prefix matching, one-typo tolerance, accent-insensitive Greek, and **Greeklish** (`akoustika` finds ακουστικά). Filter counts stay correct when several filters are combined.
* **Cookie consent:** Google Tag Manager loads only after "Accept all" (set `VITE_GTM_ID`). Click-outs are pushed as a `click_out` event.
* **Demo catalogue:** 347 offers, 20 brands and 8 shops, with drawn product images. **All fictional**, and the footer says so while the demo backend is on.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build in dist/
npm run preview    # serve dist/ on http://localhost:4173
```

Copy `.env.example` to `.env` to change settings. With no `.env` the site runs on the demo catalogue.

## Shops and product sync

Shops join by themselves and their products stay up to date without anyone at Pazari touching a file.

**How a shop joins**

1. On `/gr/shops` the shop picks how it connects and pastes an address:
   * **XML feed:** the Skroutz, BestPrice or Google Shopping feed it already has (XML or CSV/TSV). Recommended: it carries barcodes (EAN) and MPNs, which is what puts the shop in price comparisons.
   * **Shopify:** just the shop address. Pazari reads the store's public `/products.json` (no app to install; no barcodes or delivery costs).
   * **WooCommerce:** just the shop address. Pazari reads WooCommerce's built-in public Store API (no plugin or keys; no barcodes or delivery costs).
2. "Check" reads the source on the spot: how many products are ready, samples, and problems (no price, sold out, no barcode…).
3. The shop fills in its details, the countries it delivers to, and an optional delivery cost / free-delivery threshold (used when the source has none). The application is saved as **pending** and both the shop and the admins get an email.
4. An admin approves it on `/gr/admin`. That runs the first sync, so the products are live within seconds, and emails the shop.
5. The shop signs in with a one-time email link (no passwords) and sees its dashboard.

**How products stay in sync**

* A Cloudflare cron runs every 10 minutes and syncs the shops that are due, a few at a time. Each shop is synced every `SYNC_INTERVAL_HOURS` (default 6). Shops can also press "Sync now" (once per 5 minutes).
* Each sync reads the whole source, checks every product, uploads them to Typesense, then **removes that shop's products that were not in this sync** (deleted, sold out). Out-of-stock items are left out on purpose.
* If a source fails (site down, broken feed), the products already online stay online, the shop gets one email, and Pazari retries in an hour.
* **Same product in different shops** = same barcode (EAN/GTIN), or same brand + MPN. Shop SKUs are never used for matching.
* Every product-page click-out is counted per shop per day (no visitor data) for the shop dashboard.

**Set it up on Cloudflare** (once)

```bash
npx wrangler d1 create pazari                      # paste the database_id into wrangler.jsonc
npm run db:migrate:remote                          # create the tables
npx wrangler secret put TYPESENSE_ADMIN_KEY        # writes the search index
npx wrangler secret put RESEND_API_KEY             # sends sign-in and notification emails (resend.com)
```

Then in `wrangler.jsonc` → `vars`: `SITE_URL`, `ADMIN_EMAILS` (comma-separated; these people can open `/admin`), `MAIL_FROM` (a sender on a domain verified in Resend) and the `TYPESENSE_*` host settings. The website needs the search-only key in `VITE_TYPESENSE_SEARCH_KEY` and `VITE_SEARCH_BACKEND=typesense` at build time (Cloudflare: Settings → Build → Variables). Deploy with `npm run deploy`, or connect the repo in the Cloudflare dashboard.

The scheduled sync needs the **Workers Paid plan** (the free plan's limits on CPU time and outgoing requests are too low for reading catalogues). Feeds up to ~80 MB and Shopify stores up to 25,000 products are read in one go; for much bigger catalogues, move the sync to Cloudflare Queues.

**Try it locally** (fake shops and a fake search index, no accounts needed)

```bash
cp .dev.vars.example .dev.vars
npm run db:migrate                                 # local database
npm run dev:mocks                                  # test shops on :9100, test Typesense on :8108
VITE_SEARCH_BACKEND=typesense VITE_TYPESENSE_HOST=localhost VITE_TYPESENSE_PORT=8108 \
  VITE_TYPESENSE_PROTOCOL=http VITE_TYPESENSE_SEARCH_KEY=dev npx vite build
npm run dev:api                                    # site + API on http://localhost:8787
```

Open `http://localhost:8787/gr/shops` and apply with `http://localhost:9100/feeds/skroutz.xml` (also `google.xml`, `bestprice.xml`, `products.tsv`, a Shopify store at `http://localhost:9100` and a WooCommerce shop at `http://localhost:9100/woo`). Sign in as `admin@example.com` at `/gr/merchant/login`: without an email key the sign-in link is shown on screen. Run the scheduled sync by hand with `curl -X POST "http://localhost:8787/cdn-cgi/local/explorer/api/local/scheduled?worker=pazari" -H 'Content-Type: application/json' -d '{"cron":"*/10 * * * *"}'`.

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

* Fill the placeholders: `[COMPANY LEGAL NAME]`, `[ADDRESS]`, `[GEMI NUMBER]`, `[VAT NUMBER]`, `[CONTACT EMAIL]` in `src/config.ts`. The legal pages also need `[LAST UPDATED DATE]`, `[LOG RETENTION DAYS]`, `[EVENT RETENTION DAYS]`, `[HOSTING PROVIDER]`, `[EMAIL PROVIDER]` and `[MERCHANT RETENTION]` in `src/content/legal.ts`.
* Have a lawyer review both policies. Click-outs are now counted per shop and day; searches are not logged server-side, although the policy says they are. Either add that logging or remove it from the policy.
* Set `ADMIN_EMAILS` (it is `admin@example.com` in `wrangler.jsonc`) and the Resend sender before inviting shops.
* Shop terms: the sign-up form asks for consent to be contacted and links the privacy policy. If shops pay or accept conditions, add a terms page and a checkbox for it.
* Spam: the sign-up form has a hidden honeypot field. If fake applications appear, add Cloudflare Turnstile to the form.
* Switch to real data (above). The demo footer note disappears with `VITE_SEARCH_BACKEND=typesense`.
* Google CSS: apply to the CSS Program (directly or through a CSS partner), and set up each merchant in Merchant Center under the Pazari CSS.
* Name and domain: check the trademark (EUIPO / Greek registry) and register a domain. Candidates: `pazari.gr`, `pazari.eu`, `getpazari.com`. Availability was **not** checked.
* `Powered by GROW Agency` in the footer: change or remove it in `src/config.ts` (`SITE.poweredBy`).

## Repo layout

```
src/
  config.ts           countries, company details, search backend, storage keys
  i18n/               UI strings (el, en) and the locale hook (prices, labels, paths)
  search/             types, local (demo) backend, Typesense backend
  pages/              Home, Products, ProductPage, Legal, NotFound, ShopsPage, MerchantLogin, MerchantDashboard, AdminPage
  components/         Header, Footer, SearchInput, HitCard, FacetList, SortSelect, Carts, Lightbox, …
  content/legal.ts    privacy and cookie policies (el, en)
  lib/                hooks (URL search state), consent + GTM, HTML sanitiser, shop API client
  styles/             tokens, base, components, home, results, product, pages
worker/               Cloudflare Worker: /api (sign-up, sign-in, dashboards, admin) and the scheduled sync
sync/                 sync engine shared by the Worker and the CLI: feeds, Shopify, WooCommerce, checks, Typesense
shared/               markets (countries) and the Typesense schema
migrations/           D1 database tables
dev/                  local test shops and test search index
scripts/              brand, demo data, import (CLI), Typesense push
brand/                logo files and brand sheet
public/               favicons, manifest, og.png, demo catalogue
```
