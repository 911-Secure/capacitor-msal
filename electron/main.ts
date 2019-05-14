import fs from 'fs';
import { ipcMain, protocol, shell, BrowserWindow } from 'electron';
import { Issuer, Client, generators, TokenSet } from 'openid-client';

interface MsalOptions {
	tenant: string;
	redirectUri: string;
	clientId: string;
}

export class CapacitorMsal {
	private client: Client;
	private tokens: TokenSet;
	private state: string;
	private codeVerifier: string;

	constructor(private window: BrowserWindow, private options?: MsalOptions) { 
		// Read the config file, if it exists.
		let capConfig: any;
		try {
			capConfig = JSON.parse(fs.readFileSync('./capacitor.config.json', 'utf-8'));
		} catch (error) {
			console.error(error);
		}

		// Copy the options to an internal object.
		this.options = Object.assign({}, capConfig.plugins.Msal, this.options);
	}
	
	public async init(): Promise<void> {
		// Dynamically build the OAuth client information.
		const issuerUrl = `https://login.microsoftonline.com/${this.options.tenant}/v2.0`;
		const issuer = await Issuer.discover(issuerUrl);

		this.client = new issuer.Client({
			client_id: this.options.clientId,
			redriect_uris: [this.options.redirectUri],
			response_types: ['code']
		});

		// Register the scheme used by the Redirect URI.
		const scheme = new URL(this.options.redirectUri).protocol;
		protocol.registerHttpProtocol(scheme, async (request, callback) => {
			const params = this.client.callbackParams(request.url);
			this.tokens = await this.client.callback(this.options.redirectUri, params, {
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