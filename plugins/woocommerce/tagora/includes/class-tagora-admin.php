<?php
/**
 * WooCommerce → Tagora: connect with the key from the Tagora dashboard, see the last sync,
 * sync now, and a few advanced settings.
 */

defined( 'ABSPATH' ) || exit;

class Tagora_Admin {

	const SIGNUP = 'https://tagora.online/gr/shops?source=plugin';
	const HELP   = 'https://tagora.online/gr/pages/shop-help';

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_post_tagora_connect', array( __CLASS__, 'connect' ) );
		add_action( 'admin_post_tagora_disconnect', array( __CLASS__, 'disconnect' ) );
		add_action( 'admin_post_tagora_sync', array( __CLASS__, 'sync' ) );
		add_action( 'admin_post_tagora_settings', array( __CLASS__, 'save_settings' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( TAGORA_FILE ), array( __CLASS__, 'links' ) );
	}

	public static function menu() {
		add_submenu_page( 'woocommerce', 'Tagora', 'Tagora', 'manage_woocommerce', 'tagora', array( __CLASS__, 'page' ) );
	}

	public static function links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'admin.php?page=tagora' ) ) . '">' . esc_html__( 'Settings', 'tagora' ) . '</a>' );
		return $links;
	}

	private static function back( $notice, $type = 'success' ) {
		set_transient( 'tagora_notice_' . get_current_user_id(), array( $notice, $type ), 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=tagora' ) );
		exit;
	}

	private static function guard( $action ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'tagora' ) );
		}
		check_admin_referer( $action );
	}

	public static function connect() {
		self::guard( 'tagora_connect' );
		$key = isset( $_POST['tagora_key'] ) ? trim( sanitize_text_field( wp_unslash( $_POST['tagora_key'] ) ) ) : '';
		if ( ! preg_match( '/^tgr_[0-9a-f]{48}$/', $key ) ) {
			self::back( __( 'This does not look like a Tagora connection key. Copy it again from your Tagora dashboard (it starts with tgr_).', 'tagora' ), 'error' );
		}
		$hello = Tagora_Api::hello( $key );
		if ( is_wp_error( $hello ) ) {
			self::back( $hello->get_error_message(), 'error' );
		}
		update_option( 'tagora_key', $key, false );
		update_option( 'tagora_shop', $hello['shop'] + array( 'dashboard' => $hello['dashboard'], 'checked_at' => time() ), false );
		Tagora_Sync::schedule();
		Tagora_Sync::start_full_sync();
		/* translators: %s: shop name on Tagora */
		self::back( sprintf( __( 'Connected as “%s”. Your products are being sent to Tagora in the background.', 'tagora' ), $hello['shop']['name'] ) );
	}

	public static function disconnect() {
		self::guard( 'tagora_disconnect' );
		Tagora_Sync::unschedule_all();
		delete_option( 'tagora_key' );
		delete_option( 'tagora_shop' );
		delete_option( 'tagora_status' );
		self::back( __( 'Disconnected. Your products stay on Tagora until the shop is paused there.', 'tagora' ) );
	}

	public static function sync() {
		self::guard( 'tagora_sync' );
		Tagora_Sync::start_full_sync();
		self::back( __( 'Sync started. It runs in the background; refresh this page in a minute.', 'tagora' ) );
	}

	public static function save_settings() {
		self::guard( 'tagora_settings' );
		$clean = function ( $name ) {
			return isset( $_POST[ $name ] ) ? sanitize_key( wp_unslash( $_POST[ $name ] ) ) : '';
		};
		update_option(
			'tagora_settings',
			array(
				'ean_meta'       => $clean( 'ean_meta' ),
				'mpn_meta'       => $clean( 'mpn_meta' ),
				'brand_taxonomy' => $clean( 'brand_taxonomy' ),
				'sku_as_mpn'     => ! empty( $_POST['sku_as_mpn'] ),
			),
			false
		);
		self::back( __( 'Settings saved. They apply from the next sync.', 'tagora' ) );
	}

	private static function when( $timestamp ) {
		/* translators: %s: time ago, e.g. "5 mins" */
		return $timestamp ? sprintf( __( '%s ago', 'tagora' ), human_time_diff( (int) $timestamp ) ) : '–';
	}

	private static function issue_label( $code ) {
		$labels = array(
			'missing_title'      => __( 'without a title', 'tagora' ),
			'missing_price'      => __( 'without a price', 'tagora' ),
			'missing_link'       => __( 'without a link', 'tagora' ),
			'out_of_stock'       => __( 'sold out (not shown)', 'tagora' ),
			'duplicate_id'       => __( 'duplicates', 'tagora' ),
			'missing_image'      => __( 'without an image', 'tagora' ),
			'missing_brand'      => __( 'without a brand', 'tagora' ),
			'missing_identifier' => __( 'without a barcode (EAN) or MPN: not in price comparisons', 'tagora' ),
		);
		return isset( $labels[ $code ] ) ? $labels[ $code ] : $code;
	}

	public static function page() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}
		$notice = get_transient( 'tagora_notice_' . get_current_user_id() );
		delete_transient( 'tagora_notice_' . get_current_user_id() );
		$shop     = get_option( 'tagora_shop', array() );
		$status   = Tagora_Sync::status();
		$settings = wp_parse_args( get_option( 'tagora_settings', array() ), array( 'ean_meta' => '', 'mpn_meta' => '', 'brand_taxonomy' => '', 'sku_as_mpn' => false ) );
		$statuses = array(
			'pending' => __( 'Waiting for approval: your products will appear on Tagora once the shop is approved.', 'tagora' ),
			'active'  => __( 'Active: your products are on Tagora.', 'tagora' ),
			'paused'  => __( 'Paused on Tagora.', 'tagora' ),
		);
		?>
		<div class="wrap tagora">
			<h1>Tagora</h1>
			<p><?php esc_html_e( 'Tagora is a Greek price comparison site. This plugin sends your products to it and keeps them up to date: prices, stock and new products, automatically.', 'tagora' ); ?></p>
			<?php if ( $notice ) : ?>
				<div class="notice notice-<?php echo esc_attr( 'error' === $notice[1] ? 'error' : 'success' ); ?> is-dismissible"><p><?php echo esc_html( $notice[0] ); ?></p></div>
			<?php endif; ?>

			<?php if ( ! Tagora_Api::is_connected() ) : ?>
				<h2><?php esc_html_e( 'Connect your shop', 'tagora' ); ?></h2>
				<ol>
					<li>
						<?php
						printf(
							/* translators: %s: link to the Tagora sign-up page */
							esc_html__( 'Apply on Tagora, choosing “WooCommerce plugin”: %s', 'tagora' ),
							'<a href="' . esc_url( self::SIGNUP ) . '" target="_blank" rel="noopener">tagora.online/gr/shops</a>'
						);
						?>
					</li>
					<li><?php esc_html_e( 'Copy the connection key shown after you apply (also in your Tagora dashboard).', 'tagora' ); ?></li>
					<li><?php esc_html_e( 'Paste it here and press Connect.', 'tagora' ); ?></li>
				</ol>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="tagora_connect">
					<?php wp_nonce_field( 'tagora_connect' ); ?>
					<p>
						<label for="tagora_key"><strong><?php esc_html_e( 'Connection key', 'tagora' ); ?></strong></label><br>
						<input type="text" id="tagora_key" name="tagora_key" class="regular-text code" placeholder="tgr_…" autocomplete="off" required>
					</p>
					<?php submit_button( __( 'Connect', 'tagora' ) ); ?>
				</form>
			<?php else : ?>
				<h2><?php echo esc_html( isset( $shop['name'] ) ? $shop['name'] : 'Tagora' ); ?></h2>
				<p><strong><?php echo esc_html( isset( $shop['status'], $statuses[ $shop['status'] ] ) ? $statuses[ $shop['status'] ] : '' ); ?></strong></p>
				<table class="widefat striped" style="max-width:720px">
					<tbody>
						<tr><td><?php esc_html_e( 'Products on Tagora', 'tagora' ); ?></td><td><?php echo esc_html( isset( $shop['productCount'] ) ? number_format_i18n( (int) $shop['productCount'] ) : '–' ); ?></td></tr>
						<tr><td><?php esc_html_e( 'Last full sync', 'tagora' ); ?></td><td><?php echo esc_html( ! empty( $status['running'] ) ? __( 'Running now…', 'tagora' ) : self::when( isset( $status['last_full_sync'] ) ? $status['last_full_sync'] : 0 ) ); ?></td></tr>
						<tr><td><?php esc_html_e( 'Last product update sent', 'tagora' ); ?></td><td><?php echo esc_html( self::when( isset( $status['last_push'] ) ? $status['last_push'] : 0 ) ); ?></td></tr>
						<?php if ( ! empty( $status['result'] ) ) : ?>
							<tr>
								<td><?php esc_html_e( 'Result', 'tagora' ); ?></td>
								<td>
									<?php
									/* translators: 1: products sent, 2: products accepted */
									echo esc_html( sprintf( __( '%1$s sent, %2$s on Tagora', 'tagora' ), number_format_i18n( (int) $status['result']['found'] ), number_format_i18n( (int) $status['result']['imported'] ) ) );
									?>
									<?php if ( ! empty( $status['result']['issues'] ) ) : ?>
										<ul style="margin:6px 0 0 18px;list-style:disc">
											<?php foreach ( $status['result']['issues'] as $issue ) : ?>
												<li><?php echo esc_html( number_format_i18n( (int) $issue['count'] ) . ' ' . self::issue_label( $issue['code'] ) ); ?></li>
											<?php endforeach; ?>
										</ul>
									<?php endif; ?>
								</td>
							</tr>
						<?php endif; ?>
						<?php if ( ! empty( $status['error'] ) ) : ?>
							<tr><td><?php esc_html_e( 'Problem', 'tagora' ); ?></td><td style="color:#b32d2e"><?php echo esc_html( $status['error'] ); ?></td></tr>
						<?php endif; ?>
					</tbody>
				</table>
				<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
						<input type="hidden" name="action" value="tagora_sync">
						<?php wp_nonce_field( 'tagora_sync' ); ?>
						<?php submit_button( __( 'Sync now', 'tagora' ), 'primary', 'submit', false ); ?>
					</form>
					<?php if ( ! empty( $shop['dashboard'] ) ) : ?>
						<a class="button" href="<?php echo esc_url( $shop['dashboard'] ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Open your Tagora dashboard', 'tagora' ); ?></a>
					<?php endif; ?>
					<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('<?php echo esc_js( __( 'Disconnect from Tagora?', 'tagora' ) ); ?>')">
						<input type="hidden" name="action" value="tagora_disconnect">
						<?php wp_nonce_field( 'tagora_disconnect' ); ?>
						<?php submit_button( __( 'Disconnect', 'tagora' ), 'secondary', 'submit', false ); ?>
					</form>
				</div>
			<?php endif; ?>

			<h2><?php esc_html_e( 'Advanced', 'tagora' ); ?></h2>
			<p><?php esc_html_e( 'The plugin finds barcodes (EAN), MPN and brands from WooCommerce and the most common plugins. Fill these in only if yours are kept elsewhere.', 'tagora' ); ?></p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="tagora_settings">
				<?php wp_nonce_field( 'tagora_settings' ); ?>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="ean_meta"><?php esc_html_e( 'Barcode (EAN) meta key', 'tagora' ); ?></label></th>
						<td><input type="text" id="ean_meta" name="ean_meta" class="regular-text code" value="<?php echo esc_attr( $settings['ean_meta'] ); ?>" placeholder="_ean"></td>
					</tr>
					<tr>
						<th scope="row"><label for="mpn_meta"><?php esc_html_e( 'MPN meta key', 'tagora' ); ?></label></th>
						<td>
							<input type="text" id="mpn_meta" name="mpn_meta" class="regular-text code" value="<?php echo esc_attr( $settings['mpn_meta'] ); ?>" placeholder="_mpn">
							<p><label><input type="checkbox" name="sku_as_mpn" value="1" <?php checked( ! empty( $settings['sku_as_mpn'] ) ); ?>> <?php esc_html_e( 'My SKUs are the manufacturer’s part numbers (use SKU as MPN)', 'tagora' ); ?></label></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="brand_taxonomy"><?php esc_html_e( 'Brand taxonomy', 'tagora' ); ?></label></th>
						<td><input type="text" id="brand_taxonomy" name="brand_taxonomy" class="regular-text code" value="<?php echo esc_attr( $settings['brand_taxonomy'] ); ?>" placeholder="product_brand"></td>
					</tr>
				</table>
				<?php submit_button( __( 'Save settings', 'tagora' ), 'secondary' ); ?>
			</form>
			<p><a href="<?php echo esc_url( self::HELP ); ?>" target="_blank" rel="noopener"><?php esc_html_e( 'Help for shops on Tagora', 'tagora' ); ?></a></p>
		</div>
		<?php
	}
}
