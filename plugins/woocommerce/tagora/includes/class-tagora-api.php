<?php
/**
 * Talks to Tagora: POST JSON with the shop's connection key.
 */

defined( 'ABSPATH' ) || exit;

class Tagora_Api {

	/** The shop's connection key, from the Tagora dashboard. */
	public static function key() {
		return (string) get_option( 'tagora_key', '' );
	}

	public static function is_connected() {
		return '' !== self::key();
	}

	/**
	 * @param string $path    e.g. "/plugin/hello"
	 * @param array  $body    sent as JSON
	 * @param string $key     optional key (when testing a new one before saving it)
	 * @return array|WP_Error the decoded answer, or an error with Tagora's message
	 */
	public static function post( $path, array $body, $key = null ) {
		$key = null === $key ? self::key() : $key;
		if ( '' === $key ) {
			return new WP_Error( 'tagora_no_key', __( 'Enter your connection key first.', 'tagora' ) );
		}
		$response = wp_remote_post(
			TAGORA_API . $path,
			array(
				'timeout'     => 45,
				'headers'     => array(
					'Authorization' => 'Bearer ' . $key,
					'Content-Type'  => 'application/json',
					'User-Agent'    => 'TagoraWooCommerce/' . TAGORA_VERSION . '; ' . home_url(),
				),
				'body'        => wp_json_encode( $body ),
				'data_format' => 'body',
			)
		);
		if ( is_wp_error( $response ) ) {
			/* translators: %s: technical error */
			return new WP_Error( 'tagora_unreachable', sprintf( __( 'Could not reach Tagora: %s', 'tagora' ), $response->get_error_message() ) );
		}
		$status = (int) wp_remote_retrieve_response_code( $response );
		$data   = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( $status >= 400 || ! is_array( $data ) || empty( $data['ok'] ) ) {
			$code    = is_array( $data ) && ! empty( $data['code'] ) ? (string) $data['code'] : 'tagora_http_' . $status;
			$message = is_array( $data ) && ! empty( $data['message'] ) ? (string) $data['message'] : sprintf( 'HTTP %d', $status );
			return new WP_Error( $code, $message, array( 'status' => $status ) );
		}
		return $data;
	}

	/** Who we are on Tagora, and whether Tagora wants a full sync. */
	public static function hello( $key = null ) {
		global $wp_version;
		$counts = wp_count_posts( 'product' );
		return self::post(
			'/plugin/hello',
			array(
				'site'        => home_url(),
				'plugin'      => TAGORA_VERSION,
				'woocommerce' => defined( 'WC_VERSION' ) ? WC_VERSION : '',
				'wordpress'   => $wp_version,
				'php'         => PHP_VERSION,
				'products'    => isset( $counts->publish ) ? (int) $counts->publish : 0,
			),
			$key
		);
	}
}
