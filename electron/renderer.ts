import { WebPlugin } from '@capacitor/core';
import { ipcRenderer } from 'electron';
import { MsalPlugin } from '..';

export class MsalElectron extends WebPlugin implements MsalPlugin {
	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}
	
	echo(options: { value: string; }): Promise<{ value: string; }> {
		const value = ipcRenderer.sendSync('echo', options.value);
		return Promise.resolve({ value });
	}
}

const Msal = new MsalElectron();

export { Msal };
