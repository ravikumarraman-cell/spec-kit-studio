export interface ServerConfig {
  host: string;
  port: number;
  requestBodyLimit: string;
  shutdownGracePeriodMs: number;
}

function positiveInteger(value: string | undefined, fallback: number, name: string) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function loadServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    host: environment.HOST?.trim() || '0.0.0.0',
    port: positiveInteger(environment.PORT, 3000, 'PORT'),
    requestBodyLimit: environment.REQUEST_BODY_LIMIT?.trim() || '10mb',
    shutdownGracePeriodMs: positiveInteger(environment.SHUTDOWN_GRACE_PERIOD_MS, 10_000, 'SHUTDOWN_GRACE_PERIOD_MS'),
  };
}

function required(environment: NodeJS.ProcessEnv, name: string) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required when STUDIO_AUTH_MODE=enterprise.`);
  return value;
}

function csv(value: string | undefined) { return (value || '').split(',').map((entry) => entry.trim()).filter(Boolean); }

/** Load auth separately so the general server configuration remains backwards compatible. */
export function loadAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfiguration {
  const mode = (environment.STUDIO_AUTH_MODE?.trim() || 'disabled') as StudioAuthMode;
  if (mode !== 'disabled' && mode !== 'enterprise') throw new Error('STUDIO_AUTH_MODE must be disabled or enterprise.');
  const sessionTtlMs = positiveInteger(environment.STUDIO_SESSION_TTL_MS, 8 * 60 * 60 * 1000, 'STUDIO_SESSION_TTL_MS');
  if (mode === 'disabled') return { mode, sessionTtlMs };
  const issuer = required(environment, 'STUDIO_OIDC_ISSUER').replace(/\/$/, '');
  const redirectUri = required(environment, 'STUDIO_OIDC_REDIRECT_URI');
  const permitsLocalHttpRedirect = environment.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?\//.test(redirectUri);
  if (!issuer.startsWith('https://') || (!redirectUri.startsWith('https://') && !permitsLocalHttpRedirect)) throw new Error('Enterprise OIDC issuer and redirect URI must use HTTPS (except localhost during development).');
  const sessionSecret = required(environment, 'STUDIO_SESSION_SECRET');
  if (sessionSecret.length < 32) throw new Error('STUDIO_SESSION_SECRET must be at least 32 characters.');
  const oidc: OidcConfiguration = { issuer, clientId: required(environment, 'STUDIO_OIDC_CLIENT_ID'), clientSecret: required(environment, 'STUDIO_OIDC_CLIENT_SECRET'), redirectUri, scopes: csv(environment.STUDIO_OIDC_SCOPES).length ? csv(environment.STUDIO_OIDC_SCOPES) : ['openid', 'profile', 'email'], requiredGroupIds: csv(environment.STUDIO_OIDC_REQUIRED_GROUP_IDS) };
  return { mode, sessionSecret, sessionTtlMs, oidc };
}
import type { AuthConfiguration, OidcConfiguration, StudioAuthMode } from './auth/types';
