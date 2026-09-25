import assert from 'node:assert/strict';
import test from 'node:test';
import { clearConnectorRunReference, readConnectorRunReference, saveConnectorRunReference } from '../src/lib/connectorRunSession';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const reference = {
  jobId: 'job-stage-3',
  projectId: 'project-a',
  repositoryPath: '/repo',
  scope: 'journey-stage',
  ownerId: 'feature-a',
  stageId: 3,
};

test('restores a Journey run after navigation without exposing run content', () => {
  const storage = memoryStorage();
  assert.equal(saveConnectorRunReference(reference, storage), true);
  assert.deepEqual(readConnectorRunReference('project-a', 'journey-stage', 'feature-a', '/repo', storage), reference);
});

test('keeps independent owners and scopes from restoring each other’s jobs', () => {
  const storage = memoryStorage();
  saveConnectorRunReference(reference, storage);
  assert.equal(readConnectorRunReference('project-a', 'journey-stage', 'feature-b', '/repo', storage), null);
  assert.equal(readConnectorRunReference('project-a', 'process-workflow', 'feature-a', '/repo', storage), null);
});

test('removes a run reference after its human review is accepted', () => {
  const storage = memoryStorage();
  saveConnectorRunReference(reference, storage);
  clearConnectorRunReference('project-a', 'journey-stage', 'feature-a', storage);
  assert.equal(readConnectorRunReference('project-a', 'journey-stage', 'feature-a', '/repo', storage), null);
});
