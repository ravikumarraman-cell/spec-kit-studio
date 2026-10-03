import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConnectorConfiguration } from '../connector/productionConfig.mjs';

const workingDirectory = '/tmp/spec-kit-studio-test';

test('connector development mode keeps intentional local defaults', () => {
  const configuration = loadConnectorConfiguration({}, workingDirectory);

  assert.equal(configuration.mode, 'development');
  assert.deepEqual(configuration.allowedRoots, [workingDirectory]);
  assert.equal(configuration.token, '');
  assert.ok(configuration.allowedOrigins.includes('http://localhost:3000'));
});

test('connector production mode rejects implicit repository boundaries, origins, and pairing token', () => {
  assert.throws(
    () => loadConnectorConfiguration({ STUDIO_CONNECTOR_MODE: 'production' }, workingDirectory),
    /requires an explicit STUDIO_ALLOWED_ROOTS[\s\S]*requires explicit HTTPS STUDIO_ALLOWED_ORIGINS[\s\S]*requires STUDIO_CONNECTOR_TOKEN/,
  );
});

test('connector production mode rejects a short pairing token and insecure browser origin', () => {
  assert.throws(
    () => loadConnectorConfiguration({
      STUDIO_CONNECTOR_MODE: 'production',
      STUDIO_ALLOWED_ROOTS: '/srv/worktrees',
      STUDIO_ALLOWED_ORIGINS: 'http://studio.example.com',
      STUDIO_CONNECTOR_TOKEN: 'too-short',
    }, workingDirectory),
    /at least 32 bytes[\s\S]*exact HTTPS origin/,
  );
});

test('connector production mode accepts explicit narrow boundaries', () => {
  const configuration = loadConnectorConfiguration({
    STUDIO_CONNECTOR_MODE: 'production',
    STUDIO_ALLOWED_ROOTS: '/srv/worktrees,/srv/worktrees',
    STUDIO_ALLOWED_ORIGINS: 'https://studio.example.com,https://admin.example.com',
    STUDIO_CONNECTOR_TOKEN: 'a-32-byte-minimum-production-token!',
    STUDIO_CONNECTOR_PORT: '4319',
  }, workingDirectory);

  assert.equal(configuration.isProduction, true);
  assert.equal(configuration.port, 4319);
  assert.deepEqual(configuration.allowedRoots, ['/srv/worktrees']);
  assert.deepEqual(configuration.allowedOrigins, ['https://studio.example.com', 'https://admin.example.com']);
});

test('connector normalizes only accidental outer whitespace around a pairing token', () => {
  const configuration = loadConnectorConfiguration({
    STUDIO_ALLOWED_ROOTS: '/srv/worktrees',
    STUDIO_CONNECTOR_TOKEN: '  a-token-entered-with-a-trailing-newline\n ',
  }, workingDirectory);

  assert.equal(configuration.token, 'a-token-entered-with-a-trailing-newline');
});

test('regulated connector mode requires its production boundary and blocks unapproved agent egress', () => {
  const base = {
    STUDIO_DEPLOYMENT_MODE: 'dod', STUDIO_CONNECTOR_MODE: 'production',
    STUDIO_ALLOWED_ROOTS: '/srv/worktrees', STUDIO_ALLOWED_ORIGINS: 'https://studio.example.mil',
    STUDIO_CONNECTOR_TOKEN: 'a-32-byte-minimum-production-token!',
  };
  assert.throws(() => loadConnectorConfiguration(base, workingDirectory), /EXTERNAL_AGENT_EGRESS=disabled/);
  const configuration = loadConnectorConfiguration({ ...base, STUDIO_CONNECTOR_EXTERNAL_AGENT_EGRESS: 'disabled' }, workingDirectory);
  assert.equal(configuration.regulated, true);
  assert.equal(configuration.deploymentMode, 'dod');
});
