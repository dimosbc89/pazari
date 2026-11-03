<?php
/**
 * Test products, made with WooCommerce's own classes (like saving in WP-Admin).
 * Run: wp eval-file setup-products.php  → prints the ids as JSON.
 */

$cat = wp_insert_term( 'Ήχος', 'product_cat' );
$cat = is_wp_error( $cat ) ? (int) $cat->get_error_data()['term_id'] : (int) $cat['term_id'];

// Sale price, WooCommerce's GTIN field, WooCommerce Brands, a category.
$sonaro = new WC_Product_Simple();
$sonaro->set_name( 'Ακουστικά Sonaro Q40' );
$sonaro->set_status( 'publish' );
$sonaro->set_regular_price( '129' );
$sonaro->set_sale_price( '109' );
$sonaro->set_short_description( '<p>Over-ear με <b>ακύρωση θορύβου</b>.</p>' );
$sonaro->set_category_ids( array( $cat ) );
if ( method_exists( $sonaro, 'set_global_unique_id' ) ) {
	$sonaro->set_global_unique_id( '5209000000017' );
}
$sonaro->save();
if ( taxonomy_exists( 'product_brand' ) ) {
	wp_set_object_terms( $sonaro->get_id(), 'Sonaro', 'product_brand' );
}

// EAN and MPN in plugin meta fields; brand and colour as attributes.
$attr = function ( $name, $options, $variation = false ) {
	$a = new WC_Product_Attribute();
	$a->set_name( $name );
	$a->set_options( $options );
	$a->set_visible( true );
	$a->set_variation( $variation );
	return $a;
};
$lumo = new WC_Product_Simple();
$lumo->set_name( 'Φωτιστικό Lumo Arc' );
$lumo->set_status( 'publish' );
$lumo->set_regular_price( '49.90' );
$lumo->set_attributes( array( $attr( 'Μάρκα', array( 'Lumo' ) ), $attr( 'Χρώμα', array( 'Κόκκινο' ) ) ) );
$lumo->update_meta_data( '_ean', '5209000000031' );
$lumo->update_meta_data( '_mpn', 'ARC-RED' );
$lumo->save();

// A variable product with two sizes.
$velto = new WC_Product_Variable();
$velto->set_name( 'Αθλητικά Velto Aero' );
$velto->set_status( 'publish' );
$velto->set_attributes( array( $attr( 'Μέγεθος', array( '42', '43' ), true ), $attr( 'Brand', array( 'Velto' ) ) ) );
$velto->save();
$variations = array();
foreach ( array( '42' => '5209000000062', '43' => '' ) as $size => $ean ) {
	$v = new WC_Product_Variation();
	$v->set_parent_id( $velto->get_id() );
	$v->set_attributes( array( sanitize_title( 'Μέγεθος' ) => $size ) );
	$v->set_regular_price( '80' );
	$v->set_status( 'publish' );
	if ( $ean ) {
		$v->update_meta_data( '_ean', $ean );
	}
	$v->save();
	$variations[ $size ] = $v->get_id();
}
WC_Product_Variable::sync( $velto->get_id() );

// Not sent: a draft. Sent but left out by Tagora: a sold-out product.
$draft = new WC_Product_Simple();
$draft->set_name( 'Πρόχειρο' );
$draft->set_status( 'draft' );
$draft->set_regular_price( '10' );
$draft->save();
$sold = new WC_Product_Simple();
$sold->set_name( 'Εξαντλημένο' );
$sold->set_status( 'publish' );
$sold->set_regular_price( '15' );
$sold->set_stock_status( 'outofstock' );
$sold->save();

echo wp_json_encode(
	array(
		'sonaro' => $sonaro->get_id(),
		'lumo'   => $lumo->get_id(),
		'velto'  => $velto->get_id(),
		'v42'    => $variations['42'],
		'v43'    => $variations['43'],
		'sold'   => $sold->get_id(),
	)
);
