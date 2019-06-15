import { Configuration } from 'msal';

declare module "@capacitor/core" {
	interface PluginRegistry {
		Msal?: MsalPlugin;
	}
}

export interface MsalPlugin {
	init(options: Configuration): Promise<void>;
}

export interface TokenResponse {
	/**
	 * The requested access token. The app can use this token to authenticate to the
	 * secured resource, such as a web API.
	 */
	access_token: string;

	/**
	 * Indicates the token type value. The only type that Azure AD supports is Bearer.
	 */
	token_type: string;

	/**
	 * How long the access token is valid (in seconds).
	 */
	expires_in: number;

	/**
	 * The scopes that the access_token is valid for.
	 */
	scope: string;

	/**
	 * An OAuth 2.0 refresh token. The app can use this token acquire additional access
	 * tokens after the current access token expires. Refresh_tokens are long-lived and
	 * can be used to retain access to resources for extended periods of time. For more
	 * detail on refreshing an access token, refer to MSDN.
	 * Note: Only provided if `offline_access` scope was requested.
	 */
	refresh_token?: string;

	/**
	 * A JSON Web Token (JWT). The app can decode the sgements of this token to request
	 * information about the user who signed in. The app can cache the values and display
	 * them, but it should not rely on them for any authorization or security boundaries.
	 * For more information about id_tokens, see the id_token reference.
	 * Note: Only provided if `openid` scope was requested.
	 */
	id_token?: string;
}

export interface User {
	/**
	 * Identifies the intended recipient of the token. In `id_tokens`, the audience
	 * is your app's Application ID, assigned to your app in the Azure portal. Your
	 * app should validate this value, and reject the token if the value does not match.
	 */
	aud: string;

	/**
	 * Identifies the security token service (STS) that constructs and returns the
	 * token, and the Azure AD tenant in which the user was authenticated. If the
	 * token was issued by the v2.0 endpoint, the URI will end in `/v2.0`. The GUID
	 * that indicates that the user is a consumer user from a Microsoft acocunt is
	 * `9188040d-6c67-4c5b-b112-36a304b66dad`. Your app should use the GUID portion
	 * of the claim to restrict the set of tenants that can sign in to the app, if
	 * applicable.
	 */
	iss: string;

	/**
	 * "Issued At" indicates when the authentication for this token occurred.
	 */
	iat: number;

	/**
	 * Records the identiti provider that authenticated the subject of the token.
	 * This value is identical to the value of the Issuer claim unless the user
	 * account not in the same tenant as the issuer - guests, for instance. If the
	 * claim isn't present, it means that the value of `iss` can be used instead.
	 * For personal accounts being used in an organizational context (for instance,
	 * a personal account invited to an Azure AD tenant), the `idp` claim may be
	 * 'live.com' or an STS URI containing the Microsoft account tenant
	 * `9188040d-6c67-4c5b-b112-36a304b66dad`.
	 */
	idp?: string;

	/**
	 * The "nbf" (not before) claim identifies the time before which the JWT MUST
	 * NOT be accepted for processing.
	 */
	nbf: number;

	/**
	 * The "exp" (expiration time) claim identifies the expiration time on or after
	 * which the JWT MUST NOT be accepted for processsing. It's important to note that
	 * a resource may reject the token before this time as well - if, for example, a
	 * change in authentication is required or a token revocation has been detected.
	 */
	exp: number;

	/**
	 * The code hash is included in ID tokens only when the ID token is issued with
	 * an OAuth 2.0 authorization code. It can be used to validate the authenticity
	 * of an authorization code. for details about performing this validation, see
	 * the OpenID Connect specification.
	 */
	c_hash?: string;

	/**
	 * The access token hash is included in ID tokens only when the ID token is issued
	 * with an OAuth 2.0 access token. It can be used to validate the authenticity of
	 * an access token. For details about performing this validation, see the OpenID
	 * Connect specification.
	 */
	at_hash?: string;

	/**
	 * An internal claim used by Azure AD to record data for token reuse. Should be
	 * ignored.
	 */
	aio?: string;

	/**
	 * The primary username that represents the user. It could be an email address,
	 * phone number, or a generic username without a specified format. Its value is
	 * mutable and might change over time. Since it is mutable, this value must not
	 * be used to make authorization decisions. The `profile` scope is required to
	 * receive this claim.
	 */
	preferred_username?: string;

	/**
	 * The `email` claim is present by default for guest accounts that have an email
	 * address. Your app can request the email claim for managed users (those from the
	 * same tenant as the resource) using the `email` optional claim. On the v2.0 endpoint,
	 * your app can also request the `email` OpenID Connect scope - you don't need to
	 * request both the optional claim and the scope to get the claim. The email claim
	 * only supports addressable mail from the user's profile information.
	 */
	email?: string;

	/**
	 * The `name` claim provides a human-readable value that identifies the subject of
	 * the token. The value isn't guaranteed to be unique, it is mutable, and it's designed
	 * to be used only for display purposes. The `profile` scope is required to receive
	 * this claim.
	 */
	name?: string;

	/**
	 * The nonce matches the parameter included in the original /authorize request to
	 * the IDP. If it does not match, your application should reject the token.
	 */
	nonce?: string;

	/**
	 * The immutable identifier for an object in the Microsoft identity system, in this
	 * case, a user account. This ID uniquely identifies the user across applications -
	 * two different applications signing in the same user will receive the same value
	 * in the `oid` claim. The Microsoft Graph will return this ID as the `id` property
	 * for a given user account. Because the `oid` allows multiple apps to correlate
	 * users, the `profile` scope is required to receive this claim. Note that if a single
	 * user exists in multiple tenants, the user will contain a different object ID in
	 * each tenant - they're considered different accounts, even though the user logs
	 * into each account with the same credentials.
	 */
	oid?: string;

	/**
	 * The set of roles that were assigned to the user who is logging in.
	 */
	roles: string[];

	/**
	 * An internal claim used by Azure to revalidate tokens. Should be ignored.
	 */
	rh?: string;

	/**
	 * The principal about which the token asserts information, such as the user of an
	 * app. This value is immutable and cannot be reassigned or reused. The subject is a
	 * pairwise identifier - it is unique to a particular application ID. If a single user
	 * signs into two different apps using two different client IDs, those apps will receive
	 * two different values for the subject claim. This may or may not be wanted depending
	 * on your architecture and privacy requirements.
	 */
	sub: string;

	/**
	 * A GUID that represents the Azure AD tenant that the user is from. For work and school
	 * accounts, the GUID is the immutable tenant ID of the organization that the user belongs
	 * to. For personal accounts, the value is `9188040d-6c67-4c5b-b112-36a304b66dad`. The
	 * `profile` scope is required to receive this claim.
	 */
	tid?: string;

	/**
	 * Provides a human readable value that identifies the subject of the token. This value
	 * isn't guaranteed to be unique within a tenant and should be used only for display
	 * purposes. Only issued in v1.0 `id_tokens`.
	 */
	unique_name?: string;

	/**
	 * An internal claim used by Azure to revalidate tokens. Should be ignored.
	 */
	uti?: string;

	/**
	 * Indicates the version of the id_token.
	 */
	ver: '1.0' | '2.0';
}