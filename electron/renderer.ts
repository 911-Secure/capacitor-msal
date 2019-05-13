import { WebPlugin } from '@capacitor/core';
import { MsalPlugin } from '..';

export class MsalElectron extends WebPlugin implements MsalPlugin {
	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}
	
	get user(): any {
		throw new Error('Method not implemented.');
	}

	login(): Promise<void> {
		throw new Error("Method not implemented.");
	}

	acquireToken(): Promise<{ token: string; }> {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalElectron();

export { Msal };
