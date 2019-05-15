import { WebPlugin } from '@capacitor/core';
import { MsalPlugin, User, TokenResponse } from './definitions';

export class MsalWeb extends WebPlugin implements MsalPlugin {
	constructor() {
		super({
			name: 'Msal',
			platforms: ['web']
		});
	}

	get user(): User {
		throw new Error("Method not implemented.");
	}

	login(): Promise<User> {
		throw new Error("Method not implemented.");
	}

	acquireToken(): Promise<TokenResponse> {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalWeb();

export { Msal };
