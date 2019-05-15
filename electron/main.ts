import { readFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import { ipcMain, shell, BrowserWindow, app } from 'electron';
import { Issuer, Client, TokenSet } from 'openid-client';
import { resolve } from 'path';
import base64Url from 'base64url';

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
		
		if (process.defaultApp) {
			if (process.argv.length >= 2) {
				// In development, the electron path needs to be explicitly specified.
				const execPath = process.execPath.replace(/(\s+)/g, '\\$1');
				app.setAsDefaultProtocolClient(scheme, execPath, [resolve(process.argv[1])]);
			}
		} else {
			app.setAsDefaultProtocolClient(scheme);
		}

		// Protocol handler for macOS.
		app.on('open-url', (event, url) => {
			event.preventDefault();
			this.loginCallback(url);
		});

		// Protocol handler for Windows/Linux.
		app.on('second-instance', (_event, argv) => {
			// In development, there is an extra argument.
			const url = process.defaultApp ? argv[2] : argv[1];
			this.loginCallback(url);
		});
		
		ipcMain.on('capacitor-msal-login', () => this.login());
	}

	private async login(): Promise<void> {
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

	private async loginCallback(url: string): Promise<any> {
		console.log('Received external URL', url);
		const params = this.client.callbackParams(url);
		this.tokens = await this.client.callback(this.options.redirectUri, params, {
			response_type: 'code',
			state: this.state,
			code_verifier: this.codeVerifier
		});
		this.window.webContents.send('capacitor-msal-user-logged-in', this.tokens.claims());
	}
}