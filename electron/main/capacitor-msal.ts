import promiseIpc from 'electron-promise-ipc';
import fetch from 'electron-fetch';
import FormData from 'form-data';
import { BrowserWindow } from 'electron';
import { LoginRequest, TokenResponse, ErrorResponse } from '../definitions';

function buildFormData(obj: any): FormData {
	return Object.keys(obj).reduce((data, key) => {
		data.append(key, obj[key]);
		return data;
	}, new FormData());
}

export class CapacitorMsal {
	constructor() {
		promiseIpc.on('msal-login', request => this.login(request));
	}

	private async login(request: LoginRequest): Promise<TokenResponse> {
		// Login using a popup.
		const code = await new Promise<string>((resolve, reject) => {
			let receivedResponse = false;

			const window = new BrowserWindow({
				width: 1000,
				height: 600,
				show: false
				// TODO: Make this window a modal
			});
			window.loadURL(request.authorizeUrl);
			window.on('ready-to-show', () => window.show());
			window.on('closed', () => {
				if (!receivedResponse) {
					reject({ error: 'user_cancelled' });
				}
			});

			window.webContents.on('will-redirect', (_event, url) => {
				receivedResponse = true;
				window.close();

				const response = new URL(url).searchParams;
				if (response.has('error')) {
					reject({
						error: response.get('error'),
						error_description: response.get('error_description')
					});
				} else {
					const responseState = response.get('state');
					if (request.state === responseState) {
						resolve(response.get('code'));
					} else {
						reject({ error: 'invalid_state', state: responseState });
					}
				}
			});
		});

		const response = await fetch(request.tokenUrl, {
			method: 'POST',
			body: buildFormData({
				client_id: request.clientId,
				grant_type: 'authorization_code',
				scope: request.scope,
				code: code,
				redirect_uri: request.redirectUri,
				// TODO: code_verifier
			})
		});
		const tokenResponse = await response.json<TokenResponse | ErrorResponse>();

		if (this.isError(tokenResponse)) {
			throw tokenResponse;
		}

		// TODO: Save refresh token
		return tokenResponse;
	}

	private isError(response: TokenResponse | ErrorResponse): response is ErrorResponse {
		return (<ErrorResponse>response).error !== undefined;
	}
}