import { WebPlugin, registerWebPlugin } from '@capacitor/core';
import { Configuration, UserAgentApplication, AuthenticationParameters, AuthResponse, Account } from 'msal/lib-es6';
import { MsalPlugin } from './definitions';

export class MsalWeb extends WebPlugin implements MsalPlugin {
	msalInstance: UserAgentApplication;

	constructor() {
		super({
			name: 'Msal',
			platforms: ['web']
		});
	}
	
	init(options: Configuration): Promise<void> {
		this.msalInstance = new UserAgentApplication(options);
		return Promise.resolve();
	}

	login(request?: AuthenticationParameters): Promise<AuthResponse> {
		return this.msalInstance.loginPopup(request);
	}

	acquireTokenSilent(request: AuthenticationParameters): Promise<AuthResponse> {
		return this.msalInstance.acquireTokenSilent(request);
	}

	acquireTokenInteractive(request: AuthenticationParameters): Promise<AuthResponse> {
		return this.msalInstance.acquireTokenPopup(request);
	}

	getLoginInProgress(): boolean {
		return this.msalInstance.getLoginInProgress();
	}

	getAccount(): Account {
		return this.msalInstance.getAccount();
	}
}

const Msal = new MsalWeb();
export { Msal };

registerWebPlugin(Msal);
