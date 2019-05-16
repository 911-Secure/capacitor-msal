import promiseIpc from 'electron-promise-ipc';
import { WebPlugin } from '@capacitor/core';
import { MsalPlugin, User, TokenResponse } from '../dist/esm';

export class MsalElectron extends WebPlugin implements MsalPlugin {
	private _user: User;
	
	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}

	get user(): User {
		return this._user;
	}

	login(): Promise<User> {
		return promiseIpc.send('capacitor-msal-login');
	}

	acquireToken(): Promise<TokenResponse> {
		return promiseIpc.send('capacitor-msal-acquire-token');
	}
}

const Msal = new MsalElectron();

export { Msal };
