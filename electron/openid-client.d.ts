declare module 'openid-client' {
	/**
	 * Encapsulates a discovered or instantiated OpenID Connect Issuer (Issuer),
	 * Identity Provider (IdP), Authorization Server (AS) and its metadata.
	 */
	class Issuer {
		/**
		 * Creates a new Issuer with the provided metadata
		 */
		constructor(metadata: IssuerMetadata);

		/**
		 * Returns the `Client` class tied to this issuer.
		 */
		Client: typeof Client;

		/**
		 * Returns metadata from the issuer's discovery document.
		 */
		metadata: IssuerMetadata;

		/**
		 * Returns the issuer's `jwk_uri` keys as a `@panva/jose` parsed JWKS.Keystore
		 * @param forceReload forces a reload of the issuer's jwks_uri. Default: 'false'
		 */
		keystore(forceReload?: boolean): Promise<import('@panva/jose').JWKS.KeyStore>;

		/**
		 * Loads OpenID Connect 1.0 and/or OAuth 2.0 Authorization Server Metadata
		 * documents. When the `issuer` argument contains '.well-know' only that document
		 * is loaded, otherwise performs both openid-configuration and oauth-authorization-
		 * server requests.
		 * 
		 * This is the recommended method of getting yourself an Issuer instance.
		 * @param issuer Issuer Identifier or metadata URL
		 */
		static discover(issuer: string): Promise<Issuer>;

		/**
		 * Performs OpenID Provider Issuer Discovery based on End-User input.
		 * @param input EMAIL, URL, Hostname and Port, acct or syntax input
		 */
		static webfinger(input: string): Promise<Issuer>;
	}

	interface IssuerMetadata {
		/** Issuer identifier */
		issuer: string;
		authorization_endpoint: string;
		token_endpoint: string;
		jwks_uri: string;
		userinfo_endpoint: string;
		revocation_endpoint: string;
		introspection_endpoint: string;
		end_session_endpoint: string;
		registration_endpoint: string;
		token_endpoint_auth_methods_supported: string;
		token_endpoint_auth_signing_alg_values_supported: string;
		introspection_endpoint_auth_methods_supported: string;
		introspection_endpoint_auth_signing_alg_values_supported: string;
		revocation_endponit_auth_methods_supported: string;
		revocation_endpoint_auth_signing_alg_values_supported: string;
		request_object_signing_alg_values_supported: string;
		mtls_endpoint_alias: {
			token_endpoint: string;
			userinfo_endpoint: string;
			revocation_endpoint: string;
			introspection_endpoint: string;
		};
		[key: string]: any;
	}

	/**
	 * Encapsulates a dynamically registered, discovered or instantiated OpenID Connect
	 * Client (Client), Relying Party (RP), and its metadata, its instances hold the methods
	 * for getting an authorization URL, consuming callbacks, triggering token endpoint
	 * grants, revoking and introspecting tokens.
	 */
	class Client {
		/**
		 * Creates a new Client with the provided metadata
		 * @param metadata 
		 * @param jwks JWK Set formatted object with private keys used for signing client
		 * assertions or decrypting responses.
		 */
		constructor(metadata: ClientMetadata, jwks?: object);

		/**
		 * Returns the client's metadata.
		 */
		metadata: ClientMetadata;

		/**
		 * Returns the target authorization redirect URI to redirect End-Users to using
		 * the provided parameters.
		 * @param parameters 
		 */
		authorizationUrl(parameters: {
			/**
			 * Default: If only a single `client.redriect_uris` member is present that
			 * one will be used automatically.
			 */
			redirect_uri?: string;
			/**
			 * Default: If only a single `client.response_types` member is present that
			 * one will be used automatically.
			 */
			response_type?: string;
			/**
			 * Default: 'openid'
			 */
			scope?: string;
			[key: string]: string;
		}): string;

		/**
		 * Returns the target logout redirect URI to redirect End-Users to using the
		 * provided parameters.
		 * @param parameters 
		 */
		endSessionUrl(parameters: {
			id_token_hint: string | TokenSet;
			/**
			 * Default: If only a single `client.post_logout_redirect_uris` member is
			 * present that one will be used automatically.
			 */
			post_logout_redirect_uri: string;
			state: string;
			[key: string]: any;
		}): string;

		/**
		 * Returns recognized callback parameters from a provided input.
		 * @param input When input is of type string it will be parsed using
		 * `url.parse` and its query component will be returned.
		 * When input is a GET http/http2 request object its `url` property will
		 * be parsed using `url.parse` and its query component will be returned
		 * When input is a POST http/http2 request object its `body` property will
		 * be parsed or returned if it is already an object. Note: the request read
		 * stream will not be parsed, it ie expected that you will have a body parser
		 * prior to calling this method. This parser would set the `req.body` property.
		 */
		callbackParams(input: string
			| import('http').IncomingMessage
			| import('http2').Http2ServerRequest): object;

		/**
		 * Performs the callback for Authorization Server's authorization response.
		 * Tip: If you're using Pure OAuth 2.0 then
		 * `client.oauthCallback(redirectUri, parameters[, checks[, extras]])` is the
		 * OAuth 2.0 variant of this method, it has the same signature with the exception
		 * of checks only supporting `code_verifier`, `state`, and `response_type`.
		 * @param redirectUri redirect_uri used for the authorization request
		 * @param paramters returned authorization response, see `client.callbackParams` if you
		 * need help getting them.
		 * @param checks 
		 * @param extras 
		 */
		callback(redirectUri: string, paramters: object, checks?: {
			/**
			 * When provided the authorization response will be checked for presence
			 * of required parameters for a given response_type. Use of this check is
			 * recommended.
			 */
			response_type?: string;
			/**
			 * When provided the authorization response's state parameter will be checked
			 * to be the this expected one. Use of this check is required if you sent a
			 * state parameter into an authorization request.
			 */
			state?: string;
			/**
			 * When provided the authorization response's ID Token nonce parameter will be
			 * checked to be the this expected one. Use of this check is required if you sent
			 * a nonce parameter into an authorization request.
			 */
			nonce?: string;
			/**
			 * PKCE code_verifier to be sent to the token endpoint during code exchange. Use
			 * of this check is required if you sent a code_challenge parameter into an
			 * authorization request.
			 */
			code_verifier?: string;
			/**
			 * When provided the authorization response's ID Token auth_time parameter will
			 * be checked to be conform to the max_age value. Use of this check is required if
			 * you sent a max_age parameter into an authorization request. Default: uses
			 * client's `default_max_age`.
			 */
			max_age?: number;
		}, extras?: {
			/**
			 * extra request body properties to be sent to the AS during code exchange.
			 */
			exchangeBody?: object;
			/**
			 * extra client assertion payload parameters to be sent as part of a client
			 * JWT assertion. This is only used when the client's `token_endpoint_auth_method`
			 * is either `client_secret_jwt` or `private_key_jwt`.
			 */
			clientAssertionPayload?: object;
		}): Promise<TokenSet>;

		/**
		 * Performs `refresh_token` grant type exchange.
		 * @param refreshToken Refresh Token value. When TokenSet instance is provided its
		 * `refresh_token` property will be used automatically.
		 * @param extras 
		 */
		refresh(refreshToken: string | TokenSet, extras?: {
			/**
			 * extra request body properties to be sent to the AS during refresh token exchange.
			 */
			exchangeBody?: any;
			/**
			 * extra client assertion payload parameters to be sent as part of a client
			 * JWT assertion. This is only used when the client's `token_endpoint_auth_method`
			 * is either `client_secret_jwt` or `private_key_jwt`.
			 */
			clientAssertionPayload?: object;
		}): Promise<TokenSet>;

		/**
		 * Fetches the OIDC `userinfo` response with the provided Access Token. Also
		 * handles signed and/or encrypted userinfo responses. When TokenSet is provided
		 * as an argument the userinfo `sub` property will also be checked to match the
		 * on in the TokenSet's ID Token.
		 * @param accessToken Access Token value. When TokenSet instance is provided its
		 * `access_token` property will be used automatically.
		 */
		userinfo(accessToken: string | TokenSet): Promise<object>;

		/**
		 * Performs an arbitrary `grant_type` exchange at the `token_endpoint`.
		 * @param body 
		 * @param extras 
		 */
		grant(body: {
			grant_type: string;
			[key: string]: any;
		}, extras?: {
			/**
			 * extra request body properties to be sent to the AS during refresh token exchange.
			 */
			exchangeBody: object;
			/**
			 * extra client assertion payload parameters to be sent as part of a client
			 * JWT assertion. This is only used when the client's `token_endpoint_auth_method`
			 * is either `client_secret_jwt` or `private_key_jwt`.
			 */
			clientAssertionPayload: object;
		}): Promise<TokenSet>;

		/**
		 * Revokes a token at the Authorization Server's revocation_endpoint.
		 * @param token 
		 * @param tokenTypeHint 
		 * @param extras 
		 */
		revoke(token: string, tokenTypeHint?: string, extras?: {
			/**
			 * extra request body properties to be sent to the AS during refresh token exchange.
			 */
			exchangeBody: object;
			/**
			 * extra client assertion payload parameters to be sent as part of a client
			 * JWT assertion. This is only used when the client's `token_endpoint_auth_method`
			 * is either `client_secret_jwt` or `private_key_jwt`.
			 */
			clientAssertionPayload: object;
		}): Promise<undefined>;

		/**
		 * Creates a signed and optionally encrypted Request Object to send to the AS.
		 * Uses the client's `request_object_signing_alg`, `request_object_encryption_alg`,
		 * `request_object_encryption_enc` metadata for determining the algorithms to use.
		 * @param payload Authorization request parameters and any other JWT parameters to
		 * be included in the Request Object.
		 */
		requestObject(payload: {
			/** Default: client's client_id */
			client_id: string;
			/** Default: client's client_id */
			iss: string;
			/** Default: issuer's Issuer Identifier */
			aud: string;
			/** Default: now() */
			iat: number;
			/** Default: now() + 300 (5 minutes from now) */
			exp: number;
			/** Default: 32 random base64url encoded bytes */
			jti: string;
			[key: string]: string | number;
		}): Promise<string>;

		/**
		 * Performs Dynamic Client Registration with the provided metadata at the
		 * issuer's `registration_endpoint`.
		 * @param metadata Client metadata to register the new client with.
		 * @param other 
		 */
		static register(metadata: ClientMetadata, other?: {
			/**
			 * JWK Set formatted object with private keys used for signing client
			 * assertions or decrypting responses. When neither `jwks_uri` or `jwks`
			 * is present in `metadata` the key's public parts will be registered
			 * as `jwks`.
			 */
			jwks: object;
			/**
			 * Initial Access Token to use as a Bearer token during the registration call.
			 */
			initialAccessToken: string;
		}): Client;

		/**
		 * Performs Dynamic Client Read Request to retrieve a Client instance.
		 * @param registrationClientUri Location of the Client Configuration Endpoint
		 * @param registrationAccessToken Registration Access Token to use as a Bearer token
		 * during the Client Read Request
		 * @param jwks JWK Set formatted object with private keys used for signing client
		 * assertions or decrypting responses.
		 */
		static fromUri(registrationClientUri: string, registrationAccessToken: string, jwks?: object): Client;
	}

	type AuthMethod = 'none' | 'client_secret_basic' | 'client_secret_post'
		| 'client_secret_jwt' | 'private_key_jwt' | 'tls_client_auth'
		| 'self_signed_tls_client_auth';

	interface ClientMetadata {
		client_id: string;
		client_secret?: string;
		/** Default: 'RS256' */
		id_token_signed_response_alg?: string;
		id_token_encrypted_response_alg?: string;
		id_token_encrypted_response_enc?: string;
		userinfo_signed_response_alg?: string;
		userinfo_encrypted_response_alg?: string;
		userinfo_encrypted_response_enc?: string;
		redirect_uris?: string[];
		/** Default: '["code"]' */
		response_types?: string[];
		post_logout_redirect_uris?: string[];
		default_max_age?: number;
		/** Default: 'false' */
		require_auth_time?: boolean;
		request_object_signing_alg?: string;
		request_object_encryption_alg?: string;
		request_object_encryption_enc?: string;
		/** Default: 'client_secret_basic' */
		token_endpoint_auth_method?: AuthMethod;
		/** Default: same as token_endpoint_auth_method */
		introspection_endpoint_auth_method?: AuthMethod;
		/** Default: same as token_endpoint_auth_method */
		revocation_endpoint_auth_method?: AuthMethod;
		token_endpoint_auth_signing_alg?: string;
		introspection_endpoint_auth_signing_alg?: string;
		revocation_endpoint_auth_signing_alg?: string;
		tls_client_certificate_bound_access_tokens?: boolean;
		[key: string]: any;
	}

	/**
	 * Represents a set of tokens retrieved from either authorization callback or successful
	 * token endpoint grant call.
	 */
	class TokenSet {
		/**
		 * Creates a new TokenSet from the provided response. E.g. parsed token endpoint
		 * response, parsed callback parameters. You only need to instantiate a TokenSet
		 * yourself if you recall it from e.g. distributed cache storage or a database.
		 * Note: manually constructed TokenSet instances do not undergo any validations.
		 * @param input
		 */
		constructor(input: {
			access_token: string;
			token_type: string;
			id_token: string;
			refresh_token: string;
			expires_in: number;
			expires_at: number;
			session_state: string;
		});

		/**
		 * Given that the instance has expires_at / expires_in this function returns
		 * true / false when the access token (which expires properties are for) is
		 * beyond its lifetime.
		 */
		expired(): boolean;

		/**
		 * Given that the instance has an id_token this function returns its parsed
		 * payload object. Does not perform any validations as these were done prior
		 * to openid-client returning the tokenset in the first place.
		 */
		claims(): any;

		access_token: string;
		token_type: string;
		id_token: string;
		refresh_token: string;
		expires_in: number;
		expires_at: number;
		session_state: string;
		scope: string;
		client_info: string;
	}

	const generators: {
		/**
		 * Generates random bytes and encodes them in url safe base64. This method is
		 * also aliased as `generators.nonce`, `generators.state` and
		 * `generators.codeVerifier`.
		 * @param bytes Number indicating the number of bytes to generate. Default: 32
		 */
		random(bytes?: number): string;
		state(bytes?: number): string;
		nonce(bytes?: number): string;
		codeVerifier(bytes?: number): string;
		/**
		 * Calculates the S256 PKCE code challenge for an arbitrary code verifier.
		 * @param verifier Code verifier to calculate the S256 code challenge for.
		 */
		codeChallenge(verifier: string): string;
	};
}