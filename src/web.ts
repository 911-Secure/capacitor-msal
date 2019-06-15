import { WebPlugin } from '@capacitor/core';
import { Configuration, UserAgentApplication, AuthenticationParameters, AuthResponse } from 'msal';
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
}

const Msal = new MsalWeb();

export { Msal };
