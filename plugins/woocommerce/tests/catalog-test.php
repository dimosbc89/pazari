<?php
/**
 * Quick test of Tagora_Catalog without WordPress: minimal stand-ins for the WordPress and
 * WooCommerce functions it uses. The full test with real WooCommerce runs on GitHub
 * (.github/workflows/woocommerce-plugin.yml). Run: php plugins/woocommerce/tests/catalog-test.php
 */

define( 'ABSPATH', __DIR__ );
$GLOBALS['meta'] = array(); $GLOBALS['terms'] = array(); $GLOBALS['products'] = array();

function get_option( $k, $d = false ) { return 'tagora_settings' === $k ? array( 'sku_as_mpn' => false ) : $d; }
function wp_strip_all_tags( $s ) { return trim( strip_tags( $s ) ); }
function strip_shortcodes( $s ) { return preg_replace( '/\[[^\]]+\]/', '', $s ); }
function wc_get_price_including_tax( $p, $args ) { return '' === $args['price'] ? 0 : (float) $args['price'] * 1.24; }
function wp_get_attachment_image_url( $id ) { return $id ? "https://shop.example/img/$id.jpg" : false; }
function wc_attribute_label( $name ) { $l = array( 'pa_color' => 'Χρώμα', 'pa_size' => 'Μέγεθος', 'pa_brand' => 'Μάρκα', 'attribute_pa_color' => 'Χρώμα', 'attribute_pa_size' => 'Μέγεθος' ); return isset( $l[ $name ] ) ? $l[ $name ] : $name; }
function taxonomy_exists( $t ) { return in_array( $t, array( 'pa_color', 'pa_size', 'product_brand', 'product_cat' ), true ); }
function get_term_by( $f, $v, $t ) { $names = array( 'black' => 'Μαύρο', 'red' => 'Κόκκινο', '42' => '42', '43' => '43' ); return isset( $names[ $v ] ) ? (object) array( 'name' => $names[ $v ] ) : false; }
function wc_get_product_terms( $id, $t ) { return isset( $GLOBALS['terms'][ $id ][ $t ] ) ? $GLOBALS['terms'][ $id ][ $t ] : array(); }
function get_the_terms( $id, $t ) { return isset( $GLOBALS['terms'][ $id ][ $t ] ) ? array_map( function ( $n ) { return (object) array( 'name' => $n ); }, $GLOBALS['terms'][ $id ][ $t ] ) : false; }
function get_post_meta( $id, $k ) { return ''; }
function get_ancestors( $id ) { return 12 === $id ? array( 11, 10 ) : array(); }
function get_term( $id ) { $n = array( 10 => 'Γυναικεία', 11 => 'Παπούτσια', 12 => 'Sneakers &amp; αθλητικά', 20 => 'Ήχος' ); return isset( $n[ $id ] ) ? (object) array( 'name' => $n[ $id ] ) : null; }
function is_wp_error( $x ) { return false; }
function wc_get_product( $id ) { return isset( $GLOBALS['products'][ $id ] ) ? $GLOBALS['products'][ $id ] : false; }

class WC_Product_Attribute {
	public $n; public $o; public $tax; public $var;
	function __construct( $n, $o, $tax, $var ) { $this->n = $n; $this->o = $o; $this->tax = $tax; $this->var = $var; }
	function get_name() { return $this->n; } function get_options() { return $this->o; }
	function is_taxonomy() { return $this->tax; } function get_variation() { return $this->var; }
}

class Fake_Product {
	public $d;
	function __construct( array $d ) { $this->d = $d + array( 'status' => 'publish', 'visibility' => 'visible', 'type' => 'simple', 'children' => array(), 'meta' => array(), 'attrs' => array(), 'var_attrs' => array(), 'gallery' => array(), 'cats' => array(), 'sale' => '', 'stock' => true, 'gtin' => '', 'sku' => '', 'image' => 0, 'parent' => 0, 'short' => '', 'desc' => '' ); }
	function get_id() { return $this->d['id']; } function get_status() { return $this->d['status']; }
	function get_catalog_visibility() { return $this->d['visibility']; } function is_type( $t ) { return $this->d['type'] === $t; }
	function get_children() { return $this->d['children']; } function exists() { return true; }
	function get_price() { return '' !== $this->d['sale'] ? $this->d['sale'] : $this->d['price']; } function get_regular_price() { return $this->d['price']; }
	function is_on_sale() { return '' !== $this->d['sale']; } function is_in_stock() { return $this->d['stock']; }
	function get_image_id() { return $this->d['image']; } function get_gallery_image_ids() { return $this->d['gallery']; }
	function get_short_description() { return $this->d['short']; } function get_description() { return $this->d['desc']; }
	function get_name() { return $this->d['name']; } function get_permalink() { return 'https://shop.example/p/' . $this->d['id']; }
	function get_category_ids() { return $this->d['cats']; } function get_sku() { return $this->d['sku']; }
	function get_meta( $k ) { return isset( $this->d['meta'][ $k ] ) ? $this->d['meta'][ $k ] : ''; }
	function get_global_unique_id() { return $this->d['gtin']; } function get_parent_id() { return $this->d['parent']; }
	function get_attributes() { return $this->d['attrs']; } function get_variation_attributes( $prefix = true ) { return $this->d['var_attrs']; }
}

require dirname( __DIR__ ) . '/tagora/includes/class-tagora-catalog.php';

$fails = 0;
function check( $label, $got, $want ) {
	global $fails;
	$ok = $got === $want;
	if ( ! $ok ) { $fails++; }
	echo ( $ok ? 'ok   ' : 'FAIL ' ) . $label . ( $ok ? '' : ': got ' . var_export( $got, true ) . ', want ' . var_export( $want, true ) ) . "\n";
}

// A simple product on sale, EAN from WooCommerce's GTIN field, brand from product_brand.
$GLOBALS['terms'][1] = array( 'product_brand' => array( 'Sonaro' ) );
$GLOBALS['products'][1] = new Fake_Product( array( 'id' => 1, 'name' => 'Ακουστικά Sonaro Q40', 'price' => '120', 'sale' => '100', 'gtin' => '5209000000017', 'image' => 5, 'gallery' => array( 6, 7 ), 'cats' => array( 20 ), 'short' => '<p>Over-ear με <b>ακύρωση</b> θορύβου [gallery]</p>', 'meta' => array( '_mpn' => 'Q40-BLK' ) ) );
$items = Tagora_Catalog::items_for( $GLOBALS['products'][1] );
check( 'simple: one item', count( $items ), 1 );
check( 'simple: price incl. VAT', $items[0]['price'], 124.0 );
check( 'simple: old price', $items[0]['oldPrice'], 148.8 );
check( 'simple: EAN from GTIN field', $items[0]['gtin'], '5209000000017' );
check( 'simple: MPN from meta', $items[0]['mpn'], 'Q40-BLK' );
check( 'simple: brand from taxonomy', $items[0]['brand'], 'Sonaro' );
check( 'simple: category', $items[0]['category'], 'Ήχος' );
check( 'simple: plain description', $items[0]['description'], 'Over-ear με ακύρωση θορύβου' );
check( 'simple: images', $items[0]['images'], array( 'https://shop.example/img/6.jpg', 'https://shop.example/img/7.jpg' ) );

// A variable product: two enabled variations, one disabled; EAN from a plugin's meta key; colour + size.
$GLOBALS['terms'][2] = array( 'pa_color' => array( 'Κόκκινο' ), 'pa_size' => array( '42', '43' ) );
$GLOBALS['products'][2] = new Fake_Product( array( 'id' => 2, 'type' => 'variable', 'name' => 'Velto Aero Runner', 'price' => '', 'children' => array( 21, 22, 23 ), 'image' => 9, 'cats' => array( 12 ),
	'attrs' => array( new WC_Product_Attribute( 'pa_color', array(), true, false ), new WC_Product_Attribute( 'pa_size', array(), true, true ), new WC_Product_Attribute( 'Μάρκα', array( 'Velto' ), false, false ) ) ) );
$GLOBALS['products'][21] = new Fake_Product( array( 'id' => 21, 'type' => 'variation', 'parent' => 2, 'name' => 'x', 'price' => '80', 'var_attrs' => array( 'pa_size' => '42' ), 'meta' => array( '_alg_ean' => '5209000000062' ) ) );
$GLOBALS['products'][22] = new Fake_Product( array( 'id' => 22, 'type' => 'variation', 'parent' => 2, 'name' => 'x', 'price' => '80', 'var_attrs' => array( 'pa_size' => '43' ), 'stock' => false ) );
$GLOBALS['products'][23] = new Fake_Product( array( 'id' => 23, 'type' => 'variation', 'parent' => 2, 'name' => 'x', 'price' => '80', 'status' => 'private' ) );
$items = Tagora_Catalog::items_for( $GLOBALS['products'][2] );
check( 'variable: enabled variations only', array_column( $items, 'id' ), array( '21', '22' ) );
check( 'variable: grouped by parent', array_column( $items, 'groupId' ), array( '2', '2' ) );
check( 'variable: size from the variation', array_column( $items, 'size' ), array( '42', '43' ) );
check( 'variable: colour from the parent', $items[0]['color'], 'Κόκκινο' );
check( 'variable: brand from a custom attribute', $items[0]['brand'], 'Velto' );
check( 'variable: EAN from a plugin meta key', $items[0]['gtin'], '5209000000062' );
check( 'variable: stock', array_column( $items, 'inStock' ), array( true, false ) );
check( 'variable: category path', $items[0]['category'], 'Γυναικεία > Παπούτσια > Sneakers & αθλητικά' );
check( 'variable: parent image', $items[0]['image'], 'https://shop.example/img/9.jpg' );
check( 'variable: all ids', Tagora_Catalog::ids_for( $GLOBALS['products'][2] ), array( '2', '21', '22', '23' ) );

// Not sent: drafts, hidden, grouped.
check( 'draft', Tagora_Catalog::items_for( new Fake_Product( array( 'id' => 3, 'name' => 'd', 'price' => '1', 'status' => 'draft' ) ) ), array() );
check( 'hidden', Tagora_Catalog::items_for( new Fake_Product( array( 'id' => 4, 'name' => 'h', 'price' => '1', 'visibility' => 'hidden' ) ) ), array() );
check( 'grouped', Tagora_Catalog::items_for( new Fake_Product( array( 'id' => 5, 'name' => 'g', 'price' => '1', 'type' => 'grouped' ) ) ), array() );
// No price: sent as not in stock (Tagora leaves it out).
$np = Tagora_Catalog::items_for( new Fake_Product( array( 'id' => 6, 'name' => 'n', 'price' => '' ) ) );
check( 'no price: not in stock', $np[0]['inStock'], false );

echo $fails ? "\n$fails failed\n" : "\nall passed\n";
exit( $fails ? 1 : 0 );
