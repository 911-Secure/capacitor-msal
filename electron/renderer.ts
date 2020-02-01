import { WebPlugin } from '@capacitor/core';
import { registerElectronPlugin } from '@capacitor/electron/dist/esm';
import { Configuration, AuthenticationParameters, AuthResponse, Account } from 'msal/lib-es6';
import { ClientInfo } from 'msal/lib-es6/ClientInfo';
import { IdToken } from 'msal/lib-es6/IdToken';
import { PromiseIpcRenderer } from 'electron-promise-ipc';
import { MsalPlugin } from '..';

const promiseIpc: PromiseIpcRenderer = require('electron-promise-ipc');

export class MsalElectron extends WebPlugin implements MsalPlugin {
	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}

	// TODO: Convert all errors to the strongly typed version.

	public init(options: Configuration): Promise<void> {
		// The following defaults come from the MSDN documentation.
		// https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications
		options.auth = {
			authority: 'https://login.microsoftonline.com/common',
			validateAuthority: true,
			redirectUri: window.location.href,
			navigateToLoginRequestUrl: true,
			...options.auth
		};

		// The default value of postLogoutRedirectUri is the final value of redirectUri.
		if (!options.auth.postLogoutRedirectUri)
			options.auth.postLogoutRedirectUri = options.auth.redirectUri;

		return promiseIpc.send('msal-init', options);
	}

	public async loginPopup(request?: AuthenticationParameters): Promise<AuthResponse> {
		const tokens = await promiseIpc.send('msal-login-popup', request);
		return this.tokensToResponse(tokens);
	}

	public async acquireTokenSilent(request: AuthenticationParameters): Promise<AuthResponse> {
		const tokens = await promiseIpc.send('msal-acquire-token-silent', request);
		return this.tokensToResponse(tokens);
	}

	public async getAccount(): Promise<Account> {
		const tokens = await promiseIpc.send('msal-get-account');
		return tokens.id_token && Account.createAccount(
			new IdToken(tokens.id_token),
			new ClientInfo(tokens.client_info as string)
		);
	}

	private tokensToResponse(tokens: TokenResponse): AuthResponse {
		const idToken = new IdToken(tokens.id_token);
		return {
			uniqueId: idToken.objectId || idToken.subject,
			tenantId: idToken.tenantId,
			tokenType: tokens.token_type,
			idToken: idToken,
			idTokenClaims: idToken.claims,
			accessToken: tokens.access_token,
			scopes: tokens.scope.split(' '),
			expiresOn: tokens.expires_at,
			account: Account.createAccount(
				idToken,
				new ClientInfo(tokens.client_info)
			),
			accountState: tokens.session_state
		};
	}
}

const Msal = new MsalElectron();
export { Msal };

registerElectronPlugin(Msal);
