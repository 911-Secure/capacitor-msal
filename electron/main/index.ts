import fs from 'fs';
import os from 'os';
import base64Url from 'base64url';
import FormData from 'form-data';
import fetch from 'electron-fetch';
import jwtDecode from 'jwt-decode';
import promiseIpc from 'electron-promise-ipc';
import keytar from 'keytar';
import { createHash, randomBytes } from 'crypto';
import { BrowserWindow } from 'electron';
import { User, TokenResponse } from 'capacitor-msal';

const keytarService = 'com.secure911.gatekeeper';
const keytarAccount = os.userInfo().username;

function random(bytes = 32): string {
	return base64Url.encode(randomBytes(bytes));
}

function codeChallenge(codeVerifier: string): string {
	return base64Url.encode(createHash('sha256').update(codeVerifier).digest());
}

function buildFormData(obj: any): FormData {
    return Object.keys(obj).reduce((data, key) => {
        data.append(key, obj[key]);
        return data;
    }, new FormData());
}

interface MsalOptions {
	tenant: string;
	redirectUri: string;
	clientId: string;
	scopes: string[];
}

export class CapacitorMsal {
	private tokens: TokenResponse;
	private tokensExpireAt: Date;

	constructor(private window: BrowserWindow, private options?: MsalOptions) { 
		// Read the config file, if it exists.
		let capConfig: MsalOptions;
		try {
			const file = fs.readFileSync('./capacitor.config.json', 'utf-8');
			capConfig = JSON.parse(file).plugins.Msal;
		} catch (error) {
			console.error(error);
		}

		// Copy the options to an internal object.
		this.options = Object.assign({}, capConfig, options);

		promiseIpc.on('capacitor-msal-login', () => this.login());
		promiseIpc.on('capacitor-msal-acquire-token', () => this.acquireToken());
	}

	private async login(): Promise<User> {
		// Generate the nonces used by OAuth.
		const state = random();
		const codeVerifier = random();
		const challenge = codeChallenge(codeVerifier);

		// Build the authorization URL.
		const authorizeUrl = new URL(`https://login.microsoftonline.com/${this.options.tenant}/oauth2/v2.0/authorize`);
		const authParams = new URLSearchParams({
			client_id: this.options.clientId,
			response_type: 'code',
			redirect_uri: this.options.redirectUri,
			scope: this.options.scopes.join(' '),
			response_mode: 'query',
			state: state,
			code_challenge_method: 'S256',
			code_challenge: challenge
		});
		authorizeUrl.search = authParams.toString();
		
		// Open the user's browser to the sign-in page.
		const redirectUrl = await this.loginWithPopup(authorizeUrl);

		// TODO: Add error handling
		// TODO: Add validation

		// Exchange the authorization code for a set of tokens.
		const res = await fetch(`https://login.microsoftonline.com/${this.options.tenant}/oauth2/v2.0/token`, {
			method: 'POST',
			body: buildFormData({
				client_id: this.options.clientId,
				grant_type: 'authorization_code',
				scope: this.options.scopes.join(' '),
				code: redirectUrl.searchParams.get('code'),
				redirect_uri: this.options.redirectUri,
				code_verifier: codeVerifier
			})
		});
		const response = await res.json<TokenResponse>();

		// TODO: Add error handling

		this.tokens = response;

		// Compute when the tokens will expire.
		this.tokensExpireAt = new Date(Date.now() + (1000 * this.tokens.expires_in));

		// Store the refresh token to login silently.
		keytar.setPassword(keytarService, keytarAccount, this.tokens.refresh_token);

		// TODO: Add validation
		return jwtDecode<User>(this.tokens.id_token);
	}

	private async acquireToken(): Promise<TokenResponse> {
		if (this.tokensExpireAt <= new Date()) {
			const refreshToken = await keytar.getPassword(keytarService, keytarAccount);
			// TODO: Handle no available token.

			const res = await fetch(`https://login.microsoftonline.com/${this.options.tenant}/oauth2/v2.0/token`, {
				method: 'POST',
				body: buildFormData({
					client_id: this.options.clientId,
					grant_type: 'refresh_token',
					scope: this.options.scopes.join(' '),
					refresh_token: refreshToken
				})
			});
			// TODO: Add error handling

			this.tokens = await res.json<TokenResponse>();

			// Compute when the tokens will expire.
			this.tokensExpireAt = new Date(Date.now() + (1000 * this.tokens.expires_in));

			// Store the refresh token to login silently.
			keytar.setPassword(keytarService, keytarAccount, this.tokens.refresh_token);
		}

		return this.tokens;
	}

	private async loginWithPopup(authorizeUrl: URL): Promise<URL> {
		return new Promise<URL>(resolve => {
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
			
			window.loadURL(authorizeUrl.href);
			
			window.on('ready-to-show', () => {
				window.show();
			});
			
			window.webContents.on('will-redirect', (event, url) => {
				event.preventDefault();
				window.close();
				resolve(new URL(url));
			});
		});
	}
}