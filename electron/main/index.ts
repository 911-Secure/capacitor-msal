import promiseIpc from 'electron-promise-ipc';
import { BrowserWindow } from 'electron';
import { Configuration, AuthenticationParameters } from 'msal';
import { Issuer, Client, generators, TokenSet } from 'openid-client';

export class CapacitorMsal {
	private client: Client;

	constructor() {
		promiseIpc.on('msal-init', options => this.init(options));
		promiseIpc.on('msal-login', (redirectUri, request) => this.login(redirectUri, request));
	}

	async init(options: Configuration): Promise<void> {
		const issuer = await Issuer.discover(options.auth.authority);
		this.client = new issuer.Client({
			client_id: options.auth.clientId,
			redirect_uris: [options.auth.redirectUri as string],
			post_logout_redirect_uris: [options.auth.postLogoutRedirectUri as string]
		});
	}

	async login(redirectUri: string, request?: AuthenticationParameters): Promise<TokenSet> {
		const verifier = generators.codeVerifier();
		const challenge = generators.codeChallenge(verifier);

		const scopes = request.scopes || [];
		const extraScopes = request.extraScopesToConsent || [];

		const authorizeUrl = this.client.authorizationUrl({
			redirect_uri: redirectUri,
			scope: [...scopes, ...extraScopes].join(' '),
			response_mode: 'query',
			prompt: request.prompt,
			login_hint: request.loginHint,
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
			window.loadURL(authorizeUrl);
			window.on('ready-to-show', () => window.show());
			window.on('closed', () => {
				if (!receivedResponse) {
					reject({ error: 'user_cancelled' });
				}
			});

			window.webContents.on('will-redirect', (_event, url) => {
				receivedResponse = true;
				window.close();
				resolve(url);
			});
		});

		const params = this.client.callbackParams(responseUrl);
		const tokens = await this.client.callback(redirectUri, params, {
			response_type: 'code',
			code_verifier: verifier
		});

		// TODO: Save refresh token

		return tokens;
	}
}