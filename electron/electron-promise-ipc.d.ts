type IpcMain = import('electron').IpcMain;
type IpcMainEvent = import('electron').IpcMainEvent;
type IpcRenderer = import('electron').IpcRenderer;
type IpcRendererEvent = import('electron').IpcRendererEvent;
type WebContents = import('electron').WebContents;
type Configuration = import('msal/lib-es6').Configuration;
type AuthenticationParameters = import('msal/lib-es6').AuthenticationParameters;
type TokenResponse = import('./msal').TokenResponse;

declare module 'electron-promise-ipc' {
	type Listener = Function;
	type WrappedListener = (event: IpcMainEvent | IpcRendererEvent, replyChannel: string, ...dataArgs: unknown[]) => void;
	type Options = { maxTimeoutMs: number };

	abstract class PromiseIpcBase {
		maxTimeoutMs: number;
		eventEmitter: IpcMain | IpcRenderer;
		routeListenerMap: Map<string, Listener>;
		listenerMap: Map<Listener, WrappedListener>;

		constructor(opts: Options | undefined, eventEmitter: IpcMain | IpcRenderer);

		send(route: string, sender: WebContents | IpcRenderer, ...dataArgs: unknown[]): Promise<unknown>;
		on(route: string, listener: Listener): this;
		off(route: string, listener: Listener): void;
		removeListener(route: string, listener: Listener): void;
	}

	export class PromiseIpcMain extends PromiseIpcBase {
		constructor(opts?: Options);
		send(route: string, webContents: WebContents, ...dataArgs: unknown[]): Promise<unknown>;
		
		// Custom overloads begin here.
		on(route: 'msal-init', listener: (options: Configuration, event: IpcMainEvent) => Promise<void> | void): this;
		on(route: 'msal-login-popup', listener: (request: AuthenticationParameters | undefined, event: IpcMainEvent) => Promise<TokenResponse> | TokenResponse): this;
		on(route: 'msal-acquire-token-silent', listener: (request: AuthenticationParameters, event: IpcMainEvent) => Promise<TokenResponse> | TokenResponse): this;
		on(route: 'msal-get-account', listener: (event: IpcMainEvent) => Promise<TokenResponse> | TokenResponse): this;
	}

	export class PromiseIpcRenderer extends PromiseIpcBase {
		constructor(opts?: Options);
		send(route: string, ...dataArgs: unknown[]): Promise<unknown>;
		
		// Custom overloads begin here.
		send(route: 'msal-init', options: Configuration): Promise<void>;
		send(route: 'msal-login-popup', request?: AuthenticationParameters): Promise<TokenResponse>;
		send(route: 'msal-acquire-token-silent', request: AuthenticationParameters): Promise<TokenResponse>;
		send(route: 'msal-get-account'): Promise<TokenResponse>;
	}

	const promiseIpc: PromiseIpcMain | PromiseIpcRenderer;
	export default promiseIpc;
}