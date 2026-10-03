import assert from 'node:assert/strict';
import test from 'node:test';
import { loadServerConfig } from '../server/config';

test('server configuration provides production-safe defaults', () => {
  assert.deepEqual(loadServerConfig({}), {
    host: '0.0.0.0',
    port: 3000,
    requestBodyLimit: '10mb',
    shutdownGracePeriodMs: 10_000,
  });
});

test('server configuration accepts explicit runtime values', () => {
  assert.deepEqual(loadServerConfig({
    HOST: '127.0.0.1',
    PORT: '4100',
    REQUEST_BODY_LIMIT: '2mb',
    SHUTDOWN_GRACE_PERIOD_MS: '5000',
  }), {
    host: '127.0.0.1',
    port: 4100,
    requestBodyLimit: '2mb',
    shutdownGracePeriodMs: 5000,
  });
});

test('server configuration rejects invalid numeric values', () => {
  assert.throws(() => loadServerConfig({ PORT: 'not-a-port' }), /PORT must be a positive integer/);
  assert.throws(() => loadServerConfig({ SHUTDOWN_GRACE_PERIOD_MS: '0' }), /SHUTDOWN_GRACE_PERIOD_MS must be a positive integer/);
});