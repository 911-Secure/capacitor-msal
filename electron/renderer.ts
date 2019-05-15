import promiseIpc from 'electron-promise-ipc';
import { WebPlugin } from '@capacitor/core';
import { MsalPlugin } from '..';

export class MsalElectron extends WebPlugin implements MsalPlugin {
	private _user: any;
	
	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}

	get user(): any {
		return this._user;
	}

	login(): Promise<any> {
		return promiseIpc.send<any>('capacitor-msal-login');
	}

	acquireToken(): Promise<{ token: string; }> {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalElectron();

export { Msal };
