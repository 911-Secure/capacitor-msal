import fs from 'fs';
import promiseIpc from 'electron-promise-ipc';
import { BrowserWindow } from 'electron';
import { Configuration, AuthenticationParameters, AuthResponse, Account } from 'msal';
import { Issuer, Client, generators, TokenSet } from 'openid-client';
import { IdToken } from 'msal/lib-commonjs/IdToken';
import { ClientInfo } from 'msal/lib-commonjs/ClientInfo';

export class CapacitorMsal {
	private client: Client;
	private loginTokens: TokenSet;

	constructor() {
		promiseIpc.on('msal-init', options => this.init(options));
		promiseIpc.on('msal-login', request => this.login(request));
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

	public async login(request?: AuthenticationParameters): Promise<AuthResponse> {
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
			exchangeBody: { scope: scopes.join(' ') }
		});

		return this.tokensToResponse(this.loginTokens);
	}

	private tokensToResponse(tokens: TokenSet): AuthResponse {
		const claims = tokens.claims();
		const idToken = new IdToken(tokens.id_token);
		return {
			uniqueId: claims.oid || claims.sub,
			tenantId: claims.tid,
			tokenType: tokens.token_type,
			idToken: idToken,
			idTokenClaims: claims,
			accessToken: tokens.access_token,
			scopes: tokens.scope.split(' '),
			expiresOn: new Date(tokens.expires_at),
			account: Account.createAccount(idToken, new ClientInfo(tokens.client_info)),
			accountState: tokens.session_state
		};
	}
}

export default new CapacitorMsal();
