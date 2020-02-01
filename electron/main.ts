import fs from 'fs';
import path from 'path';
import keytar from 'keytar';
import fetch from 'electron-fetch';
import base64url from 'base64url';
import FormData from 'form-data';
import { createHash, randomBytes } from 'crypto';
import { default as promiseIpc, PromiseIpcMain } from 'electron-promise-ipc';
import { app, BrowserWindow } from 'electron';
import { OpenIdConfiguration, TokenResponse, ErrorResponse } from './msal';

interface Logger {
	debug(...params: any[]): void;
	info(...params: any[]): void;
	warn(...params: any[]): void;
	error(...params: any[]): void;
}

export class CapacitorMsal {
	private openId: OpenIdConfiguration;
	private options: Configuration;
	private tokens: TokenResponse;
	private keytarService: string;
	private ipc: PromiseIpcMain = promiseIpc;

	constructor(private logger: Logger = console) { }

	public init(): void {
		this.logger.debug('Initializing IPC handlers');

		this.ipc.on('msal-init', async options => {
			this.logger.debug('Loading Capcaitor configuration');
			const filePath = path.join(app.getAppPath(), 'capacitor.config.json');
			const configFile = fs.readFileSync(filePath, 'utf-8');

			const config = JSON.parse(configFile);
			this.keytarService = config.appId;

			options.auth = {
				...options.auth,
				...config.plugins.Msal
			};

			// The official MSAL libraries assume v2. We need to add it explicitly.
			options.auth.authority += '/v2.0';

			this.logger.debug('Retrieving OpenID Connect metadata');
			const response = await fetch(`${options.auth.authority}/.well-known/openid-configuration`);
			this.openId = await response.json();

			this.options = options;
			this.tokens = await this.getCachedTokens();
		});

		this.ipc.on('msal-login-popup', (request, event) => this.loginPopup(request, event));

		this.ipc.on('msal-acquire-token-silent', async (request, event) => {
			if (this.tokens.expires_at < new Date()) {
				if (this.tokens.refresh_token) {
					this.logger.info('Refreshing access tokens.');

					const formData = new FormData();
					formData.append('client_id', this.options.auth.clientId);
					formData.append('grant_type', 'refresh_token');
					formData.append('scope', (request.scopes || []).join(' '));
					formData.append('refresh_token', this.tokens.refresh_token);
					formData.append('client_info', 1); // Needed to get MSAL-specific info.

					await this.acquireTokens(formData);
				} else {
					this.logger.debug('No refresh token, trying a silent popup');
					request.prompt = 'none';
					await this.loginPopup(request, event);
				}
			}

			return this.tokens;
		});

		this.ipc.on('msal-get-account', () => this.tokens);
	}

	private async loginPopup(request: AuthenticationParameters, event: IpcMainEvent) {
		const scopes = request && request.scopes || [];
		const extraScopes = request && request.extraScopesToConsent || [];

		const verifier = base64url(randomBytes(32));
		const challenge = base64url(createHash('sha256').update(verifier).digest());

		const authorizeUrl = new URL(this.openId.authorization_endpoint);
		authorizeUrl.searchParams.append('client_id', this.options.auth.clientId);
		authorizeUrl.searchParams.append('response_type', 'code');
		authorizeUrl.searchParams.append('redirect_uri', this.options.auth.redirectUri as string),
		authorizeUrl.searchParams.append('scope', scopes.concat(extraScopes).join(' '));
		authorizeUrl.searchParams.append('response_mode', 'query');
		authorizeUrl.searchParams.append('code_challenge_method', 'S256');
		authorizeUrl.searchParams.append('code_challenge', challenge);

		if (request && request.prompt) {
			authorizeUrl.searchParams.append('prompt', request.prompt);
		}
		if (request && request.loginHint) {
			authorizeUrl.searchParams.append('login_hint', request.loginHint);
		}

		// Login using a popup.
		this.logger.debug('Opening login popup window.');
		const responseUrl = await new Promise<URL>((resolve, reject) => {
			let receivedResponse = false;

			const window = new BrowserWindow({
				width: 1000,
				height: 600,
				show: false,
				parent: BrowserWindow.fromWebContents(event.sender),
				modal: true
			});

			if (request.prompt !== 'none') {
				window.on('ready-to-show', () => window.show());
			}

			window.on('closed', () => {
				if (!receivedResponse) {
					reject({
						errorCode: 'user_cancelled',
						errorMessage: 'User cancelled the flow.'
					});
				}
			});

			window.webContents.on('will-redirect', (_event, url) => {
				receivedResponse = true;
				window.close();
				resolve(new URL(url));
			});

			window.loadURL(authorizeUrl.href);
		});

		if (responseUrl.searchParams.has('error')) {
			throw {
				errorCode: responseUrl.searchParams.get('error'),
				errorMessage: responseUrl.searchParams.get('error_description')
			};
		}

		this.logger.info('Acquiring access token.');
		const formData = new FormData();
		formData.append('client_id', this.options.auth.clientId);
		formData.append('grant_type', 'authorization_code');
		formData.append('scope', scopes.join(' '));
		formData.append('code', responseUrl.searchParams.get('code'));
		formData.append('redirect_uri', this.options.auth.redirectUri);
		formData.append('code_verifier', verifier);
		formData.append('client_info', 1); // Needed to get MSAL-specific info.

		return await this.acquireTokens(formData);
	}

	private async acquireTokens(formData: FormData): Promise<TokenResponse> {
		const response = await fetch(this.openId.token_endpoint, {
			method: 'POST',
			body: formData
		});
		const tokenResponse = await response.json<TokenResponse | ErrorResponse>();
		if (isErrorResponse(tokenResponse)) {
			throw tokenResponse;
		}

		// Calculate the expiration time so future checks will be accurate.
		tokenResponse.expires_at = new Date(Date.now() + tokenResponse.expires_in * 1000);

		// TODO: Validate id_token

		await this.cacheTokens(this.tokens);
		return tokenResponse;
	}

	private async getCachedTokens(): Promise<TokenResponse> {
		this.logger.debug('Retrieving refresh token from cache.');
		const refreshToken = await keytar.getPassword(this.keytarService, 'tokens');
		return {
			refresh_token: refreshToken,
			expires_at: new Date() // Force refresh
		} as TokenResponse;
	}

	private cacheTokens(tokens: TokenResponse): Promise<void> {
		this.tokens = tokens;
		// TODO: Cache the entire collection, not just the refresh token.
		this.logger.debug('Caching refresh token.');
		return keytar.setPassword(this.keytarService, 'tokens', tokens.refresh_token);
	}
}

function isErrorResponse(response: TokenResponse | ErrorResponse): response is ErrorResponse {
	return 'error' in response;
}
