export interface OpenIdConfiguration {
	token_endpoint: string;
	token_endpoint_auth_methods_supported: string[];
	jwks_uri: string;
	response_modes_supported: string[];
	subject_types_supported: string[];
	id_token_signing_alg_values_supported: string[];
	response_types_supported: string[];
	scopes_supported: string[];
	issuer: string;
	request_uri_parameter_supported: boolean;
	userinfo_endpoint: string;
	authorization_endpoint: string;
	http_logout_supported: boolean;
	frontchannel_logout_supported: boolean;
	end_session_endpoint: string;
	claims_supported: string[];
	tenant_region_scope: string | null;
	cloud_instance_name: string;
	cloud_graph_host_name: string;
	msgraph_host: string;
	rbac_url: string;
}

export interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	expires_at: Date;
	scope: string;
	refresh_token?: string;
	id_token?: string;
	client_info?: string;
	session_state?: string;
}

export interface ErrorResponse {
	error: string;
	error_description: string;
	error_codes: number[];
	timestamp: string;
	trace_id: string;
	correlation_id: string;
}