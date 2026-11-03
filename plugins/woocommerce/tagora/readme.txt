=== Tagora for WooCommerce ===
Contributors: tagora
Tags: price comparison, comparison shopping, product feed, google shopping, css
Requires at least: 6.2
Tested up to: 6.8
Requires PHP: 7.4
WC requires at least: 7.0
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Sends your products to Tagora, the Greek price comparison site, and keeps them up to date automatically.

== Description ==

[Tagora](https://tagora.online) is a Greek price comparison site and Comparison Shopping Service (CSS) for Google Shopping. This plugin connects your WooCommerce shop to it:

* Sends every published product, with its variations (colour, size), prices, sale prices, stock, images, categories, brand, barcode (EAN) and MPN.
* Keeps them up to date: when you save a product, change its stock or delete it, Tagora gets the change within a minute. Every few hours it also sends the whole catalogue, to be sure nothing is missed.
* Works behind firewalls and security plugins: your shop sends the products, Tagora does not need to read your site.
* Finds barcodes, MPN and brands from WooCommerce (GTIN field, Brands) and popular plugins. You can point it to your own fields under WooCommerce → Tagora → Advanced.

You need a Tagora account: apply at https://tagora.online/gr/shops and choose "WooCommerce plugin". Listing is free for the first 12 months.

= What is sent =

Product data only: titles, descriptions, links, images, prices, stock, categories, attributes, brand, EAN and MPN. No customer or order data. The plugin sends to https://tagora.online, authenticated with your shop's connection key. Terms: https://tagora.online/gr/pages/shop-terms. Privacy: https://tagora.online/gr/pages/privacy-policy.

== Installation ==

1. Plugins → Add New → Upload Plugin, choose tagora-woocommerce.zip, Install and Activate.
2. Apply on Tagora (https://tagora.online/gr/shops), choosing "WooCommerce plugin", and copy your connection key.
3. WooCommerce → Tagora: paste the key and press Connect.

Your products appear on Tagora once the shop is approved.

WP-CLI: `wp tagora connect <key>`, `wp tagora sync`, `wp tagora status`.

== Frequently Asked Questions ==

= Which products are sent? =

Published, visible products (simple, variable with each enabled variation, external). Drafts, private, hidden and grouped products are not. Sold-out products are sent with their stock status and Tagora hides them.

= My products have no barcode on Tagora =

Barcodes put your products into Tagora's price comparison. The plugin reads WooCommerce's GTIN/EAN field (WooCommerce 9.2+) and the fields of common EAN plugins. If yours is elsewhere, enter its meta key under WooCommerce → Tagora → Advanced.

== Changelog ==

= 1.0.0 =
* First release.
