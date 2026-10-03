import assert from 'node:assert/strict';
import test from 'node:test';
import { connectorClient } from '../src/lib/connector';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('availableAgents uses the connector read contract and returns live status', async () => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { setTimeout, clearTimeout },
  });
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'http://localhost:4318/v1/agents/available');
    assert.equal(init?.method, 'GET');
    return new Response(JSON.stringify({
      agents: [{ id: 'codex', label: 'Codex', installed: true, capabilities: ['planning'], version: 'codex-cli test' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const result = await connectorClient('http://localhost:4318', '').availableAgents();

  assert.deepEqual(result.agents, [
    { id: 'codex', label: 'Codex', installed: true, capabilities: ['planning'], version: 'codex-cli test' },
  ]);
});