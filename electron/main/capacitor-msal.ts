import fs from 'fs';
import os from 'os';
import base64Url from 'base64url';
import FormData from 'form-data';
import jwtDecode from 'jwt-decode';
import promiseIpc from 'electron-promise-ipc';
import keytar from 'keytar';
import { createHash, randomBytes } from 'crypto';
import { BrowserWindow } from 'electron';
import { User, TokenResponse } from 'capacitor-msal';
import { default as fetch, Response } from 'electron-fetch';
import { Logger, NoOpLogger } from './logger';

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
	window?: BrowserWindow;
	logger?: Logger | null;
	tenant?: string;
	redirectUri?: string;
	clientId?: string;
	scopes?: string[];
}

export class AuthError extends Error {
	constructor(errorResponse: any) {
		super(errorResponse.error_description);
		Object.assign(this, errorResponse);
	}
}

export class CapacitorMsal {
	private options: MsalOptions;
	private logger: Logger;
	private tokens: TokenResponse;
	private tokensExpireAt: Date;

	init(options?: MsalOptions) {
		this.options = Object.assign({ logger: console }, options);

		// Replace null loggers with the NoOpLogger.
		this.logger = this.options.logger || new NoOpLogger();

		// Read the config file, if it exists.
		try {
			const file = fs.readFileSync('./capacitor.config.json', 'utf-8');
			const capConfig = JSON.parse(file).plugins.Msal;
			Object.assign(this.options, capConfig);
		} catch (error) {
			this.logger.warn('MSAL - Unable to read MSAL configuration from capacitor.config.json', error);
		}

		this.logger.debug('MSAL - Registering IPC event handlers')
		promiseIpc.on('capacitor-msal-login', () => this.login());
		promiseIpc.on('capacitor-msal-acquire-token', () => this.acquireToken());
	}

	private async login(): Promise<User> {
		this.logger.info('MSAL - Logging in the user');
		try {
			// Attempt to log in silently.
			await this.refreshTokens();
		} catch (error) {
			this.logger.warn('MSAL - Unable to refresh tokens. Attempting interactive login.', error);
			await this.loginInteractive();
		}

		return jwtDecode<User>(this.tokens.id_token);
	}

	private async acquireToken(): Promise<TokenResponse> {
		this.logger.info('MSAL - Acquiring access token');
		await this.refreshTokens();
		return this.tokens;
	}

	private async loginInteractive() {
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
		this.logger.debug('MSAL - Opening browser to the authorize endpoint');
		const redirectUrl = await new Promise<URL>(resolve => {
			const window = new BrowserWindow({
				width: 1000,
				height: 600,
				show: false,
				parent: this.options.window,
				modal: !!this.options.window,
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

		if (redirectUrl.searchParams.has('error')) {
			throw new AuthError({
				error: redirectUrl.searchParams.get('error'),
				error_description: redirectUrl.searchParams.get('error_description')
			});
		}

		const responseState = redirectUrl.searchParams.get('state');
		if (state !== responseState) {
			throw new AuthError({
				error: 'invalid_state',
				error_description: 'The response state does not match the request state.'
			});
		}

		// TODO: Add validation

		// Exchange the authorization code for a set of tokens.
		this.logger.debug('MSAL - Exchanging authorization code for user tokens');
		const response = await fetch(`https://login.microsoftonline.com/${this.options.tenant}/oauth2/v2.0/token`, {
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
		await this.processTokenResponse(response);
	}

	private async refreshTokens() {
		// No action needed if the tokens have not expired.
		if (this.tokensExpireAt > new Date()) {
			this.logger.debug('MSAL - Existing tokens are still valid');
			return;
		}

		this.logger.debug('MSAL - Retrieving most recent refresh token');
		const refreshToken = await keytar.getPassword(keytarService, keytarAccount);
		if (!refreshToken) {
			throw new AuthError({
				error: 'interaction_required',
				error_description: 'There is no refresh token available.'
			});
		}

		this.logger.info('MSAL - Refreshing user access tokens');
		const response = await fetch(`https://login.microsoftonline.com/${this.options.tenant}/oauth2/v2.0/token`, {
			method: 'POST',
			body: buildFormData({
				client_id: this.options.clientId,
				grant_type: 'refresh_token',
				scope: this.options.scopes.join(' '),
				refresh_token: refreshToken
			})
		});
		await this.processTokenResponse(response);
	}

	private async processTokenResponse(response: Response) {
		const tokens = await response.json();
		if (tokens.error) {
			throw new AuthError(tokens);
		}

		// Save the received tokens.
		this.tokens = tokens;

		// Compute when the tokens will expire.
		this.tokensExpireAt = new Date(Date.now() + (1000 * this.tokens.expires_in));

		// Store the refresh token to login silently.
		this.logger.debug('MSAL - Saving refresh token');
		keytar.setPassword(keytarService, keytarAccount, this.tokens.refresh_token);
	}
}

export default new CapacitorMsal();