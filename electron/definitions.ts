export interface LoginRequest {
	authorizeUrl: string;
	tokenUrl: string;
	state: string;
	clientId: string;
	scope: string;
	redirectUri: string;
}

export interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	scope: string;
	refresh_token?: string;
	id_token?: string;
	client_info?: string;
}

export interface ErrorResponse {
	error: string;
	error_description: string;
	error_codes?: number[],
	timestamp?: string;
	trace_id?: string;
	correlation_id?: string;
	state?: string;
}