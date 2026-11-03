<?php
/**
 * WP-CLI: wp tagora connect <key> | sync | status
 */

defined( 'ABSPATH' ) || exit;

class Tagora_CLI {

	/**
	 * Connects the shop with its Tagora connection key.
	 *
	 * ## OPTIONS
	 *
	 * <key>
	 * : The connection key from the Tagora dashboard (tgr_…).
	 */
	public function connect( $args ) {
		$hello = Tagora_Api::hello( $args[0] );
		if ( is_wp_error( $hello ) ) {
			WP_CLI::error( $hello->get_error_message() );
		}
		update_option( 'tagora_key', $args[0], false );
		update_option( 'tagora_shop', $hello['shop'] + array( 'dashboard' => $hello['dashboard'], 'checked_at' => time() ), false );
		Tagora_Sync::schedule();
		WP_CLI::success( sprintf( 'Connected as "%s" (%s).', $hello['shop']['name'], $hello['shop']['status'] ) );
	}

	/**
	 * Sends the whole catalogue to Tagora now.
	 */
	public function sync() {
		$result = Tagora_Sync::full_sync_now();
		if ( is_wp_error( $result ) ) {
			WP_CLI::error( $result->get_error_message() );
		}
		WP_CLI::success( sprintf( '%d sent, %d on Tagora, %d left out, %d removed.', $result['found'], $result['imported'], $result['skipped'], $result['removed'] ) );
		foreach ( (array) $result['issues'] as $issue ) {
			WP_CLI::log( sprintf( '  %s: %d', $issue['code'], $issue['count'] ) );
		}
	}

	/**
	 * Shows the connection and the last sync.
	 */
	public function status() {
		WP_CLI::log( wp_json_encode( array( 'connected' => Tagora_Api::is_connected(), 'shop' => get_option( 'tagora_shop' ), 'status' => Tagora_Sync::status() ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) );
	}
}
