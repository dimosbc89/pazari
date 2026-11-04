# Tagora app: Shopify App Store listing

Text to paste into the listing form (Dev Dashboard → the app → Distribution → Shopify App Store).
Greek first (the main market), then English.

## Basics

- **App name:** Tagora
- **App icon:** `public/brand/` (the Tagora "o" icon, 1200 × 1200)
- **Category:** Sales channels → Marketplaces and comparison shopping (or the closest one offered)
- **Pricing:** Free to install. Tagora's listing has its own plan: the first 12 months free, then €300 a year + VAT, billed by GROW Agency Ε.Ε. (see "Billing" below).
- **Privacy policy:** https://tagora.online/gr/pages/privacy-policy
- **Support email:** hello@tagora.online
- **Website:** https://tagora.online
- **Languages:** Greek, English

## Ελληνικά

**Σύντομη περιγραφή (tagline):** Τα προϊόντα σου στη σύγκριση τιμών Tagora και στο Google Shopping.

**Περιγραφή:**
Το Tagora είναι ελληνική σύγκριση τιμών και συνεργάτης CSS της Google. Με την εφαρμογή, τα προϊόντα του καταστήματός σου εμφανίζονται στο tagora.online και ενημερώνονται μόνα τους: τιμή, έκπτωση, απόθεμα και νέα προϊόντα φτάνουν στο Tagora λίγα λεπτά μετά από κάθε αλλαγή στο Shopify.

- Αίτηση μέσα από το Shopify, σε ένα λεπτό.
- Χωρίς XML feed: διαβάζουμε τα προϊόντα κατευθείαν από το Shopify.
- Barcode (EAN), μάρκα και κατηγορία, ώστε το προϊόν σου να εμφανίζεται δίπλα στα ίδια προϊόντα άλλων καταστημάτων.
- Μία προσφορά για κάθε παραλλαγή (μέγεθος, χρώμα) που είναι διαθέσιμη.
- Λίστα με ό,τι χρειάζεται διόρθωση (χωρίς barcode, χωρίς μάρκα, εξαντλημένα).
- Μόνο ανάγνωση: δεν αλλάζουμε τίποτα στο κατάστημα και δεν βλέπουμε πελάτες ή παραγγελίες.

## English

**Tagline:** Your products on the Tagora price comparison and in Google Shopping.

**Description:**
Tagora is a Greek price comparison site and a Google CSS partner. With the app, your store's products appear on tagora.online and stay up to date by themselves: price, discount, stock and new products reach Tagora a few minutes after every change in Shopify.

- Apply from inside Shopify in a minute.
- No XML feed needed: we read your products directly from Shopify.
- Barcodes (EAN), brand and category, so your product appears next to the same product from other shops.
- One offer for every variant (size, colour) that is in stock.
- A list of what to fix (no barcode, no brand, sold out).
- Read-only: we change nothing in your store and never see customers or orders.

## Data the app uses (for the "Data protection" questions)

- **Scopes:** `read_products`, `read_inventory`. No customer, order or payment data.
- **Stored:** product data (to show it on Tagora), the store's name, email, website and currency, and an encrypted access token.
- **Removal:** on `app/uninstalled` we stop reading the store and take its products off Tagora; on `shop/redact` we delete the products and store details. `customers/data_request` and `customers/redact` are answered with 200: we hold no customer data.

## Billing

The app itself is free. Tagora charges shops for its comparison listing (12 months free, then €300 a year + VAT), invoiced directly by GROW Agency Ε.Ε. under the Tagora terms for shops, the same for every shop whether it uses this app, the WooCommerce plugin or an XML feed. If Shopify's review asks for app charges to go through the Shopify Billing API, the paid plan has to be offered through it instead (a change in `worker/shopify.ts`).

## Notes for the reviewer

1. Install the app on your development store and open it (Apps → Tagora).
2. The form is filled in from the store's details. Tick the terms box and press "Apply to Tagora".
3. The app starts a full product sync (a bulk operation); after a minute it shows the number of products ready and anything to fix.
4. New applications wait for approval by the Tagora team (status "Waiting for approval"); products appear on tagora.online once approved. Write to hello@tagora.online to have your test store approved during the review.
5. Edit a product's price or stock: the change reaches Tagora through webhooks within a minute.
