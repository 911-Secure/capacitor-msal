import promiseIpc from 'electron-promise-ipc';
import { WebPlugin } from '@capacitor/core';
import { Configuration, AuthenticationParameters, AuthResponse, Account, AuthError } from 'msal';
import { ClientInfo } from 'msal/lib-commonjs/ClientInfo';
import { IdToken } from 'msal/lib-commonjs/IdToken';
import { TokenSet } from 'openid-client';
import { MsalPlugin } from './definitions';

export class MsalElectron extends WebPlugin implements MsalPlugin {
	private account: Account;
	private loginInProgress = false;

	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}

	public init(options: Configuration): Promise<void> {
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

		return promiseIpc.send('msal-init', options);
	}

	public async login(request?: AuthenticationParameters): Promise<AuthResponse> {
		this.loginInProgress = true;
		try {
			const tokens: TokenSet = await promiseIpc.send('msal-login', request);

			const response = this.buildResponse(tokens, request);
			this.account = response.account;

			return response;
		} catch (e) {
			// TODO: Build the appropriate sub-class.
			throw new AuthError(e.error, e.error_description);
		} finally {
			this.loginInProgress = false;
		}
	}

	public acquireTokenSilent(request: AuthenticationParameters): Promise<AuthResponse> {
		request.prompt = 'none';
		return this.acquireTokenInteractive(request);
	}

	public async acquireTokenInteractive(request: AuthenticationParameters): Promise<AuthResponse> {
		try {
			const tokens: TokenSet = await promiseIpc.send('msal-acquire-token', request);
			return this.buildResponse(tokens, request);
		} catch (e) {
			// TODO: Build the appropriate sub-class.
			throw new AuthError(e.error, e.error_description);
		}
	}

	public getAccount(): Account {
		return this.account;
	}

	public getLoginInProgress(): boolean {
		return this.loginInProgress;
	}

	private buildResponse(tokens: TokenSet, request: AuthenticationParameters): AuthResponse {
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
	}
}

const Msal = new MsalElectron();
export { Msal };
