import assert from 'node:assert/strict';
import test from 'node:test';
import { readRuntimeAgentScan, saveRuntimeAgentScan, selectedRuntimeAgent } from '../src/lib/runtimeAgents';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) || null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test('treats legacy agent arrays as advisory until the connector revalidates them', () => {
  const storage = new MemoryStorage();
  storage.setItem('speckit_local_agents', JSON.stringify([
    { id: 'continue-cli', label: 'Continue CLI', installed: true, capabilities: ['planning', 'implementation'] },
    { id: 7, label: 'invalid', installed: true },
  ]));
  const scan = readRuntimeAgentScan(storage as unknown as Storage);
  assert.deepEqual(scan.agents.map((agent) => agent.id), ['continue-cli']);
  assert.equal(scan.scanned, false);
  assert.equal(scan.source, 'legacy-cache');
  assert.equal(selectedRuntimeAgent('implementation', scan), undefined);
});

test('persists a versioned live snapshot with arbitrary adapter identities', () => {
  const storage = new MemoryStorage();
  const saved = saveRuntimeAgentScan([
    { id: 'continue-cli', label: 'Continue CLI', installed: true, capabilities: ['planning', 'implementation'] },
    { id: 7, label: 'invalid', installed: true } as never,
  ], storage as unknown as Storage, 'connector');
  const scan = readRuntimeAgentScan(storage as unknown as Storage);
  assert.equal(saved.source, 'connector');
  assert.equal(scan.scanned, true);
  assert.equal(scan.source, 'connector');
  assert.match(scan.checkedAt || '', /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(selectedRuntimeAgent('implementation', scan)?.id, 'continue-cli');
  assert.equal(selectedRuntimeAgent('story-extraction', scan), undefined);
});
