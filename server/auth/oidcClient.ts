import { createPublicKey, verify, type JsonWebKey as NodeJsonWebKey } from 'node:crypto';
import { HttpError } from '../middleware/errorHandling';
import type { OidcConfiguration, OidcTokens, StudioPrincipal } from './types';

interface OidcMetadata { authorization_endpoint: string; token_endpoint: string; jwks_uri: string; }
interface Jwk { kid?: string; kty: string; n?: string; e?: string; use?: string; alg?: string; }
interface JwtClaims { iss?: string; aud?: string | string[]; exp?: number; nbf?: number; nonce?: string; sub?: string; name?: string; preferred_username?: string; email?: string; groups?: string[]; }

const CACHE_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

function base64urlJson<T>(value: string): T {
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T; }
  catch { throw new HttpError(401, 'OIDC_INVALID_TOKEN', 'Your company account could not be verified.'); }
}
function sameStringSet(value: string | string[] | undefined, expected: string) { return Array.isArray(value) ? value.includes(expected) : value === expected; }
function issuerUrl(value: string) { return value.replace(/\/$/, ''); }
function sameHttpsOrigin(endpoint: string, issuer: string) {
  try {
    const candidate = new URL(endpoint); const authority = new URL(issuer);
    return candidate.protocol === 'https:' && !candidate.username && !candidate.password && candidate.origin === authority.origin;
  } catch { return false; }
}

export class OidcClient {
  private metadata?: { value: OidcMetadata; expiresAt: number };
  private keys?: { value: Jwk[]; expiresAt: number };
  constructor(private readonly config: OidcConfiguration) {}

  async begin(state: string, nonce: string, verifier: string) {
    const metadata = await this.getMetadata();
    const challenge = Buffer.from(await crypto.subtle.digest('SHA-256', Buffer.from(verifier))).toString('base64url');
    const url = new URL(metadata.authorization_endpoint);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', this.config.scopes.join(' '));
    url.searchParams.set('state', state);
    url.searchParams.set('nonce', nonce);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  async exchange(code: string, verifier: string): Promise<OidcTokens> {
    const metadata = await this.getMetadata();
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: verifier,
    });
    if (this.config.clientAuthentication === 'client_secret_post' && this.config.clientSecret) {
      body.set('client_secret', this.config.clientSecret);
    }
    const response = await fetch(metadata.token_endpoint, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' }, body, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new HttpError(401, 'OIDC_TOKEN_EXCHANGE_FAILED', 'Sign-in did not complete. Try again.');
    const payload = await response.json() as { id_token?: unknown; access_token?: unknown };
    if (typeof payload.id_token !== 'string') throw new HttpError(401, 'OIDC_INVALID_TOKEN', 'Your company account could not be verified.');
    return { idToken: payload.id_token, accessToken: typeof payload.access_token === 'string' ? payload.access_token : undefined };
  }

  async principalFromIdToken(idToken: string, expectedNonce?: string): Promise<StudioPrincipal> {
    const [encodedHeader, encodedClaims, encodedSignature, ...rest] = idToken.split('.');
    if (!encodedHeader || !encodedClaims || !encodedSignature || rest.length) throw new HttpError(401, 'OIDC_INVALID_TOKEN', 'Your company account could not be verified.');
    const header = base64urlJson<{ alg?: string; kid?: string }>(encodedHeader);
    if (!header.kid || !['RS256', 'RS384', 'RS512'].includes(header.alg || '')) throw new HttpError(401, 'OIDC_INVALID_TOKEN', 'Your company account could not be verified.');
    const key = (await this.getKeys()).find((candidate) => candidate.kid === header.kid && candidate.kty === 'RSA');
    if (!key) throw new HttpError(401, 'OIDC_UNKNOWN_SIGNING_KEY', 'Your company account could not be verified.');
    const algorithms: Record<string, string> = { RS256: 'RSA-SHA256', RS384: 'RSA-SHA384', RS512: 'RSA-SHA512' };
    const valid = verify(algorithms[header.alg!], Buffer.from(`${encodedHeader}.${encodedClaims}`), createPublicKey({ key: key as unknown as NodeJsonWebKey, format: 'jwk' }), Buffer.from(encodedSignature, 'base64url'));
    if (!valid) throw new HttpError(401, 'OIDC_INVALID_SIGNATURE', 'Your company account could not be verified.');
    const claims = base64urlJson<JwtClaims>(encodedClaims);
    const now = Math.floor(Date.now() / 1000);
    if (issuerUrl(claims.iss || '') !== issuerUrl(this.config.issuer) || !sameStringSet(claims.aud, this.config.clientId) || !claims.sub || (expectedNonce !== undefined && claims.nonce !== expectedNonce) || !claims.exp || claims.exp <= now || (claims.nbf !== undefined && claims.nbf > now + 60)) {
      throw new HttpError(401, 'OIDC_INVALID_CLAIMS', 'Your company account could not be verified.');
    }
    const groups = Array.isArray(claims.groups) ? claims.groups.filter((group): group is string => typeof group === 'string') : [];
    if (this.config.requiredGroupIds.length && !this.config.requiredGroupIds.some((group) => groups.includes(group))) throw new HttpError(403, 'STUDIO_ACCESS_NOT_GRANTED', 'Access has not been granted to this Studio.');
    return { id: `${issuerUrl(this.config.issuer)}|${claims.sub}`, displayName: claims.name || claims.preferred_username || claims.email || 'Studio user', email: claims.email || claims.preferred_username, groups, roles: ['studio-user'] };
  }

  private async getMetadata() {
    if (this.metadata && this.metadata.expiresAt > Date.now()) return this.metadata.value;
    const response = await fetch(`${issuerUrl(this.config.issuer)}/.well-known/openid-configuration`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new HttpError(503, 'OIDC_DISCOVERY_UNAVAILABLE', 'Company sign-in is temporarily unavailable.');
    const value = await response.json() as OidcMetadata;
    if (!value.authorization_endpoint || !value.token_endpoint || !value.jwks_uri || !sameHttpsOrigin(value.authorization_endpoint, this.config.issuer) || !sameHttpsOrigin(value.token_endpoint, this.config.issuer) || !sameHttpsOrigin(value.jwks_uri, this.config.issuer)) throw new HttpError(503, 'OIDC_DISCOVERY_INVALID', 'Company sign-in is temporarily unavailable.');
    this.metadata = { value, expiresAt: Date.now() + CACHE_MS }; return value;
  }
  private async getKeys() {
    if (this.keys && this.keys.expiresAt > Date.now()) return this.keys.value;
    const metadata = await this.getMetadata(); const response = await fetch(metadata.jwks_uri, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) throw new HttpError(503, 'OIDC_JWKS_UNAVAILABLE', 'Company sign-in is temporarily unavailable.');
    const payload = await response.json() as { keys?: unknown }; if (!Array.isArray(payload.keys)) throw new HttpError(503, 'OIDC_JWKS_INVALID', 'Company sign-in is temporarily unavailable.');
    this.keys = { value: payload.keys as Jwk[], expiresAt: Date.now() + CACHE_MS }; return this.keys.value;
  }
}
