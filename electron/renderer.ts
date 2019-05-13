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
	
	async echo(options: { value: string; }): Promise<{ value: string; }> {
		return ipcRenderer.sendSync('echo', options.value);
	}
}