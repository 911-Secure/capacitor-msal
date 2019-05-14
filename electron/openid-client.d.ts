declare module 'openid-client' {
	/**
	 * Encapsulates a discovered or instantiated OpenID Connect Issuer (Issuer),
	 * Identity Provider (IdP), Authorization Server (AS) and its metadata.
	 */
	class Issuer {
		/**
		 * Loads OpenID Connect 1.0 and/or OAuth 2.0 Authorization Server Metadata
		 * documents. When the `issuer` argument contains '.well-known' only that
		 * document is loaded, otherwise performs both openid-configuration and
		 * oauth-authorization-server requests.
		 * 
		 * This is the recommended method of getting yourself an Issuer instance.
		 * 
		 * @param {string} issuer Issuer Identifier or metadata URL
		 */
		static discover(issuer: string): Promise<Issuer>;

		/**
		 * Returns the `<Client>` class tied to this issuer.
		 */
		Client: typeof Client;
	}

	/**
	 * Encapsulates a dynamically registered, discovered or instantiated OpenID
	 * Connect Client (Client), Relying Party (RP), and its metadata, its instances
	 * hold the methods for getting an authorization URL, consuming callbacks,
	 * triggering token endpoint grants, revoking and introspecting tokens.
	 */
	class Client {
		/**
		 * Creates a new Client with the provided metadata.
		 * @param {Partial<ClientMetadata>} metadata 
		 * @param {Object} [jwks] JWK Set formatted object with private keys
		 * used for signing client assertions or decryptiong responses.
		 */
		constructor(metadata: Partial<ClientMetadata>, jwks?: any);

		/**
		 * Returns the target authorization redirect URI to redirect End-Users
		 * to using the provided parameters.
		 * @param parameters
		 */
		authorizationUrl(parameters: Partial<AuthorizationUrlOptions>): string;

		/**
		 * Returns recognized callback parameters from a provided input.
		 * @param input When input is of type string it will be parsed using `url.parse`
		 * and its query component will be returned. When input is a GET http/http2 request
		 * object its `url` property will be parsed using `url.parse` and its query component
		 * will be returned. When input is a POST http/http2 request object its `body`
		 * property will be parsed or returned if it is already an object. Note: the request
		 * read stream will not be parsed, it is expected that you will have a body parser
		 * prior to calling this method. this parser would set the `req.body` property.
		 */
		callbackParams(input: string | import('http').IncomingMessage | import('http2').Http2ServerRequest): object;

		/**
		 * Performs the callback for Authorization Server's authorization response.
		 * @param redirectUri redirect_uri used for the authorization request
		 * @param parameters returned authorization response, see `client.callbackParams`
		 * if you need help getting them.
		 * @param checks 
		 * @param extras 
		 */
		callback(redirectUri: string, parameters: object, checks?: {
			/**
			 * When provided the authorization response will be checkked for the presence
			 * of required parameters for a given response_type. Use of this check is recommended.
			 */
			response_type?: string;

			/**
			 * When provided the authorization response's state parameter will be checked
			 * to be the expected one. Use of this check is required if you sent a state
			 * parameter into an authorization request.
			 */
			state?: string;

			/**
			 * When provided the authorization response's ID Token nonce parameter will
			 * be checked to be the expected one. Use of this check is required if you sent
			 * a nonce parameter into an authorization request.
			 */
			nonce?: string;

			/**
			 * PKCE code_verifier to be sent to the token endpoint during code exchange.
			 * Use of this check is required if you sent a code_challenge parameter into
			 * an authorization request.
			 */
			code_verifier?: string;

			/**
			 * When provided the authorization response's ID Token auth_time parameter
			 * will be checked to conform to the max_age value. Use of this check is required
			 * if you sent a max_age parameter into an authorization request.
			 * Default: uses client's `default_max_age`.
			 */
			max_age?: number;
		}, extras?: {
			/**
			 * Extra request body properties to be sent to the AS during code exchange.
			 */
			exchangeBody?: object;

			/**
			 * Extra client assertion payload parameters to be sent as part of a client
			 * JWT assertion. This is only used when the client's `token_endpoint_auth_method`
			 * is either `client_secret_jwt` or `private_key_jwt`.
			 */
			clientAssertionPayload?: object;
		}): Promise<TokenSet>;
	}

	interface ClientMetadata {
		client_id: string;
		client_secret: string;

		/**
		 * Default: 'RS256'
		 */
		id_token_signed_response_alg: string;
		id_token_encrypted_response_alg: string;
		id_token_encrypted_response_enc: string;
		userinfo_signed_response_alg: string;
		userinfo_encrypted_response_alg: string;
		userinfo_encrypted_response_enc: string;
		redriect_uris: string[];

		/**
		 * Default: ['code']
		 */
		response_types: string[];
		post_logout_redirect_uris: string[];
		default_max_age: number;

		/**
		 * Default: false
		 */
		require_auth_time: boolean;
		request_object_signing_alg: string;
		request_object_encryption_alg: string;
		request_object_encryption_enc: string;

		/**
		 * Default: 'client_secret_basic'
		 */
		token_endpoint_auth_method: string;

		/**
		 * Default: same as token_endpoint_auth_method
		 */
		introspection_endpoint_auth_method: string;

		/**
		 * Default: same as token_endpoint_auth_method
		 */
		revocation_endpoint_auth_method: string;
		token_endpoint_auth_signing_alg: string;
		introspection_endpoint_auth_signing_alg: string;
		revocation_endpoint_auth_signing_alg: string;
		tls_client_certificate_bound_access_tokens: boolean;
	}

	interface AuthorizationUrlOptions {
		/**
		 * Default: If only a single `client.redirect_uris` member is present
		 * that one will be used automatically.
		 */
		redirect_uri: string;

		/**
		 * Default: If only a single `client.response_types` member is present
		 * that one will be used automatically.
		 */
		response_type: string;

		/**
		 * Default: 'openid'
		 */
		scope: string;

		/**
		 * Any other authorization parameters may be provided
		 */
		[param: string]: any;
	}

	/**
	 * Represents a set of tokens retrieved from either authorization callback or
	 * successful token endpoint grant call.
	 */
	class TokenSet {
		/**
		 * Given that the instance has expires_at / expires_in this function returns
		 * true / false when the access token (which expires properties are for) is
		 * beyond its lifetime.
		 */
		expired(): object;

		/**
		 * Given that the instance has an id_token this function returns its parsed
		 * payload object. Does not perform any validations as these were done prior
		 * to openid-client returning the tokenset in the first place.
		 */
		claims(): object;
	}
}