import fs from 'fs';
import path from 'path';
import keytar from 'keytar';
import promiseIpc from 'electron-promise-ipc';
import { app, BrowserWindow, IpcMainEvent } from 'electron';
import { Configuration, AuthenticationParameters } from 'msal';
import { Issuer, Client, generators, TokenSet } from 'openid-client';

interface Logger {
	debug(...params: any[]): void;
	info(...params: any[]): void;
	warn(...params: any[]): void;
	error(...params: any[]): void;
}

export class CapacitorMsal {
	private client: Client;
	private tokens: TokenSet;
	private keytarService: string;

	constructor(private logger: Logger = console) { }

	public init(): void {
		this.logger.debug('Initializing IPC handlers.');
		promiseIpc.on('msal-init', options => this.msalInit(options));
		promiseIpc.on('msal-login-popup', (request, event) => this.loginPopup(request, event));
		promiseIpc.on('msal-acquire-token-silent', request => this.acquireTokenSilent(request));
		promiseIpc.on('msal-get-account', () => this.getAccount());
	}

	private async msalInit(options: Configuration): Promise<void> {
		this.logger.debug('Loading Capcaitor configuration.');
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

		this.logger.debug('Initializing OAuth client.');
		const issuer = await Issuer.discover(options.auth.authority);
		this.client = new issuer.Client({
			client_id: options.auth.clientId,
			redirect_uris: [options.auth.redirectUri as string],
			post_logout_redirect_uris: [options.auth.postLogoutRedirectUri as string],
			token_endpoint_auth_method: 'none'
		});

		this.tokens = await this.getCachedTokens();
	}

	private async loginPopup(request: AuthenticationParameters, event: IpcMainEvent): Promise<TokenSet> {
		const scopes = request && request.scopes || [];
		const extraScopes = request && request.extraScopesToConsent || [];

		const verifier = generators.codeVerifier();
		const challenge = generators.codeChallenge(verifier);

		const authorizeUrl = this.client.authorizationUrl({
			scope: scopes.concat(extraScopes).join(' '),
			response_mode: 'query',
			prompt: request && request.prompt,
			login_hint: request && request.loginHint,
			// TODO: domain_hint,
			code_challenge_method: 'S256',
			code_challenge: challenge
		});

		// Login using a popup.
		this.logger.info('Opening login popup window.');
		const responseUrl = await new Promise<string>((resolve, reject) => {
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
						error: 'user_cancelled',
						error_description: 'User cancelled the flow.'
					});
				}
			});

			window.webContents.on('will-redirect', (_event, url) => {
				receivedResponse = true;
				window.close();
				resolve(url);
			});

			window.loadURL(authorizeUrl);
		});

		this.logger.info('Acquiring access token.');
		const redirectUri = this.client.metadata.redirect_uris[0];
		const params = this.client.callbackParams(responseUrl);
		this.tokens = await this.client.callback(redirectUri, params, {
			response_type: 'code',
			code_verifier: verifier
		}, {
			exchangeBody: {
				scope: scopes.join(' '),
				client_info: 1 // Needed to get MSAL-specific info.
			}
		});

		await this.cacheTokens(this.tokens);
		return this.tokens;
	}

	private async acquireTokenSilent(request: AuthenticationParameters): Promise<TokenSet> {
		if (this.tokens.expired()) {
			if (this.tokens.refresh_token) {
				this.logger.info('Refreshing access tokens.');
				this.tokens = await this.client.refresh(this.tokens, {
					exchangeBody: {
						scope: (request.scopes || []).join(' '),
						client_info: 1 // Needed to get MSAL-specific info.
					}
				});
				await this.cacheTokens(this.tokens);
			} else {
				throw {
					error: 'interaction_required',
					error_description: 'The request requires user interaction. For example, an additional authentication step is required.'
				};
			}
		}

		return this.tokens;
	}

	private getAccount(): TokenSet {
		return this.tokens;
	}

	private async getCachedTokens(): Promise<TokenSet> {
		this.logger.debug('Retrieving refresh token from cache.');
		const refreshToken = await keytar.getPassword(this.keytarService, 'tokens');
		return new TokenSet({
			refresh_token: refreshToken,
			expires_at: 0 // Force refresh
		});
	}

	private cacheTokens(tokens: TokenSet): Promise<void> {
		this.logger.debug('Caching refresh token.');
		return keytar.setPassword(this.keytarService, 'tokens', tokens.refresh_token);
	}
}
