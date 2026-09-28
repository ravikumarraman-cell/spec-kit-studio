import assert from 'node:assert/strict';
import test from 'node:test';
import { pruneRecoverySnapshots, projectBackups, saveProjectBackup } from '../src/lib/projectBackup';
import { createProjectWorkspace } from '../src/lib/projectFactory';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test('recovery snapshots prune expired entries and retain a bounded recent history', () => {
  const previousStorage = globalThis.localStorage;
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

  try {
    const project = createProjectWorkspace('Recovery test', 'Test project');
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    storage.setItem('speckit_studio_project_backups_v1', JSON.stringify([
      { projectId: project.id, savedAt: old, reason: 'expired', project },
    ]));

    pruneRecoverySnapshots();
    assert.equal(projectBackups(project.id).length, 0);

    saveProjectBackup(project, 'one');
    saveProjectBackup(project, 'two');
    saveProjectBackup(project, 'three');
    saveProjectBackup(project, 'four');

    assert.equal(projectBackups(project.id).length, 3);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
  }
});

