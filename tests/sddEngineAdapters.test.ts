import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('connector exposes a versioned GitHub Spec Kit adapter without exposing executable details', async () => {
  const { SDD_ENGINE_ADAPTER_API_VERSION, availableSddEngineAdapters, sddEngineAdapter } = await import('../connector/sddEngineAdapters.mjs');
  assert.equal(SDD_ENGINE_ADAPTER_API_VERSION, 1);
  assert.deepEqual(availableSddEngineAdapters(), [{
    id: 'github-spec-kit', apiVersion: 1, label: 'GitHub Spec Kit', availability: 'available',
    capabilities: ['detect', 'artifact-read', 'strict-conformance', 'status', 'install', 'initialize', 'agent-stage-run'], artifactRoles: ['spec', 'plan', 'tasks'],
  }]);
  assert.equal(typeof sddEngineAdapter('github-spec-kit')?.readArtifacts, 'function');
  assert.deepEqual(sddEngineAdapter('github-spec-kit')?.capabilities.filter((capability) => ['status', 'install', 'initialize', 'agent-stage-run'].includes(capability)), ['status', 'install', 'initialize', 'agent-stage-run']);
  assert.equal(sddEngineAdapter('openspec'), undefined);
});

test('connector keeps lifecycle operations behind the versioned SDD adapter contract', async () => {
  const source = await readFile(new URL('../connector/server.mjs', import.meta.url), 'utf8');
  assert.match(source, /'sdd-engine-lifecycle-v1'/);
  for (const endpoint of ['status', 'install', 'initialize', 'stage/run']) {
    assert.match(source, new RegExp(`/v1/sdd-engines/${endpoint.replace('/', '\\/')}`));
  }
  assert.match(source, /function requireSddEngineCapability\(engineId, capability\)/);
  assert.match(source, /payload\.confirmation !== 'RUN_SDD_ENGINE_STAGE'/);
});
