<?php
/**
 * Removes the plugin's settings and scheduled tasks. Products already on Tagora stay there
 * until the shop is paused or removed on Tagora.
 */

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

foreach ( array( 'tagora_key', 'tagora_shop', 'tagora_status', 'tagora_settings', 'tagora_sync_ids', 'tagora_sync_running' ) as $option ) {
	delete_option( $option );
}
if ( function_exists( 'as_unschedule_all_actions' ) ) {
	foreach ( array( 'tagora_heartbeat', 'tagora_sync_page', 'tagora_push_products' ) as $hook ) {
		as_unschedule_all_actions( $hook, null, 'tagora' );
	}
}
