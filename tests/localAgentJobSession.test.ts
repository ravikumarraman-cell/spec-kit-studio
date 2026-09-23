import assert from 'node:assert/strict';
import test from 'node:test';
import { clearLocalAgentJobReference, readLocalAgentJobReference, saveLocalAgentJobReference } from '../src/lib/localAgentJobSession';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const reference = {
  jobId: 'job-123',
  projectId: 'project-a',
  featureId: 'feature-a',
  taskId: 'T002',
  repositoryPath: '/repo/feature-a',
};

test('restores a feature task job reference across navigation', () => {
  const storage = memoryStorage();
  assert.equal(saveLocalAgentJobReference(reference, storage), true);
  assert.deepEqual(readLocalAgentJobReference('project-a', 'feature-a', '/repo/feature-a', storage), reference);
});

test('never restores a job reference into another feature or worktree', () => {
  const storage = memoryStorage();
  saveLocalAgentJobReference(reference, storage);
  assert.equal(readLocalAgentJobReference('project-a', 'feature-b', '/repo/feature-a', storage), null);
  assert.equal(readLocalAgentJobReference('project-a', 'feature-a', '/repo/other-worktree', storage), null);
});

test('clears the reference only after the task receipt has been retained', () => {
  const storage = memoryStorage();
  saveLocalAgentJobReference(reference, storage);
  clearLocalAgentJobReference('project-a', 'feature-a', storage);
  assert.equal(readLocalAgentJobReference('project-a', 'feature-a', '/repo/feature-a', storage), null);
});
