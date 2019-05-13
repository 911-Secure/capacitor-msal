declare module "@capacitor/core" {
	interface PluginRegistry {
		Msal?: MsalPlugin;
	}
}

export interface MsalPlugin {
	readonly user: any;
	login(): Promise<void>;
	acquireToken(): Promise<{ token: string }>;
}
