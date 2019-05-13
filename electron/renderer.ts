import { WebPlugin } from '@capacitor/core';
import { MsalPlugin } from '..';

export class MsalElectron extends WebPlugin implements MsalPlugin {
	constructor() {
		super({
			name: 'Msal',
			platforms: ['electron']
		});
	}
	
	async echo(options: { value: string; }): Promise<{ value: string; }> {
		console.log('ECHO', options);
		return options;
	}
}