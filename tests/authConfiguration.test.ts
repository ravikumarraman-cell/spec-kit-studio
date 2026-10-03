import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAuthConfig } from '../server/config';
import { InMemorySessionStore, SessionService } from '../server/auth/sessionService';
import { loadOptionalGitHubAppConfig } from '../server/services/githubAppClient';

test('enterprise authentication configuration fails closed when required OIDC settings are absent', () => {
  assert.throws(() => loadAuthConfig({ STUDIO_AUTH_MODE: 'enterprise' }), /STUDIO_OIDC_ISSUER is required/);
  assert.throws(() => loadAuthConfig({ STUDIO_AUTH_MODE: 'unsupported' }), /disabled or enterprise/);
});

test('enterprise authentication rejects the process-local Vercel serverless adapter', () => {
  assert.throws(
    () => loadAuthConfig({ STUDIO_AUTH_MODE: 'enterprise', VERCEL: '1' }),
    /durable shared session and OIDC transaction store/,
  );
  assert.equal(loadAuthConfig({ STUDIO_AUTH_MODE: 'disabled', VERCEL: '1' }).mode, 'disabled');
});

test('production server credentials require authentication or an explicit public deployment override', () => {
  assert.throws(
    () => loadAuthConfig({ NODE_ENV: 'production', GEMINI_API_KEY: 'server-secret' }),
    /require STUDIO_AUTH_MODE=enterprise/,
  );
  assert.equal(loadAuthConfig({ NODE_ENV: 'production', GEMINI_API_KEY: 'server-secret', STUDIO_ALLOW_PUBLIC_SERVER_CREDENTIALS: 'enabled' }).mode, 'disabled');
  assert.equal(loadAuthConfig({ NODE_ENV: 'development', GEMINI_API_KEY: 'server-secret' }).mode, 'disabled');
});

test('enterprise authentication configuration accepts a bounded HTTPS OIDC configuration', () => {
  const config = loadAuthConfig({ STUDIO_AUTH_MODE: 'enterprise', STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_OIDC_ISSUER: 'https://login.example.com/tenant/v2.0/', STUDIO_OIDC_CLIENT_ID: 'client-id', STUDIO_OIDC_CLIENT_SECRET: 'client-secret', STUDIO_OIDC_REDIRECT_URI: 'https://studio.example.com/api/auth/callback', STUDIO_OIDC_REQUIRED_GROUP_IDS: 'group-a, group-b' });
  assert.equal(config.mode, 'enterprise');
  assert.equal(config.oidc?.issuer, 'https://login.example.com/tenant/v2.0');
  assert.deepEqual(config.oidc?.requiredGroupIds, ['group-a', 'group-b']);
});

test('enterprise authentication permits an HTTP localhost callback only outside production', () => {
  const base = { STUDIO_AUTH_MODE: 'enterprise', STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_OIDC_ISSUER: 'https://login.example.com/tenant/v2.0', STUDIO_OIDC_CLIENT_ID: 'client-id', STUDIO_OIDC_CLIENT_SECRET: 'client-secret', STUDIO_OIDC_REDIRECT_URI: 'http://localhost:3000/api/auth/callback' };
  assert.equal(loadAuthConfig(base).oidc?.redirectUri, base.STUDIO_OIDC_REDIRECT_URI);
  assert.throws(() => loadAuthConfig({ ...base, NODE_ENV: 'production' }), /must use HTTPS/);
});

test('GitHub OAuth can start at a configured organization SSO endpoint', () => {
  const environment = {
    STUDIO_GITHUB_OAUTH_CLIENT_ID: 'client-id',
    STUDIO_GITHUB_OAUTH_CLIENT_SECRET: 'client-secret',
    STUDIO_GITHUB_OAUTH_REDIRECT_URI: 'http://localhost:3000/api/auth/github/callback',
    STUDIO_GITHUB_SSO_ORGANIZATION: 'optum-eeps',
  };
  const config = loadAuthConfig(environment);
  assert.equal(config.githubOAuth?.ssoOrganization, 'optum-eeps');
  assert.throws(
    () => loadAuthConfig({ ...environment, STUDIO_GITHUB_SSO_ORGANIZATION: 'not/a-github-org' }),
    /must be a GitHub organization name/,
  );
});

test('enterprise authentication supports a PKCE public client without inventing a client secret', () => {
  const config = loadAuthConfig({
    STUDIO_AUTH_MODE: 'enterprise',
    STUDIO_SESSION_SECRET: 'x'.repeat(32),
    STUDIO_OIDC_ISSUER: 'https://login.example.com/tenant/v2.0',
    STUDIO_OIDC_CLIENT_ID: 'client-id',
    STUDIO_OIDC_CLIENT_AUTH_METHOD: 'none',
    STUDIO_OIDC_REDIRECT_URI: 'http://localhost:3000',
  });
  assert.equal(config.oidc?.clientAuthentication, 'none');
  assert.equal(config.oidc?.clientSecret, undefined);
});

test('enterprise authentication rejects an unknown OIDC client authentication method', () => {
  assert.throws(() => loadAuthConfig({ STUDIO_AUTH_MODE: 'enterprise', STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_OIDC_ISSUER: 'https://login.example.com/tenant/v2.0', STUDIO_OIDC_CLIENT_ID: 'client-id', STUDIO_OIDC_CLIENT_AUTH_METHOD: 'basic', STUDIO_OIDC_REDIRECT_URI: 'http://localhost:3000' }), /client_secret_post or none/);
});

test('enterprise authentication rejects credential-bearing or fragment-bearing OIDC endpoints', () => {
  const base = { STUDIO_AUTH_MODE: 'enterprise', STUDIO_SESSION_SECRET: 'x'.repeat(32), STUDIO_OIDC_ISSUER: 'https://login.example.com/tenant', STUDIO_OIDC_CLIENT_ID: 'client-id', STUDIO_OIDC_CLIENT_SECRET: 'client-secret', STUDIO_OIDC_REDIRECT_URI: 'https://studio.example.com/api/auth/callback' };
  assert.throws(() => loadAuthConfig({ ...base, STUDIO_OIDC_ISSUER: 'https://user:pass@login.example.com/tenant' }), /without credentials/);
  assert.throws(() => loadAuthConfig({ ...base, STUDIO_OIDC_REDIRECT_URI: 'https://studio.example.com/api/auth/callback#fragment' }), /without credentials or a fragment/);
});

test('an absent Company GitHub App is an explicit optional capability, while partial configuration fails closed', () => {
  assert.equal(loadOptionalGitHubAppConfig({}), undefined);
  assert.throws(() => loadOptionalGitHubAppConfig({ STUDIO_GITHUB_APP_ID: '123' }), /installation ID is not configured/);
  const config = loadOptionalGitHubAppConfig({ STUDIO_GITHUB_APP_ID: '123', STUDIO_GITHUB_APP_INSTALLATION_ID: '456', STUDIO_GITHUB_APP_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nkey\\n-----END PRIVATE KEY-----' });
  assert.equal(config?.installationId, '456');
});

test('opaque sessions are peppered, revocable, and never load with the wrong secret', async () => {
  const store = new InMemorySessionStore();
  const sessions = new SessionService(store, 60_000, true, 'a'.repeat(32));
  const created = await sessions.create({ id: 'issuer|subject', displayName: 'User', groups: [], roles: ['studio-user'] });
  const request = { header: (name: string) => name === 'cookie' ? `speckit_session=${created.token}` : undefined } as never;
  assert.equal((await sessions.get(request))?.principal.id, 'issuer|subject');
  const wrongSecret = new SessionService(store, 60_000, true, 'b'.repeat(32));
  assert.equal(await wrongSecret.get(request), undefined);
  await sessions.revoke(request);
  assert.equal(await sessions.get(request), undefined);
});
