import { Configuration, AuthenticationParameters, AuthResponse, Account } from 'msal/lib-es6';
export { Configuration, AuthenticationParameters, AuthResponse, Account } from 'msal/lib-es6';

declare module "@capacitor/core/dist/esm/core-plugin-definitions" {
	interface PluginRegistry {
		Msal?: MsalPlugin;
	}
}

export interface MsalPlugin {
	init(options: Configuration): Promise<void>;
	login(request?: AuthenticationParameters): Promise<AuthResponse>;
	acquireTokenSilent(request: AuthenticationParameters): Promise<AuthResponse>;
	acquireTokenInteractive(request: AuthenticationParameters): Promise<AuthResponse>;
	getLoginInProgress(): boolean;
	getAccount(): Promise<Account>;
}
