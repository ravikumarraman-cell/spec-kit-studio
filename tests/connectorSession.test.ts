import assert from 'node:assert/strict';
import test from 'node:test';
import { getConnectorSessionToken, setConnectorSessionToken } from '../src/lib/connectorSession';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

function withBrowser<T>(run: (storage: ReturnType<typeof memoryStorage>) => T): T {
  const storage = memoryStorage();
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = { sessionStorage: storage };
  try { return run(storage); } finally { (globalThis as { window?: unknown }).window = previous; }
}

test('stores pairing tokens by connector origin so one local endpoint cannot overwrite another', () => withBrowser(() => {
  setConnectorSessionToken(' token-for-4318 ', 'http://127.0.0.1:4318');
  setConnectorSessionToken('token-for-4319', 'http://127.0.0.1:4319');

  assert.equal(getConnectorSessionToken('http://127.0.0.1:4318/'), 'token-for-4318');
  assert.equal(getConnectorSessionToken('http://127.0.0.1:4319'), 'token-for-4319');
}));

test('migrates a previous session token until a connector-specific token is saved', () => withBrowser((storage) => {
  storage.setItem('speckit_connector_token_session', 'legacy-token');
  assert.equal(getConnectorSessionToken('http://localhost:4318'), 'legacy-token');
  setConnectorSessionToken('scoped-token', 'http://localhost:4318');
  assert.equal(getConnectorSessionToken('http://localhost:4318'), 'scoped-token');
  assert.equal(storage.getItem('speckit_connector_token_session'), null);
}));
