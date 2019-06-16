import promiseIpc from 'electron-promise-ipc';
import uuid from 'uuid/v4';
import { WebPlugin } from '@capacitor/core';
import { Configuration, AuthenticationParameters, AuthResponse, ServerError, ClientAuthError, Account, InteractionRequiredAuthError } from 'msal';
import { ClientInfo } from 'msal/lib-commonjs/ClientInfo';
import { IdToken } from 'msal/lib-commonjs/IdToken';
import { MsalPlugin } from 'capacitor-msal';
import { LoginRequest, ErrorResponse, TokenResponse } from '../definitions';

export class MsalElectron extends WebPlugin implements MsalPlugin {
	private options: Configuration;

	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}

	init(options: Configuration): Promise<void> {
		// The following defaults come from the MSDN documentation.
		// https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications
		this.options = Object.assign<Configuration, Configuration>({
			auth: {
				clientId: undefined, // This must be set by the user.
				authority: 'https://login.microsoftonline.com/common',
				validateAuthority: true, // TODO: Validate issuer
				redirectUri: window.location.href,
				navigateToLoginRequestUrl: true
			},
			cache: {
				cacheLocation: 'sessionStorage', // TODO: Add caching
				storeAuthStateInCookie: false // TODO: Use cookies
			},
			system: {
				// TODO: logger
				loadFrameTimeout: 6000,
				tokenRenewalOffsetSeconds: 300
			}
		}, options);

		// The default value of postLogoutRedirectUri is the final value of redirectUri.
		if (!this.options.auth.postLogoutRedirectUri)
			this.options.auth.postLogoutRedirectUri = this.options.auth.redirectUri;

		return Promise.resolve();
	}

	async login(request?: AuthenticationParameters): Promise<AuthResponse> {
		// Normalize and set default values.
		request = Object.assign<AuthenticationParameters, AuthenticationParameters>({
			scopes: [],
			extraScopesToConsent: [],
			authority: this.options.auth.authority
		}, request);

		const redirectUri = this.options.auth.redirectUri instanceof Function
			? this.options.auth.redirectUri()
			: this.options.auth.redirectUri;
		const state = `${uuid()}|${request.state}`;
		const scope = [...request.scopes, ...request.extraScopesToConsent].join(' ');

		// Build the authorize URL.
		const url = new URL(`${request.authority}/oauth2/v2.0/authorize`);
		url.search = new URLSearchParams({
			client_id: this.options.auth.clientId,
			response_type: 'code',
			redirect_uri: redirectUri,
			scope: scope,
			response_mode: 'query',
			state: state,
			prompt: request.prompt,
			login_hint: request.loginHint,
			// TODO: domain_hint
			// code_challenge_method: 'S256',
			// TODO: code_challenge
			...request.extraQueryParameters
		}).toString();

		// The Electron main process will be used to control the popup window,
		// capture its redirect, and exchange the code for a token.
		// The Window APIs are cleaner there, and Azure AD does not support CORS.
		// Responses and errors are handled in the renderer to preserve class info.
		try {
			const response: TokenResponse = await promiseIpc.send('msal-login', {
				authorizeUrl: url.href,
				tokenUrl: `${request.authority}/oauth2/v2.0/token`,
				state: state,
				clientId: this.options.auth.clientId,
				scope: scope,
				redirectUri: redirectUri
			} as LoginRequest);

			const idToken = new IdToken(response.id_token);
			return {
				uniqueId: idToken.objectId || idToken.subject,
				tenantId: idToken.tenantId,
				tokenType: response.token_type,
				idToken: idToken,
				accessToken: response.access_token,
				scopes: response.scope.split(' '),
				expiresOn: new Date(Date.now() + response.expires_in * 1000),
				account: Account.createAccount(idToken, new ClientInfo(response.client_info)),
				accountState: request.state
			};	
		} catch (e) {
			const response: ErrorResponse = e;
			switch (response.error) {
				case 'user_cancelled':
					throw ClientAuthError.createUserCancelledError();
				case 'invalid_state':
					throw ClientAuthError.createInvalidStateError(response.state, state);
				case 'interaction_required':
				case 'login_required':
					throw new InteractionRequiredAuthError(response.error, response.error_description);
				default:
					throw new ServerError(response.error, response.error_description);
			}
		}
	}

	acquireTokenSilent(request: AuthenticationParameters): Promise<AuthResponse> {
		throw new Error("Method not implemented.");
	}

	acquireTokenInteractive(request: AuthenticationParameters): Promise<AuthResponse> {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalElectron();

export { Msal };
