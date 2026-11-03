<?php
/**
 * Plugin Name:       Tagora for WooCommerce
 * Plugin URI:        https://tagora.online/gr/pages/shop-help
 * Description:       Sends your products to Tagora, the Greek price comparison site, and keeps them up to date automatically.
 * Version:           1.0.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            Tagora
 * Author URI:        https://tagora.online
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       tagora
 * Domain Path:       /languages
 * WC requires at least: 7.0
 * WC tested up to:   10.3
 */

defined( 'ABSPATH' ) || exit;

define( 'TAGORA_VERSION', '1.0.0' );
define( 'TAGORA_FILE', __FILE__ );
define( 'TAGORA_DIR', plugin_dir_path( __FILE__ ) );
// Where products are sent. Can be overridden in wp-config.php (for testing).
if ( ! defined( 'TAGORA_API' ) ) {
	define( 'TAGORA_API', 'https://tagora.online/api' );
}

require_once TAGORA_DIR . 'includes/class-tagora-api.php';
require_once TAGORA_DIR . 'includes/class-tagora-catalog.php';
require_once TAGORA_DIR . 'includes/class-tagora-sync.php';
require_once TAGORA_DIR . 'includes/class-tagora-admin.php';

// The plugin reads products only; it works with WooCommerce's order tables (HPOS).
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', TAGORA_FILE, true );
		}
	}
);

add_action(
	'init',
	function () {
		load_plugin_textdomain( 'tagora', false, dirname( plugin_basename( TAGORA_FILE ) ) . '/languages' );
	}
);

add_action(
	'plugins_loaded',
	function () {
		if ( ! class_exists( 'WooCommerce' ) ) {
			add_action(
				'admin_notices',
				function () {
					echo '<div class="notice notice-error"><p>' . esc_html__( 'Tagora for WooCommerce needs WooCommerce to be installed and active.', 'tagora' ) . '</p></div>';
				}
			);
			return;
		}
		Tagora_Sync::init();
		Tagora_Admin::init();
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			require_once TAGORA_DIR . 'includes/class-tagora-cli.php';
			WP_CLI::add_command( 'tagora', 'Tagora_CLI' );
		}
	}
);

register_deactivation_hook( __FILE__, array( 'Tagora_Sync', 'unschedule_all' ) );
