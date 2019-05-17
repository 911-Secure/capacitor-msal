export interface Logger {
	debug(message: string, ...args: any[]): void;
	info(message?: any, ...args: any[]): void;
	warn(message?: any, ...args: any[]): void;
	error(message?: any, ...args: any[]): void;
}

export class NoOpLogger implements Logger {
	debug(_message: string, ..._args: any[]): void { }	
	info(_message?: any, ..._args: any[]): void { }
	warn(_message?: any, ..._args: any[]): void { }
	error(_message?: any, ..._args: any[]): void { }
}