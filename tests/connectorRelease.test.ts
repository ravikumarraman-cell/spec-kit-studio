import assert from 'node:assert/strict';
import test from 'node:test';
import { isConnectorRelease, isConnectorVersionOlder } from '../src/lib/connectorRelease';

test('recognizes only newer stable connector releases', () => {
  assert.equal(isConnectorVersionOlder('0.1.0', '0.1.1'), true);
  assert.equal(isConnectorVersionOlder('0.9.9', '1.0.0'), true);
  assert.equal(isConnectorVersionOlder('1.4.0', '1.4.0'), false);
  assert.equal(isConnectorVersionOlder('1.5.0', '1.4.9'), false);
  assert.equal(isConnectorVersionOlder('unknown', '1.4.9'), false);
});

test('validates the public connector release manifest', () => {
  assert.equal(isConnectorRelease({ packageName: '@spec-kit-studio/local-connector', version: '0.1.4', apiVersion: 3, downloadPath: '/downloads/spec-kit-studio-local-connector-0.1.4.tgz' }), true);
  assert.equal(isConnectorRelease({ version: '0.1.4', apiVersion: 3, downloadPath: '/outside.tgz' }), false);
});
