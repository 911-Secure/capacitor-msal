declare module 'electron-promise-ipc' {
	class PromiseIpcBase {
		on<T>(route: string, listener: (...dataArgs: any[]) => Promise<T> | T): PromiseIpcBase;
		send<T>(route: string, ...dataArgs: any[]): Promise<T>;
	}

	const promiseIpc: PromiseIpcBase;
	export default promiseIpc;	
}