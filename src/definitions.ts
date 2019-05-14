import { PluginListenerHandle } from "@capacitor/core";

declare module "@capacitor/core" {
	interface PluginRegistry {
		Msal?: MsalPlugin;
	}
}

export interface MsalPlugin {
	readonly user: any;
	login(): Promise<void>;
	acquireToken(): Promise<{ token: string }>;
	addListener(eventName: 'userLoggedIn', listenerFunc: (user: any) => void): PluginListenerHandle;
}
