declare module 'electron-promise-ipc' {
	class PromiseIpcBase {
		on(route: string, listener: (...dataArgs: any[]) => Promise<any> | any): PromiseIpcBase;
		send(route: string, ...dataArgs: any[]): Promise<any>;
	}

	const promiseIpc: PromiseIpcBase;
	export default promiseIpc;
}