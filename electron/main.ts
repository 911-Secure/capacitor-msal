import { ipcMain, Event } from 'electron';

export class CapacitorMsal {
	init() {
		ipcMain.on('echo', (event: Event, arg: string) => {
			event.returnValue = arg;
		});
	}
}