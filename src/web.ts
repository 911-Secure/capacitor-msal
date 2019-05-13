import { WebPlugin } from '@capacitor/core';
import { MsalPlugin } from './definitions';

export class MsalWeb extends WebPlugin implements MsalPlugin {
	constructor() {
		super({
			name: 'Msal',
			platforms: ['web']
		});
	}

	get user(): any {
		throw new Error("Method not implemented.");
	}

	login(): Promise<void> {
		throw new Error("Method not implemented.");
	}

	acquireToken(): Promise<{ token: string; }> {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalWeb();

export { Msal };
