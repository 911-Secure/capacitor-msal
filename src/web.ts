import { WebPlugin } from '@capacitor/core';
import { Configuration, UserAgentApplication } from 'msal';
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
}

const Msal = new MsalWeb();

export { Msal };
