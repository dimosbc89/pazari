#!/usr/bin/env bash
# Full test of the Tagora plugin with real WordPress + WooCommerce against a local Tagora
# (wrangler dev on :8787). Runs on GitHub: .github/workflows/woocommerce-plugin.yml.
# Needs: WP_PATH (WordPress with WooCommerce and the plugin active), jq, curl.
set -euo pipefail
T=http://localhost:8787/api
wp() { command wp --path="$WP_PATH" "$@"; }
FAILS=0
check() { # label, got, want
  if [ "$2" == "$3" ]; then echo "ok   $1"; else echo "FAIL $1: got '$2', want '$3'"; FAILS=$((FAILS + 1)); fi
}
api() { curl -sS -H 'Content-Type: application/json' "$@"; }

echo "== WooCommerce products"
IDS=$(wp eval-file "$(dirname "$0")/setup-products.php")
echo "$IDS"
SONARO=$(echo "$IDS" | jq -r .sonaro); LUMO=$(echo "$IDS" | jq -r .lumo); VELTO=$(echo "$IDS" | jq -r .velto)
V42=$(echo "$IDS" | jq -r .v42); V43=$(echo "$IDS" | jq -r .v43); SOLD=$(echo "$IDS" | jq -r .sold)

echo "== Sign up on Tagora with the plugin"
SIGNUP=$(api -X POST "$T/shops/signup" -d '{"name":"CI Woo Shop","website":"https://ci-woo.example","email":"owner@ci-woo.example","sourceType":"plugin","consent":true,"countries":["gr"],"lang":"el"}')
KEY=$(echo "$SIGNUP" | jq -r .pluginKey)
SHOP=$(echo "$SIGNUP" | jq -r .id)
check "signup returns a key" "${KEY:0:4}" "tgr_"

echo "== Connect and full sync from WordPress"
wp tagora connect "$KEY"
SYNC=$(wp tagora sync 2>&1); echo "$SYNC"
check "full sync: sent / on Tagora" "$(echo "$SYNC" | grep -o '[0-9]* sent, [0-9]* on Tagora')" "5 sent, 4 on Tagora"

echo "== Admin approves (real endpoint)"
LINK=$(api -X POST "$T/auth/login" -d '{"email":"admin@example.com"}' | jq -r .devLink)
TOKEN=$(echo "$LINK" | sed -E 's/.*token=([^&]+).*/\1/')
api -c cookies.txt -X POST "$T/auth/verify" -d "{\"token\":\"$TOKEN\"}" >/dev/null
APPROVE=$(api -b cookies.txt -X POST "$T/admin/shops/$SHOP/approve" -d '{}')
check "approve lists the products" "$(echo "$APPROVE" | jq -r .result.imported)" "4"

echo "== What Tagora shows"
S=$(curl -sS "$T/catalogue/search?country=gr&q=sonaro")
check "sonaro: found" "$(echo "$S" | jq -r .total)" "1"
check "sonaro: sale price" "$(echo "$S" | jq -r '.hits[0].price')" "109"
check "sonaro: old price" "$(echo "$S" | jq -r '.hits[0].oldPrice')" "129"
check "sonaro: barcode from WooCommerce GTIN" "$(echo "$S" | jq -r '.hits[0].matchKey')" "gtin:5209000000017"
check "sonaro: brand from WooCommerce Brands" "$(echo "$S" | jq -r '.hits[0].brand')" "Sonaro"
check "sonaro: category" "$(echo "$S" | jq -r '.hits[0].category')" "Ήχος"
check "sonaro: description" "$(echo "$S" | jq -r '.hits[0].summary')" "Over-ear με ακύρωση θορύβου."
L=$(curl -sS "$T/catalogue/search?country=gr&q=lumo")
check "lumo: barcode from _ean meta" "$(echo "$L" | jq -r '.hits[0].matchKey')" "gtin:5209000000031"
check "lumo: brand from attribute" "$(echo "$L" | jq -r '.hits[0].brand')" "Lumo"
check "lumo: colour from attribute" "$(echo "$L" | jq -r '.hits[0].color')" "Κόκκινο"
V=$(curl -sS "$T/catalogue/search?country=gr&q=velto&sort=price_asc")
check "velto: one offer per variation" "$(echo "$V" | jq -r .total)" "2"
check "velto: sizes" "$(echo "$V" | jq -r '[.hits[].size] | sort | join(",")')" "42,43"
check "velto: same group" "$(echo "$V" | jq -r '[.hits[].groupId] | unique | length')" "1"
check "sold out: not shown" "$(curl -sS "$T/catalogue/search?country=gr&q=εξαντλημενο" | jq -r .total)" "0"

echo "== Live updates (background jobs, as on a real shop)"
wp eval "\$p = wc_get_product( $SONARO ); \$p->set_sale_price( '99' ); \$p->save();"
wp action-scheduler run --hooks=tagora_push_products --quiet || wp action-scheduler run --quiet
check "price change reaches Tagora" "$(curl -sS "$T/catalogue/products/$SHOP-$SONARO" | jq -r .product.price)" "99"
wp eval "\$v = wc_get_product( $V43 ); \$v->set_stock_status( 'outofstock' ); \$v->save();"
wp action-scheduler run --hooks=tagora_push_products --quiet || wp action-scheduler run --quiet
check "variation sold out: removed" "$(curl -sS -o /dev/null -w '%{http_code}' "$T/catalogue/products/$SHOP-$V43")" "404"
check "other variation stays" "$(curl -sS -o /dev/null -w '%{http_code}' "$T/catalogue/products/$SHOP-$V42")" "200"
wp eval "wp_trash_post( $LUMO );" # what "Move to Trash" in WP-Admin does
wp action-scheduler run --hooks=tagora_push_products --quiet || wp action-scheduler run --quiet
check "trashed product: removed" "$(curl -sS -o /dev/null -w '%{http_code}' "$T/catalogue/products/$SHOP-$LUMO")" "404"

echo "== Status, heartbeat, settings page"
wp tagora status
check "heartbeat: no full sync needed" "$(wp eval 'echo wp_json_encode( Tagora_Api::hello()["fullSync"] );')" "false"
PAGE=$(wp eval 'wp_set_current_user( 1 ); Tagora_Admin::page();')
check "settings page shows the shop" "$(echo "$PAGE" | grep -c 'CI Woo Shop')" "1"
if wp language core install el --activate >/dev/null 2>&1; then
  PAGE_EL=$(wp eval 'wp_set_current_user( 1 ); switch_to_locale( "el" ); load_plugin_textdomain( "tagora", false, "tagora/languages" ); Tagora_Admin::page();')
  check "settings page in Greek" "$(echo "$PAGE_EL" | grep -c 'Συγχρονισμός τώρα')" "1"
fi

echo "== PHP notices from the plugin"
NOTICES=$(grep -i 'tagora' "$WP_PATH/wp-content/debug.log" 2>/dev/null | grep -ivE 'translation loading' || true)
check "no PHP notices or warnings" "$NOTICES" ""

echo
if [ "$FAILS" -gt 0 ]; then echo "$FAILS check(s) failed"; exit 1; fi
echo "all checks passed"
