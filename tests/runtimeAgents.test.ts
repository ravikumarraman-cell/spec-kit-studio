import assert from 'node:assert/strict';
import test from 'node:test';
import { readRuntimeAgentScan, selectedRuntimeAgent } from '../src/lib/runtimeAgents';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) || null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test('normalizes a connector scan and retains arbitrary adapter identities', () => {
  const storage = new MemoryStorage();
  storage.setItem('speckit_local_agents', JSON.stringify([
    { id: 'continue-cli', label: 'Continue CLI', installed: true, capabilities: ['planning', 'implementation'] },
    { id: 7, label: 'invalid', installed: true },
  ]));
  const scan = readRuntimeAgentScan(storage as unknown as Storage);
  assert.deepEqual(scan.agents.map((agent) => agent.id), ['continue-cli']);
  assert.equal(selectedRuntimeAgent('implementation', scan)?.id, 'continue-cli');
  assert.equal(selectedRuntimeAgent('story-extraction', scan), undefined);
});
