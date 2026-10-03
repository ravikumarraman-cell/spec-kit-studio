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

function optionalGitHubOAuth(environment: NodeJS.ProcessEnv) {
  const names = ['STUDIO_GITHUB_OAUTH_CLIENT_ID', 'STUDIO_GITHUB_OAUTH_CLIENT_SECRET', 'STUDIO_GITHUB_OAUTH_REDIRECT_URI'] as const;
  if (!names.some((name) => environment[name]?.trim())) return undefined;
  if (!names.every((name) => environment[name]?.trim())) throw new Error('GitHub OAuth requires STUDIO_GITHUB_OAUTH_CLIENT_ID, STUDIO_GITHUB_OAUTH_CLIENT_SECRET, and STUDIO_GITHUB_OAUTH_REDIRECT_URI.');
  const ssoOrganization = environment.STUDIO_GITHUB_SSO_ORGANIZATION?.trim();
  if (ssoOrganization && !/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(ssoOrganization)) {
    throw new Error('STUDIO_GITHUB_SSO_ORGANIZATION must be a GitHub organization name.');
  }
  return {
    clientId: environment.STUDIO_GITHUB_OAUTH_CLIENT_ID!.trim(),
    clientSecret: environment.STUDIO_GITHUB_OAUTH_CLIENT_SECRET!.trim(),
    redirectUri: secureUrl(environment.STUDIO_GITHUB_OAUTH_REDIRECT_URI!.trim(), 'STUDIO_GITHUB_OAUTH_REDIRECT_URI', environment.NODE_ENV !== 'production'),
    ...(ssoOrganization ? { ssoOrganization } : {}),
  };
}

function secureUrl(value: string, name: string, permitsLocalHttp = false) {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error(`${name} must be an absolute URL.`); }
  const localHttp = permitsLocalHttp && parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if ((!localHttp && parsed.protocol !== 'https:') || parsed.username || parsed.password || parsed.hash) throw new Error(`${name} must use HTTPS without credentials or a fragment.`);
  return parsed.toString();
}

/** Load auth separately so the general server configuration remains backwards compatible. */
export function loadAuthConfig(environment: NodeJS.ProcessEnv = process.env): AuthConfiguration {
  // Validate the deployment posture before accepting any normal defaults.
  // This keeps a regulated environment from starting with disabled auth.
  const regulatory = loadRegulatoryModeConfig(environment);
  const mode = (environment.STUDIO_AUTH_MODE?.trim() || 'disabled') as StudioAuthMode;
  if (mode !== 'disabled' && mode !== 'enterprise') throw new Error('STUDIO_AUTH_MODE must be disabled or enterprise.');
  const sessionTtlMs = positiveInteger(environment.STUDIO_SESSION_TTL_MS, 8 * 60 * 60 * 1000, 'STUDIO_SESSION_TTL_MS');
  // GitHub OAuth is an optional, per-user connection. It works for both a
  // private enterprise Studio and a local/public Studio without imposing SSO
  // on people who are not using GitHub.
  const githubOAuth = optionalGitHubOAuth(environment);
  if (mode === 'disabled') {
    const serverCredentialNames = [
      'GEMINI_API_KEY', 'GITHUB_TOKEN', 'JIRA_API_TOKEN',
      'STUDIO_GITHUB_APP_PRIVATE_KEY', 'STUDIO_GITHUB_APP_ID', 'STUDIO_GITHUB_APP_INSTALLATION_ID',
    ];
    const configuredCredentials = serverCredentialNames.filter((name) => environment[name]?.trim());
    if (environment.NODE_ENV === 'production' && configuredCredentials.length && environment.STUDIO_ALLOW_PUBLIC_SERVER_CREDENTIALS !== 'enabled') {
      throw new Error(`Production server credentials (${configuredCredentials.join(', ')}) require STUDIO_AUTH_MODE=enterprise. Set STUDIO_ALLOW_PUBLIC_SERVER_CREDENTIALS=enabled only for a deliberately public, externally rate-limited deployment.`);
    }
    return { mode, sessionTtlMs, githubOAuth };
  }
  if (environment.VERCEL === '1') throw new Error('Enterprise authentication requires a durable shared session and OIDC transaction store; the current Vercel serverless adapter supports STUDIO_AUTH_MODE=disabled only.');
  const issuer = secureUrl(required(environment, 'STUDIO_OIDC_ISSUER'), 'STUDIO_OIDC_ISSUER').replace(/\/$/, '');
  const redirectUri = secureUrl(required(environment, 'STUDIO_OIDC_REDIRECT_URI'), 'STUDIO_OIDC_REDIRECT_URI', environment.NODE_ENV !== 'production');
  const sessionSecret = required(environment, 'STUDIO_SESSION_SECRET');
  if (sessionSecret.length < 32) throw new Error('STUDIO_SESSION_SECRET must be at least 32 characters.');
  const clientAuthentication = environment.STUDIO_OIDC_CLIENT_AUTH_METHOD?.trim() || 'client_secret_post';
  if (clientAuthentication !== 'client_secret_post' && clientAuthentication !== 'none') {
    throw new Error('STUDIO_OIDC_CLIENT_AUTH_METHOD must be client_secret_post or none.');
  }
  const clientSecret = clientAuthentication === 'client_secret_post'
    ? required(environment, 'STUDIO_OIDC_CLIENT_SECRET')
    : undefined;
  const oidc: OidcConfiguration = {
    issuer,
    clientId: required(environment, 'STUDIO_OIDC_CLIENT_ID'),
    clientSecret,
    clientAuthentication,
    redirectUri,
    scopes: csv(environment.STUDIO_OIDC_SCOPES).length ? csv(environment.STUDIO_OIDC_SCOPES) : ['openid', 'profile', 'email'],
    requiredGroupIds: csv(environment.STUDIO_OIDC_REQUIRED_GROUP_IDS),
  };
  // Referencing the object prevents this intentional validation from becoming
  // an accidental dead-code removal during a future auth refactor.
  void regulatory;
  return { mode, sessionSecret, sessionTtlMs, oidc, githubOAuth };
}
import type { AuthConfiguration, OidcConfiguration, StudioAuthMode } from './auth/types';
import { loadRegulatoryModeConfig } from './regulatoryMode';
