import { readFileSync } from 'fs';
import { createHash, randomBytes } from 'crypto';
import { ipcMain, BrowserWindow } from 'electron';
import { Issuer, Client, TokenSet } from 'openid-client';
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

		ipcMain.on('capacitor-msal-login', async (event: any) =>{
			const user = await this.login();
			event.reply('capacitor-msal-login-reply', user);
		});
	}
	
	public async init(): Promise<void> {
		// Dynamically build the OAuth client information.
		const issuerUrl = `https://login.microsoftonline.com/${this.options.tenant}/v2.0`;
		const issuer = await Issuer.discover(issuerUrl);

		this.client = new issuer.Client({
			client_id: this.options.clientId,
			response_types: ['code'],
			token_endpoint_auth_method: 'none'
		});
	}

	private async login(): Promise<any> {
		// Generate the nonces used by OAuth.
		const state = random();
		const codeVerifier = random();
		const challenge = codeChallenge(codeVerifier);

		// Open the user's browser to the sign-in page.
		const authorizeUrl = this.client.authorizationUrl({
			scope: 'openid',
			state: state,
			response_mode: 'query',
			code_challenge_method: 'S256',
			code_challenge: challenge,
			redirect_uri: this.options.redirectUri
		});
		const redirectUrl = await this.loginWithBrowser(authorizeUrl);

		// Exchange the authorization code for a set of tokens.
		const params = this.client.callbackParams(redirectUrl);
		this.tokens = await this.client.authorizationCallback(this.options.redirectUri, params, {
			response_type: 'code',
			state: state,
			code_verifier: codeVerifier
		});

		// Return the user's information from the id_token.
		return this.tokens.claims();
	}

	private async loginWithBrowser(authorizeUrl: string): Promise<string> {
		return new Promise<string>(resolve => {
			const window = new BrowserWindow({
				width: 1000,
				height: 600,
				show: false,
				parent: this.window,
				modal: true,
				webPreferences: {
					nodeIntegration: false
				}
			});
			
			window.loadURL(authorizeUrl);
			
			window.on('ready-to-show', () => {
				window.show();
			});
			
			window.webContents.on('will-redirect', (event, url) => {
				event.preventDefault();
				window.close();
				resolve(url);
			});
		});
	}
}