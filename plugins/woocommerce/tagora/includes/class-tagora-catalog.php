<?php
/**
 * Turns WooCommerce products into the items Tagora expects. One item per simple product,
 * one per variation of a variable product (grouped by the parent).
 */

defined( 'ABSPATH' ) || exit;

class Tagora_Catalog {

	/** Meta keys where popular plugins keep the barcode (EAN/GTIN), checked in this order. */
	const EAN_KEYS = array( '_ean', 'ean', '_gtin', 'gtin', '_barcode', 'barcode', '_alg_ean', '_wpm_gtin_code', 'hwp_product_gtin', 'hwp_var_gtin', '_ts_gtin', '_woosea_ean', '_woosea_gtin', '_cpf_ean', '_wc_gtin' );
	/** Meta keys for the manufacturer's part number (MPN). */
	const MPN_KEYS = array( '_mpn', 'mpn', '_woosea_mpn', 'hwp_product_mpn', 'hwp_var_mpn', '_ts_mpn', '_wpm_mpn', '_cpf_mpn' );
	/** Taxonomies used for brands by WooCommerce and popular brand plugins. */
	const BRAND_TAXONOMIES = array( 'product_brand', 'pwb-brand', 'yith_product_brand', 'berocket_brand', 'brand' );

	const COLOR = '/colou?r|χρώμα|χρωμα|xroma|chroma/iu';
	const SIZE  = '/size|μέγεθος|μεγεθος|νούμερο|νουμερο|megethos|noumero/iu';
	const BRAND = '/brand|μάρκα|μαρκα|κατασκευαστ|marka|manufacturer/iu';

	/** Settings from the plugin page (meta key overrides). */
	private static function setting( $name ) {
		$settings = get_option( 'tagora_settings', array() );
		return is_array( $settings ) && isset( $settings[ $name ] ) ? $settings[ $name ] : '';
	}

	/**
	 * Items for one product. A variable product gives one item per enabled variation.
	 * Products that should not be on Tagora (drafts, hidden, private) give none.
	 *
	 * @param WC_Product $product
	 * @return array[]
	 */
	public static function items_for( $product ) {
		if ( ! $product || 'publish' !== $product->get_status() || 'hidden' === $product->get_catalog_visibility() ) {
			return array();
		}
		if ( $product->is_type( 'variable' ) ) {
			$items = array();
			foreach ( $product->get_children() as $variation_id ) {
				$variation = wc_get_product( $variation_id );
				if ( $variation && $variation->exists() && 'publish' === $variation->get_status() ) {
					$items[] = self::item( $variation, $product );
				}
			}
			return $items;
		}
		if ( $product->is_type( 'grouped' ) ) {
			return array(); // a grouped product only lists other products, which are sent on their own
		}
		return array( self::item( $product, $product ) );
	}

	/** Every id Tagora knows for a product: the product itself and all its variations. */
	public static function ids_for( $product ) {
		$ids = array( (string) $product->get_id() );
		if ( $product->is_type( 'variable' ) ) {
			foreach ( $product->get_children() as $id ) {
				$ids[] = (string) $id;
			}
		}
		return $ids;
	}

	/**
	 * @param WC_Product $p      the product or variation
	 * @param WC_Product $parent the product itself, or the variable product of a variation
	 */
	private static function item( $p, $parent ) {
		$is_variation = $p->get_id() !== $parent->get_id();
		$price        = (float) wc_get_price_including_tax( $p, array( 'price' => $p->get_price() ) );
		$regular      = (float) wc_get_price_including_tax( $p, array( 'price' => $p->get_regular_price() ) );
		$attributes   = self::attributes( $p, $parent );

		$image_id = $p->get_image_id() ? $p->get_image_id() : $parent->get_image_id();
		$images   = array();
		foreach ( $parent->get_gallery_image_ids() as $id ) {
			$url = wp_get_attachment_image_url( $id, 'full' );
			if ( $url ) {
				$images[] = $url;
			}
		}
		$description = $parent->get_short_description() ? $parent->get_short_description() : $parent->get_description();
		if ( $is_variation && $p->get_description() ) {
			$description = $p->get_description();
		}

		$item = array(
			'id'          => (string) $p->get_id(),
			'groupId'     => (string) $parent->get_id(),
			'title'       => wp_strip_all_tags( $parent->get_name() ),
			'description' => self::plain( $description ),
			'url'         => $p->get_permalink(),
			'image'       => $image_id ? (string) wp_get_attachment_image_url( $image_id, 'full' ) : '',
			'images'      => array_slice( $images, 0, 8 ),
			'price'       => round( $price, 2 ),
			'brand'       => self::brand( $parent, $attributes ),
			'category'    => self::category( $parent ),
			'color'       => self::pick( $attributes, self::COLOR ),
			'size'        => self::pick( $attributes, self::SIZE ),
			'gtin'        => self::ean( $p, $parent ),
			'mpn'         => self::mpn( $p, $parent ),
			'inStock'     => $p->is_in_stock() && '' !== $p->get_price(),
		);
		if ( $p->is_on_sale() && $regular > $price ) {
			$item['oldPrice'] = round( $regular, 2 );
		}
		return array_filter(
			$item,
			function ( $v ) {
				return '' !== $v && null !== $v && array() !== $v;
			}
		);
	}

	/** Attribute label => value names, e.g. ["Χρώμα" => "Μαύρο", "Μέγεθος" => "42"]. */
	private static function attributes( $p, $parent ) {
		$out = array();
		if ( $p->is_type( 'variation' ) ) {
			foreach ( $p->get_variation_attributes( false ) as $taxonomy => $value ) {
				if ( '' === $value ) {
					continue; // "any" value
				}
				$label = wc_attribute_label( $taxonomy, $parent );
				if ( taxonomy_exists( $taxonomy ) ) {
					$term  = get_term_by( 'slug', $value, $taxonomy );
					$value = $term ? $term->name : $value;
				}
				$out[ $label ] = $value;
			}
		}
		foreach ( $parent->get_attributes() as $attribute ) {
			if ( ! is_a( $attribute, 'WC_Product_Attribute' ) ) {
				continue;
			}
			$label = wc_attribute_label( $attribute->get_name(), $parent );
			if ( isset( $out[ $label ] ) || ( $p->is_type( 'variation' ) && $attribute->get_variation() ) ) {
				continue;
			}
			$values = $attribute->is_taxonomy()
				? wc_get_product_terms( $parent->get_id(), $attribute->get_name(), array( 'fields' => 'names' ) )
				: $attribute->get_options();
			if ( $values ) {
				$out[ $label ] = implode( ', ', array_slice( $values, 0, 3 ) );
			}
		}
		return $out;
	}

	private static function pick( array $attributes, $pattern ) {
		foreach ( $attributes as $label => $value ) {
			if ( preg_match( $pattern, $label ) ) {
				return (string) $value;
			}
		}
		return '';
	}

	private static function brand( $parent, array $attributes ) {
		$taxonomies = self::BRAND_TAXONOMIES;
		$custom     = self::setting( 'brand_taxonomy' );
		if ( $custom ) {
			array_unshift( $taxonomies, $custom );
		}
		foreach ( $taxonomies as $taxonomy ) {
			if ( ! taxonomy_exists( $taxonomy ) ) {
				continue;
			}
			$terms = get_the_terms( $parent->get_id(), $taxonomy );
			if ( is_array( $terms ) && $terms ) {
				return $terms[0]->name;
			}
		}
		return self::pick( $attributes, self::BRAND );
	}

	/** "Women > Shoes > Sneakers": the main (or first) category and its parents. */
	private static function category( $parent ) {
		$ids     = $parent->get_category_ids();
		$primary = (int) get_post_meta( $parent->get_id(), '_yoast_wpseo_primary_product_cat', true );
		$id      = $primary && in_array( $primary, $ids, true ) ? $primary : ( $ids ? (int) $ids[0] : 0 );
		if ( ! $id ) {
			return '';
		}
		$names = array();
		foreach ( array_reverse( get_ancestors( $id, 'product_cat', 'taxonomy' ) ) as $ancestor ) {
			$term = get_term( $ancestor, 'product_cat' );
			if ( $term && ! is_wp_error( $term ) ) {
				$names[] = $term->name;
			}
		}
		$term = get_term( $id, 'product_cat' );
		if ( $term && ! is_wp_error( $term ) ) {
			$names[] = $term->name;
		}
		return html_entity_decode( implode( ' > ', $names ), ENT_QUOTES, 'UTF-8' );
	}

	private static function ean( $p, $parent ) {
		$keys   = self::EAN_KEYS;
		$custom = self::setting( 'ean_meta' );
		if ( $custom ) {
			array_unshift( $keys, $custom );
		}
		foreach ( array( $p, $parent ) as $product ) {
			if ( method_exists( $product, 'get_global_unique_id' ) && $product->get_global_unique_id() ) {
				return (string) $product->get_global_unique_id();
			}
			foreach ( $keys as $key ) {
				$value = trim( (string) $product->get_meta( $key, true ) );
				if ( '' !== $value ) {
					return $value;
				}
			}
			if ( $product->get_id() === $parent->get_id() ) {
				break;
			}
		}
		return '';
	}

	private static function mpn( $p, $parent ) {
		$keys   = self::MPN_KEYS;
		$custom = self::setting( 'mpn_meta' );
		if ( $custom ) {
			array_unshift( $keys, $custom );
		}
		foreach ( $keys as $key ) {
			$value = trim( (string) $p->get_meta( $key, true ) );
			if ( '' === $value && $p->get_id() !== $parent->get_id() ) {
				$value = trim( (string) $parent->get_meta( $key, true ) );
			}
			if ( '' !== $value ) {
				return $value;
			}
		}
		return self::setting( 'sku_as_mpn' ) ? (string) $p->get_sku() : '';
	}

	private static function plain( $html ) {
		$text = wp_strip_all_tags( strip_shortcodes( (string) $html ) );
		$text = trim( preg_replace( '/\s+/u', ' ', html_entity_decode( $text, ENT_QUOTES, 'UTF-8' ) ) );
		return function_exists( 'mb_substr' ) ? mb_substr( $text, 0, 5000 ) : substr( $text, 0, 5000 );
	}
}
