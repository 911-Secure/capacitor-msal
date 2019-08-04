import fs from 'fs';
import promiseIpc from 'electron-promise-ipc';
import { BrowserWindow } from 'electron';
import { Configuration, AuthenticationParameters } from 'msal';
import { Issuer, Client, generators, TokenSet } from 'openid-client';

export class CapacitorMsal {
	private client: Client;
	private loginTokens: TokenSet;

	constructor() {
		promiseIpc.on('msal-init', options => this.init(options));
		promiseIpc.on('msal-login-popup', request => this.loginPopup(request));
		promiseIpc.on('msal-acquire-token-silent', request => this.acquireTokenSilent(request));
		promiseIpc.on('msal-get-account', () => this.getAccount());
	}

	public async init(options: Configuration): Promise<void> {
		try {
			const configFile = fs.readFileSync('./capacitor.config.json', 'utf-8');
			const config = JSON.parse(configFile);
			options.auth = {
				...options.auth,
				...config.plugins.Msal
			};
		} catch (e) {
			console.warn('Unable to read Capacitor config file.', e);
		}

		// The official MSAL libraries assume v2. We need to add it explicitly.
		options.auth.authority += '/v2.0';

		const issuer = await Issuer.discover(options.auth.authority);
		this.client = new issuer.Client({
			client_id: options.auth.clientId,
			redirect_uris: [options.auth.redirectUri as string],
			post_logout_redirect_uris: [options.auth.postLogoutRedirectUri as string],
			token_endpoint_auth_method: 'none'
		});
	}

	public async loginPopup(request?: AuthenticationParameters): Promise<TokenSet> {
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

		const redirectUri = this.client.metadata.redirect_uris[0];
		const params = this.client.callbackParams(responseUrl);
		this.loginTokens = await this.client.callback(redirectUri, params, {
			response_type: 'code',
			code_verifier: verifier
		}, {
			exchangeBody: { 
				scope: scopes.join(' '),
				client_info: 1 // Needed to get MSAL-specific info.
			}
		});

		return this.loginTokens;
	}

	public async acquireTokenSilent(request: AuthenticationParameters): Promise<TokenSet> {
		if (this.loginTokens.expired()) {
			this.loginTokens = await this.client.refresh(this.loginTokens, {
				exchangeBody: {
					scope: (request.scopes || []).join(' '),
					client_info: 1 // Needed to get MSAL-specific info.
				}
			});
		}

		return this.loginTokens;
	}

	public getAccount(): TokenSet {
		return this.loginTokens;
	}
}

export default new CapacitorMsal();
