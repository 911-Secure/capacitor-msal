import { WebPlugin } from '@capacitor/core';
import { registerElectronPlugin } from '@capacitor/electron/dist/esm';
import { Configuration, AuthenticationParameters, AuthResponse, Account } from 'msal/lib-es6';
import { MsalPlugin } from '..';

const promiseIpc = require('electron-promise-ipc');

export class MsalElectron extends WebPlugin implements MsalPlugin {
	private account: Account;

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

	public async login(request?: AuthenticationParameters): Promise<AuthResponse> {
		return promiseIpc.send('msal-login', request);
	}

	public getAccount(): Account {
		return this.account;
	}

	acquireTokenSilent(_request: AuthenticationParameters): Promise<AuthResponse> {
		throw new Error("Method not implemented.");
	}

	acquireTokenInteractive(_request: AuthenticationParameters): Promise<AuthResponse> {
		throw new Error("Method not implemented.");
	}

	getLoginInProgress(): boolean {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalElectron();
export { Msal };

registerElectronPlugin(Msal);
