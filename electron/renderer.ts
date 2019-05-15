import { WebPlugin } from '@capacitor/core';
import { MsalPlugin } from '..';
import { ipcRenderer } from 'electron';

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

	async login(): Promise<any> {
		return new Promise<any>(resolve => {
			ipcRenderer.send('capacitor-msal-login');
			ipcRenderer.once('capacitor-msal-login-reply', (_event: any, user: any) => {
				this._user = user;
				resolve(user);
			});
		});
	}

	acquireToken(): Promise<{ token: string; }> {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalElectron();

export { Msal };
