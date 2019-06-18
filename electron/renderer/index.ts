import promiseIpc from 'electron-promise-ipc';
import { WebPlugin } from '@capacitor/core';
import { Configuration, AuthenticationParameters, AuthResponse, ClientAuthError, Account } from 'msal';
import { ClientInfo } from 'msal/lib-commonjs/ClientInfo';
import { IdToken } from 'msal/lib-commonjs/IdToken';
import { MsalPlugin } from 'capacitor-msal';
import { TokenSet } from 'openid-client';

export class MsalElectron extends WebPlugin implements MsalPlugin {
	private redirectUri: string | (() => string);
	private postLogoutRedirectUri: string | (() => string);

	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}

	private getRedirectUri(uri: string | (() => string)): string {
		return typeof uri === 'function' ? uri() : uri;
	}

	init(options: Configuration): Promise<void> {
		// The following defaults come from the MSDN documentation.
		// https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications
		options = Object.assign<Configuration, Configuration>({
			auth: {
				clientId: undefined, // This must be set by the user.
				authority: 'https://login.microsoftonline.com/common',
				validateAuthority: true,
				redirectUri: window.location.href,
				navigateToLoginRequestUrl: true
			},
			cache: {
				cacheLocation: 'sessionStorage',
				storeAuthStateInCookie: false
			},
			system: {
				loadFrameTimeout: 6000,
				tokenRenewalOffsetSeconds: 300
			}
		}, options);

		// The default value of postLogoutRedirectUri is the final value of redirectUri.
		if (!options.auth.postLogoutRedirectUri)
			options.auth.postLogoutRedirectUri = options.auth.redirectUri;

		// Hold the original redirect URIs for later.
		this.redirectUri = options.auth.redirectUri;
		this.postLogoutRedirectUri = options.auth.postLogoutRedirectUri;

		// Normalize the redirect URI for serialization.
		options.auth.redirectUri = this.getRedirectUri(this.redirectUri);
		options.auth.postLogoutRedirectUri = this.getRedirectUri(this.postLogoutRedirectUri);

		return promiseIpc.send('msal-init', options);
	}

	async login(request?: AuthenticationParameters): Promise<AuthResponse> {
		// The Electron main process will be used to control the popup window,
		// capture its redirect, and exchange the code for a token.
		// The Window APIs are cleaner there, and Azure AD does not support CORS.
		// Responses and errors are handled in the renderer to preserve class info.
		try {
			const tokens: TokenSet =
				await promiseIpc.send('msal-login', this.getRedirectUri(this.redirectUri), request);

			const idToken = new IdToken(tokens.id_token);
			return {
				uniqueId: idToken.objectId || idToken.subject,
				tenantId: idToken.tenantId,
				tokenType: tokens.token_type,
				idToken: idToken,
				accessToken: tokens.access_token,
				scopes: tokens.scope.split(' '),
				expiresOn: new Date(Date.now() + tokens.expires_in * 1000),
				account: Account.createAccount(idToken, new ClientInfo(tokens.client_info)),
				accountState: request.state
			};
		} catch (e) {
			if (e.error === 'user_cancelled') {
				throw ClientAuthError.createUserCancelledError();
			}

			// TODO: Handle openid-client errors
			throw e;
		}
	}

	acquireTokenSilent(_request: AuthenticationParameters): Promise<AuthResponse> {
		throw new Error("Method not implemented.");
	}

	acquireTokenInteractive(_request: AuthenticationParameters): Promise<AuthResponse> {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalElectron();

export { Msal };
