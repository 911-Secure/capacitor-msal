import { readFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import { ipcMain, protocol, shell, BrowserWindow, app } from 'electron';
import { Issuer, Client, TokenSet } from 'openid-client';
import base64Url from 'base64url';
import isDevMode from 'electron-is-dev';
import path from 'path';

function random(bytes = 32): string {
	return base64Url.encode(randomBytes(bytes));
}

function codeChallenge(codeVerifier: string): string {
	return base64Url.encode(createHash('sha256').update(codeVerifier).digest());
}

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
		let capConfig: MsalOptions;
		try {
			const file = readFileSync('./capacitor.config.json', 'utf-8');
			capConfig = JSON.parse(file).plugins.Msal;
		} catch (error) {
			console.error(error);
		}

		// Copy the options to an internal object.
		this.options = Object.assign({}, capConfig, this.options);
	}
	
	public async init(): Promise<void> {
		// Dynamically build the OAuth client information.
		const issuerUrl = `https://login.microsoftonline.com/${this.options.tenant}/v2.0`;
		const issuer = await Issuer.discover(issuerUrl);

		this.client = new issuer.Client({
			client_id: this.options.clientId,
			response_types: ['code']
		});

		// Register the scheme used by the Redirect URI.
		const scheme = new URL(this.options.redirectUri).protocol.slice(0, -1);
		
		if (isDevMode) {
			// In development, the electron path needs to be explicitly specified.
			const electron = path.join(__dirname, 'node_modules/.bin/electron')
			app.setAsDefaultProtocolClient(scheme, electron, ['.']);
		} else {
			app.setAsDefaultProtocolClient(scheme);
		}
		
		protocol.registerHttpProtocol(scheme, async request => {
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
		this.state = random();
		this.codeVerifier = random();
		const challenge = codeChallenge(this.codeVerifier);

		// Open the user's browser to the sign-in page.
		const authorizeUrl = this.client.authorizationUrl({
			scope: 'openid',
			state: this.state,
			response_mode: 'query',
			code_challenge_method: 'S256',
			code_challenge: challenge,
			redirect_uri: this.options.redirectUri
		});
		shell.openExternal(authorizeUrl);
	}
}