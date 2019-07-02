import keytar from 'keytar';
import promiseIpc from 'electron-promise-ipc';
import { BrowserWindow } from 'electron';
import { Configuration, AuthenticationParameters } from 'msal';
import { Issuer, Client, generators, TokenSet } from 'openid-client';

export class CapacitorMsal {
	private client: Client;
	private cache: TokenCache;

	constructor() {
		promiseIpc.on('msal-init', options => this.init(options));
		promiseIpc.on('msal-login', (redirectUri, request) => this.login(redirectUri, request));
		promiseIpc.on('msal-acquire-token', (redirectUri, request) => this.acquireToken(redirectUri, request));
	}

	public async init(options: Configuration): Promise<void> {
		this.cache = new TokenCache(`msal-${options.auth.clientId}`);

		const issuer = await Issuer.discover(options.auth.authority);
		this.client = new issuer.Client({
			client_id: options.auth.clientId,
			redirect_uris: [options.auth.redirectUri as string],
			post_logout_redirect_uris: [options.auth.postLogoutRedirectUri as string]
		});
	}

	public async login(redirectUri: string, request?: AuthenticationParameters): Promise<TokenSet> {
		const requestScopes = [
			...(request && request.scopes || []),
			...(request && request.extraScopesToConsent || [])
		];
		const cached = await this.cache.getToken(requestScopes);

		if (!cached) {
			return await this.loginPopup(redirectUri, requestScopes, request);
		}

		if (typeof cached === 'string') {
			return await this.refresh(cached, requestScopes);
		}

		return cached;
	}

	public async acquireToken(redirectUri: string, request: AuthenticationParameters): Promise<TokenSet> {
		const requestScopes = [
			...(request.scopes || []),
			...(request.extraScopesToConsent || [])
		];
		const cached = await this.cache.getToken(requestScopes);

		if (!cached) {
			request.prompt = 'none';
			return await this.loginPopup(redirectUri, requestScopes, request);
		}

		if (typeof cached === 'string') {
			return await this.refresh(cached, requestScopes);
		}

		return cached;
	}

	private async loginPopup(redirectUri: string, requestScopes: string[], request?: AuthenticationParameters): Promise<TokenSet> {
		const verifier = generators.codeVerifier();
		const challenge = generators.codeChallenge(verifier);

		const authorizeUrl = this.client.authorizationUrl({
			redirect_uri: redirectUri,
			scope: requestScopes.join(' '),
			response_mode: 'query',
			prompt: request && request.prompt,
			login_hint: request && request.loginHint,
			// TODO: domain_hint,
			code_challenge_method: 'S256',
			code_challenge: challenge
		});

		// Login using a popup.
		const responseUrl = await new Promise<string>((resolve, reject) => {
			let receivedResponse = false;

			const window = new BrowserWindow({
				width: 1000,
				height: 600,
				show: false
				// TODO: Make this window a modal
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

		const params = this.client.callbackParams(responseUrl);
		const tokens = await this.client.callback(redirectUri, params, {
			response_type: 'code',
			code_verifier: verifier
		});

		this.cache.setToken(tokens);
		return tokens;
	}

	private async refresh(refreshToken: string, requestScopes: string[]) {
		const tokens = await this.client.refresh(refreshToken, { exchangeBody: { scope: requestScopes.join(' ') } });
		this.cache.setToken(tokens);
		return tokens;
	}
}

class TokenCache {
	private tokens = new Map<string, TokenSet>();

	constructor(private keytarService: string) { }

	public async getToken(requestScopes: string[]): Promise<TokenSet | string | undefined> {
		for (const [scope, tokens] of this.tokens.entries()) {
			const tokenScopes = scope.split(' ');

			if (tokens.expired()) {
				this.tokens.delete(scope);
			}

			if (requestScopes.every(scope => tokenScopes.includes(scope))) {
				return tokens;
			}
		}

		const refreshTokens = await keytar.findCredentials(this.keytarService);
		const refreshToken = refreshTokens.find(token => {
			const tokenScopes = token.account.split(' ');
			return requestScopes.every(scope => tokenScopes.includes(scope));
		});

		return refreshToken && refreshToken.password;
	}

	public async setToken(tokens: TokenSet): Promise<void> {
		// Save the tokens in memory.
		this.tokens.set(tokens.scope, tokens);

		// Save the refresh token (if available) in the OS keychain.
		if (tokens.refresh_token) {
			await keytar.setPassword(this.keytarService, tokens.scope, tokens.refresh_token);
		}
	}
}

export default new CapacitorMsal();
