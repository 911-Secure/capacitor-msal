import { Configuration, AuthenticationParameters, AuthResponse, Account } from 'msal/lib-es6';
export { Configuration, AuthenticationParameters, AuthResponse, Account } from 'msal/lib-es6';

declare module "@capacitor/core/dist/esm/core-plugin-definitions" {
	interface PluginRegistry {
		Msal?: MsalPlugin;
	}
}

export interface MsalPlugin {
	init(options: Configuration): Promise<void>;
	loginPopup(request?: AuthenticationParameters): Promise<AuthResponse>;
	acquireTokenSilent(request: AuthenticationParameters): Promise<AuthResponse>;
	acquireTokenPopup(request: AuthenticationParameters): Promise<AuthResponse>;
	getAccount(): Promise<Account>;
}
