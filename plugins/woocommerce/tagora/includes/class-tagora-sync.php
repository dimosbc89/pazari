<?php
/**
 * Keeps Tagora up to date:
 * - every hour it says hello; when Tagora asks (new shop, approved, every 6 hours) it sends the
 *   whole catalogue, in the background, a page of products at a time (Action Scheduler);
 * - when a product is saved, sold out or deleted, it sends just that product.
 */

defined( 'ABSPATH' ) || exit;

class Tagora_Sync {

	const GROUP          = 'tagora';
	const PAGE_SIZE      = 50;   // products read per background step
	const IDS_OPTION     = 'tagora_sync_ids';
	const RUNNING_OPTION = 'tagora_sync_running';

	/** Products changed during this request, sent once at the end of it. */
	private static $changed = array();
	private static $removed = array();

	public static function init() {
		add_action( 'tagora_heartbeat', array( __CLASS__, 'heartbeat' ) );
		add_action( 'tagora_sync_page', array( __CLASS__, 'sync_page' ), 10, 2 );
		add_action( 'tagora_push_products', array( __CLASS__, 'push_products' ), 10, 2 );

		add_action( 'woocommerce_new_product', array( __CLASS__, 'changed' ) );
		add_action( 'woocommerce_update_product', array( __CLASS__, 'changed' ) );
		add_action( 'woocommerce_update_product_variation', array( __CLASS__, 'changed' ) );
		add_action( 'woocommerce_product_set_stock_status', array( __CLASS__, 'changed' ) );
		add_action( 'woocommerce_variation_set_stock_status', array( __CLASS__, 'changed' ) );
		add_action( 'wp_trash_post', array( __CLASS__, 'deleted' ) );
		add_action( 'before_delete_post', array( __CLASS__, 'deleted' ) );
		add_action( 'shutdown', array( __CLASS__, 'flush_changes' ) );

		add_action( 'init', array( __CLASS__, 'schedule' ) );
	}

	/** The hourly check, while a connection key is set. */
	public static function schedule() {
		if ( ! function_exists( 'as_has_scheduled_action' ) ) {
			return;
		}
		if ( Tagora_Api::is_connected() && ! as_has_scheduled_action( 'tagora_heartbeat', array(), self::GROUP ) ) {
			as_schedule_recurring_action( time() + 60, HOUR_IN_SECONDS, 'tagora_heartbeat', array(), self::GROUP );
		}
	}

	public static function unschedule_all() {
		if ( function_exists( 'as_unschedule_all_actions' ) ) {
			foreach ( array( 'tagora_heartbeat', 'tagora_sync_page', 'tagora_push_products' ) as $hook ) {
				as_unschedule_all_actions( $hook, null, self::GROUP );
			}
		}
		delete_option( self::RUNNING_OPTION );
		delete_option( self::IDS_OPTION );
	}

	public static function heartbeat() {
		$hello = Tagora_Api::hello();
		if ( is_wp_error( $hello ) ) {
			self::status( array( 'error' => $hello->get_error_message(), 'error_at' => time() ) );
			return;
		}
		update_option( 'tagora_shop', $hello['shop'] + array( 'dashboard' => $hello['dashboard'], 'checked_at' => time() ), false );
		self::status( array( 'error' => '' ) );
		if ( ! empty( $hello['fullSync'] ) ) {
			self::start_full_sync();
		}
	}

	// ------------------------------------------------------------------ full sync

	/** Starts sending the whole catalogue in the background. */
	public static function start_full_sync() {
		$running = get_option( self::RUNNING_OPTION );
		if ( is_array( $running ) && time() - $running['started'] < HOUR_IN_SECONDS ) {
			return $running['id']; // one at a time
		}
		$sync_id = wp_generate_uuid4();
		update_option( self::RUNNING_OPTION, array( 'id' => $sync_id, 'started' => time() ), false );
		update_option( self::IDS_OPTION, array(), false );
		self::status( array( 'running' => true, 'error' => '', 'sent' => 0 ) );
		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action( 'tagora_sync_page', array( $sync_id, 1 ), self::GROUP );
		} else {
			self::sync_page( $sync_id, 1 );
		}
		return $sync_id;
	}

	/** Sends the whole catalogue now, in this request (for WP-CLI). Returns Tagora's result. */
	public static function full_sync_now() {
		delete_option( self::RUNNING_OPTION );
		$sync_id = wp_generate_uuid4();
		update_option( self::RUNNING_OPTION, array( 'id' => $sync_id, 'started' => time() ), false );
		update_option( self::IDS_OPTION, array(), false );
		$page = 1;
		do {
			$more = self::send_page( $sync_id, $page++ );
			if ( is_wp_error( $more ) ) {
				self::abort( $more );
				return $more;
			}
		} while ( $more );
		return self::finish( $sync_id );
	}

	/** One background step: a page of products, then schedules the next page or the finish. */
	public static function sync_page( $sync_id, $page ) {
		$running = get_option( self::RUNNING_OPTION );
		if ( ! is_array( $running ) || $running['id'] !== $sync_id ) {
			return; // replaced or cancelled
		}
		$more = self::send_page( $sync_id, (int) $page );
		if ( is_wp_error( $more ) ) {
			self::abort( $more );
			return;
		}
		if ( $more && function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action( 'tagora_sync_page', array( $sync_id, (int) $page + 1 ), self::GROUP );
		} elseif ( $more ) {
			self::sync_page( $sync_id, (int) $page + 1 );
		} else {
			self::finish( $sync_id );
		}
	}

	/** @return bool|WP_Error true when there are more pages */
	private static function send_page( $sync_id, $page ) {
		$products = wc_get_products(
			array(
				'status'  => 'publish',
				'type'    => array( 'simple', 'variable', 'external' ),
				'limit'   => self::PAGE_SIZE,
				'page'    => $page,
				'orderby' => 'ID',
				'order'   => 'ASC',
			)
		);
		$items = array();
		$ids   = get_option( self::IDS_OPTION, array() );
		foreach ( $products as $product ) {
			foreach ( Tagora_Catalog::items_for( $product ) as $item ) {
				$items[] = $item;
				$ids[]   = $item['id'];
			}
		}
		foreach ( array_chunk( $items, 200 ) as $chunk ) {
			$result = Tagora_Api::post( '/plugin/products', array( 'syncId' => $sync_id, 'items' => $chunk ) );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		update_option( self::IDS_OPTION, $ids, false );
		self::status( array( 'sent' => count( $ids ) ) );
		return count( $products ) === self::PAGE_SIZE;
	}

	private static function finish( $sync_id ) {
		$ids    = get_option( self::IDS_OPTION, array() );
		$result = empty( $ids )
			? new WP_Error( 'tagora_no_products', __( 'No published products to send.', 'tagora' ) )
			: Tagora_Api::post( '/plugin/finish', array( 'syncId' => $sync_id, 'ids' => array_values( array_unique( $ids ) ) ) );
		delete_option( self::RUNNING_OPTION );
		delete_option( self::IDS_OPTION );
		if ( is_wp_error( $result ) ) {
			self::abort( $result );
			return $result;
		}
		self::status( array( 'running' => false, 'last_full_sync' => time(), 'result' => $result['result'], 'error' => '' ) );
		return $result['result'];
	}

	private static function abort( WP_Error $error ) {
		delete_option( self::RUNNING_OPTION );
		delete_option( self::IDS_OPTION );
		self::status( array( 'running' => false, 'error' => $error->get_error_message(), 'error_at' => time() ) );
	}

	// ------------------------------------------------------------------ one product at a time

	public static function changed( $id ) {
		if ( Tagora_Api::is_connected() ) {
			$product = wc_get_product( $id );
			if ( $product && $product->is_type( 'variation' ) ) {
				$id = $product->get_parent_id();
			}
			self::$changed[ (int) $id ] = true;
		}
	}

	public static function deleted( $post_id ) {
		if ( ! Tagora_Api::is_connected() ) {
			return;
		}
		$type = get_post_type( $post_id );
		if ( 'product' === $type || 'product_variation' === $type ) {
			$product = wc_get_product( $post_id );
			foreach ( $product ? Tagora_Catalog::ids_for( $product ) : array( (string) $post_id ) as $id ) {
				self::$removed[ $id ] = true;
			}
			unset( self::$changed[ (int) $post_id ] );
		}
	}

	/** At the end of the request: send the changes in the background. */
	public static function flush_changes() {
		if ( ! self::$changed && ! self::$removed ) {
			return;
		}
		$changed = array_map( 'intval', array_keys( self::$changed ) );
		$removed = array_map( 'strval', array_keys( self::$removed ) );
		self::$changed = array();
		self::$removed = array();
		if ( function_exists( 'as_enqueue_async_action' ) ) {
			as_enqueue_async_action( 'tagora_push_products', array( $changed, $removed ), self::GROUP );
		} else {
			self::push_products( $changed, $removed );
		}
	}

	/** Sends the current state of these products; removes the ones no longer on sale. */
	public static function push_products( $product_ids, $removed = array() ) {
		$items  = array();
		$remove = array_map( 'strval', (array) $removed );
		foreach ( (array) $product_ids as $id ) {
			$product = wc_get_product( $id );
			if ( ! $product ) {
				$remove[] = (string) $id;
				continue;
			}
			$product_items = Tagora_Catalog::items_for( $product );
			$sent          = wp_list_pluck( $product_items, 'id' );
			foreach ( Tagora_Catalog::ids_for( $product ) as $known ) {
				if ( ! in_array( $known, $sent, true ) ) {
					$remove[] = $known; // draft, hidden, or a variation that was switched off
				}
			}
			$items = array_merge( $items, $product_items );
		}
		foreach ( array_chunk( $items, 200 ) as $i => $chunk ) {
			$result = Tagora_Api::post( '/plugin/products', array( 'items' => $chunk, 'remove' => 0 === $i ? array_values( array_unique( $remove ) ) : array() ) );
			if ( is_wp_error( $result ) ) {
				self::status( array( 'error' => $result->get_error_message(), 'error_at' => time() ) );
				return;
			}
		}
		if ( ! $items && $remove ) {
			Tagora_Api::post( '/plugin/products', array( 'items' => array(), 'remove' => array_values( array_unique( $remove ) ) ) );
		}
		self::status( array( 'last_push' => time() ) );
	}

	// ------------------------------------------------------------------ status shown on the settings page

	public static function status( $changes = null ) {
		$status = get_option( 'tagora_status', array() );
		$status = is_array( $status ) ? $status : array();
		if ( null !== $changes ) {
			$status = array_merge( $status, $changes );
			update_option( 'tagora_status', $status, false );
		}
		return $status;
	}
}
