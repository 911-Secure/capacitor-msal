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

		ipcRenderer.on('capacitor-msal-user-logged-in', (event: Event, user: any) => {
			this._user = user;
			this.notifyListeners('userLoggedIn', user);
		});
	}

	get user(): any {
		return this._user;
	}

	async login(): Promise<void> {
		ipcRenderer.send('capacitor-msal-login');
	}

	acquireToken(): Promise<{ token: string; }> {
		throw new Error("Method not implemented.");
	}
}

const Msal = new MsalElectron();

export { Msal };
