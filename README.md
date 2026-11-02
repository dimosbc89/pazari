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

## Connect a real catalogue

The demo searches `public/demo/products.json` in the browser. For real merchants, use [Typesense](https://typesense.org) (Typesense Cloud or self-hosted):

1. **Import each merchant's Google Merchant Center feed** (XML or tab-separated, file or URL):
   ```bash
   npm run feed:import -- --feed https://shop.example/feed.xml --shop "Shop name" --countries gr,cy
   ```
   It writes `data/catalogue.json` (one run per merchant; re-running replaces that shop's items). It skips out-of-stock items, reads sale prices as discounts, and escapes description text. Offers with the same `mpn` (or `gtin`) are compared on the product page.
2. **Upload to Typesense** and create a browser-safe key:
   ```bash
   TYPESENSE_HOST=xxx.a1.typesense.net TYPESENSE_ADMIN_KEY=... \
     npm run typesense:push -- --file data/catalogue.json --recreate --search-key
   ```
3. **Point the site at it** in `.env`:
   ```
   VITE_SEARCH_BACKEND=typesense
   VITE_TYPESENSE_HOST=xxx.a1.typesense.net
   VITE_TYPESENSE_SEARCH_KEY=<the search-only key from step 2>
   ```

Only the search-only key goes in `VITE_` variables; they ship to the browser. Keep the admin key on your machine or in CI. To try Typesense with the demo data, run step 2 without `--file`.

## Deploy

`dist/` is a static single-page app, so any static host works. Every route must serve `index.html`; these files handle that:

* **Cloudflare** (`wrangler.jsonc`): Workers & Pages → Create → Import a repository. Use build command `npm run build` and deploy command `npx wrangler deploy`. Every push then deploys.
* **Netlify** (`public/_redirects`, `public/_headers`): build `npm run build`, publish `dist`.
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

* Fill the placeholders: `[COMPANY LEGAL NAME]`, `[ADDRESS]`, `[GEMI NUMBER]`, `[VAT NUMBER]`, `[CONTACT EMAIL]` in `src/config.ts`. The legal pages also need `[LAST UPDATED DATE]`, `[LOG RETENTION DAYS]`, `[EVENT RETENTION DAYS]` and `[HOSTING PROVIDER]` in `src/content/legal.ts`.
* Have a lawyer review both policies. They describe server-side logging of searches and click-outs for partner reporting; this app does not log anything server-side yet. Either add that logging or remove it from the policy.
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
  pages/              Home, Products, ProductPage, Legal, NotFound
  components/         Header, Footer, SearchInput, HitCard, FacetList, SortSelect, Carts, Lightbox, …
  content/legal.ts    privacy and cookie policies (el, en)
  lib/                hooks (URL search state), consent + GTM, HTML sanitiser
  styles/             tokens, base, components, home, results, product, pages
scripts/              brand, demo data, feed import, Typesense push
brand/                logo files and brand sheet
public/               favicons, manifest, og.png, demo catalogue
```
