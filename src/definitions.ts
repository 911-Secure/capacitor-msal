declare module "@capacitor/core" {
	interface PluginRegistry {
		Msal?: MsalPlugin;
	}
}

export interface MsalPlugin {
	echo(options: { value: string }): Promise<{ value: string }>;
}
