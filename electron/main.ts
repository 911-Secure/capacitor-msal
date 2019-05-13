import { ipcMain } from 'electron';

export class CapacitorMsal {
	init() {
		ipcMain.on('test-message', console.log);
	}
}