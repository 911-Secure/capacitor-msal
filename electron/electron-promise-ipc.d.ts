type IpcMainEvent = import('electron').IpcMainEvent;
type Configuration = import('msal/lib-es6').Configuration;
type AuthenticationParameters = import('msal/lib-es6').AuthenticationParameters;
type TokenSet = import('openid-client').TokenSet;

declare module 'electron-promise-ipc' {
	export type PromiseIpcBase = {
		// Methods should follow this pattern.
		// send(route: 'some-string', first: TFirst, second: TSecond): Promise<TReturn>;
		// on(route: 'some-string', listener: (first: TFirst, second: TSecond, event: IpcMainEvent) => Promise<TReturn> | TReturn): PromiseIpcBase;

		send(route: 'msal-init', options: Configuration): Promise<void>;
		on(route: 'msal-init', listener: (options: Configuration, event: IpcMainEvent) => Promise<void> | void): PromiseIpcBase;

		send(route: 'msal-login-popup', request?: AuthenticationParameters): Promise<TokenSet>;
		on(route: 'msal-login-popup', listener: (request: AuthenticationParameters | undefined, event: IpcMainEvent) => Promise<TokenSet> | TokenSet): PromiseIpcBase;

		send(route: 'msal-acquire-token-silent', request: AuthenticationParameters): Promise<TokenSet>;
		on(route: 'msal-acquire-token-silent', listener: (request: AuthenticationParameters, event: IpcMainEvent) => Promise<TokenSet> | TokenSet): PromiseIpcBase;

		send(route: 'msal-get-account'): Promise<TokenSet>;
		on(route: 'msal-get-account', listener: (event: IpcMainEvent) => Promise<TokenSet> | TokenSet): PromiseIpcBase;
	}

	const promiseIpc: PromiseIpcBase;
	export default promiseIpc;
}