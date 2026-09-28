import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAuthConfig } from '../server/config';
import { InMemorySessionStore, SessionService } from '../server/auth/sessionService';

test('enterprise authentication configuration fails closed when required OIDC settings are absent', () => {
  assert.throws(() => loadAuthConfig({ STUDIO_AUTH_MODE: 'enterprise' }), /STUDIO_OIDC_ISSUER is required/);
  assert.throws(() => loadAuthConfig({ STUDIO_AUTH_MODE: 'unsupported' }), /disabled or enterprise/);
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
