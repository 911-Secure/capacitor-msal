import { WebPlugin } from '@capacitor/core';
import { registerElectronPlugin } from '@capacitor/electron/dist/esm';
import { Configuration, AuthenticationParameters, AuthResponse, Account } from 'msal/lib-es6';
import { MsalPlugin } from '..';
import { TokenSet } from 'openid-client';
import { ClientInfo } from 'msal/lib-es6/ClientInfo';
import { IdToken } from 'msal/lib-es6/IdToken';

const promiseIpc = require('electron-promise-ipc');

export class MsalElectron extends WebPlugin implements MsalPlugin {
	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}

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
		const tokens: TokenSet = await promiseIpc.send('msal-login', request);
		return this.tokensToResponse(tokens);
	}

	public async getAccount(): Promise<Account> {
		const tokens: TokenSet = await promiseIpc.send('msal-get-account');
		return tokens && Account.createAccount(
			new IdToken(tokens.id_token),
			new ClientInfo(tokens.client_info)
		);
	}

	acquireTokenSilent(_request: AuthenticationParameters): Promise<AuthResponse> {
		throw new Error("Method not implemented.");
	}

	acquireTokenPopup(_request: AuthenticationParameters): Promise<AuthResponse> {
		throw new Error("Method not implemented.");
	}

	private tokensToResponse(tokens: TokenSet): AuthResponse {
		const idToken = new IdToken(tokens.id_token);
		return {
			uniqueId: idToken.objectId || idToken.subject,
			tenantId: idToken.tenantId,
			tokenType: tokens.token_type,
			idToken: idToken,
			idTokenClaims: idToken.claims,
			accessToken: tokens.access_token,
			scopes: tokens.scope.split(' '),
			expiresOn: new Date(tokens.expires_at * 1000),
			account: Account.createAccount(idToken, new ClientInfo(tokens.client_info)),
			accountState: tokens.session_state
		};
	}
}

const Msal = new MsalElectron();
export { Msal };

registerElectronPlugin(Msal);
