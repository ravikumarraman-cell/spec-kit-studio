import assert from 'node:assert/strict';
import test from 'node:test';
import { loadRegulatoryModeConfig, publicDeploymentContext } from '../server/regulatoryMode';
import { loadAuthConfig } from '../server/config';

const regulatedEnvironment = {
  NODE_ENV: 'production', STUDIO_DEPLOYMENT_MODE: 'govcloud', STUDIO_AUTH_MODE: 'enterprise',
  STUDIO_SESSION_TTL_MS: '3600000', STUDIO_EXTERNAL_AI_EGRESS: 'disabled',
  STUDIO_OIDC_ISSUER: 'https://login.example.gov/tenant', STUDIO_OIDC_CLIENT_ID: 'studio',
  STUDIO_OIDC_CLIENT_SECRET: 'secret', STUDIO_OIDC_REDIRECT_URI: 'https://studio.example.gov/api/auth/callback',
  STUDIO_OIDC_REQUIRED_GROUP_IDS: 'authorized-studio-users', STUDIO_SESSION_SECRET: 'x'.repeat(32),
};

test('GovCloud and DoD modes require a deliberate production security posture', () => {
  assert.deepEqual(loadRegulatoryModeConfig(regulatedEnvironment), { mode: 'govcloud', regulated: true, allowExternalAiEgress: false });
  assert.equal(loadAuthConfig(regulatedEnvironment).mode, 'enterprise');
  assert.throws(() => loadRegulatoryModeConfig({ ...regulatedEnvironment, STUDIO_AUTH_MODE: 'disabled' }), /requires STUDIO_AUTH_MODE=enterprise/);
  assert.throws(() => loadRegulatoryModeConfig({ ...regulatedEnvironment, STUDIO_OIDC_REQUIRED_GROUP_IDS: '' }), /requires STUDIO_OIDC_REQUIRED_GROUP_IDS/);
  assert.throws(() => loadRegulatoryModeConfig({ ...regulatedEnvironment, STUDIO_SESSION_TTL_MS: '3600001' }), /no greater than 3600000/);
  assert.throws(() => loadRegulatoryModeConfig({ ...regulatedEnvironment, STUDIO_EXTERNAL_AI_EGRESS: 'allowed' }), /EXTERNAL_AI_EGRESS=disabled/);
  assert.throws(() => loadRegulatoryModeConfig({ ...regulatedEnvironment, NODE_ENV: 'development' }), /requires NODE_ENV=production/);
  assert.deepEqual(loadRegulatoryModeConfig({ STUDIO_DEPLOYMENT_MODE: 'standard' }), { mode: 'standard', regulated: false, allowExternalAiEgress: true });
});

test('the browser receives only a safe, explicit deployment-boundary summary', () => {
  assert.deepEqual(publicDeploymentContext(loadRegulatoryModeConfig(regulatedEnvironment)), {
    mode: 'govcloud', regulated: true, externalAiEgress: 'disabled',
  });
  assert.deepEqual(publicDeploymentContext(loadRegulatoryModeConfig({ STUDIO_DEPLOYMENT_MODE: 'standard' })), {
    mode: 'standard', regulated: false, externalAiEgress: 'permitted',
  });
});
