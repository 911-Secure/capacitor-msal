import { ipcMain, protocol, shell, BrowserWindow } from 'electron';
import { Issuer, Client, generators, TokenSet } from 'openid-client';

export class CapacitorMsal {
	private client: Client;
	private tokens: TokenSet;
	private state: string;
	private codeVerifier: string;

	constructor(private window: BrowserWindow) { }
	
	public async init(): Promise<void> {
		// TODO: Pull all necessary information from configuration.
		const tenant = 'organizations';
		const redirectUri = '';
		const clientId = '';

		const issuer =
			await Issuer.discover(`https://login.microsoftonline.com/${tenant}/v2.0`);

		this.client = new issuer.Client({
			client_id: clientId,
			redriect_uris: [redirectUri],
			response_types: ['code']
		});

		// Register the scheme used by the Redirect URI.
		const scheme = new URL(redirectUri).protocol;
		protocol.registerHttpProtocol(scheme, async (request, callback) => {
			const params = this.client.callbackParams(request.url);
			this.tokens = await this.client.callback(redirectUri, params, {
				response_type: 'code',
				state: this.state,
				code_verifier: this.codeVerifier
			});
			this.window.webContents.send('capacitor-msal-user-logged-in', this.tokens.claims());
		});

		ipcMain.on('capacitor-msal-login', () => this.login());
	}

	private async login(): Promise<any> {
		// Generate the nonces used by OAuth.
		this.state = generators.random();
		this.codeVerifier = generators.random();
		const codeChallenge = generators.codeChallenge(this.codeVerifier);

		// Open the user's browsers to the sign-in page.
		const authorizeUrl = this.client.authorizationUrl({
			scope: 'openid',
			state: this.state,
			response_mode: 'query',
			code_challenge_method: 'S256',
			code_challenge: codeChallenge
		});
		shell.openExternal(authorizeUrl);
	}
}