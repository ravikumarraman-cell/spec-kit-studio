import assert from 'node:assert/strict';
import test from 'node:test';
import { availableComponentUpdates, isVersionOlder } from '../src/lib/componentUpdates';

test('compares stable component versions without treating older or invalid releases as updates', () => {
  assert.equal(isVersionOlder('0.1.20', '0.1.21'), true);
  assert.equal(isVersionOlder('0.9.9', '1.0.0'), true);
  assert.equal(isVersionOlder('1.0.0', '1.0.0'), false);
  assert.equal(isVersionOlder('1.1.0', '1.0.9'), false);
  assert.equal(isVersionOlder('development', '1.0.0'), false);
});

test('reports app and connector updates independently through one model', () => {
  const updates = availableComponentUpdates({
    app: { currentVersion: '0.1.20', availableVersion: '0.1.21' },
    connector: { currentVersion: '0.1.19', availableVersion: '0.1.21' },
  });

  assert.deepEqual(updates.map((update) => update.id), ['studio-app', 'local-connector']);
  assert.deepEqual(updates.map((update) => update.action), ['reload-app', 'open-connector']);
});

test('reports a service-worker app update even before its version is known', () => {
  const updates = availableComponentUpdates({
    app: { currentVersion: '0.1.20', workerUpdateReady: true },
  });

  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 'studio-app');
  assert.equal(updates[0].availableVersion, undefined);
});