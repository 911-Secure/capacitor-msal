import { Configuration, AuthenticationParameters, AuthResponse } from 'msal';
export { Configuration, AuthenticationParameters, AuthResponse } from 'msal';

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
}
