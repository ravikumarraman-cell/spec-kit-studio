import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectFromFeatureExtraction } from '../src/lib/importProjectFactory';
import { StorageService } from '../src/lib/storage';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

class FailingStorage extends MemoryStorage {
  override setItem(key: string, value: string) {
    if (key === 'speckit_studio_projects_v1') throw new Error('storage quota exceeded');
    super.setItem(key, value);
  }
}

class RecoveryPressureStorage extends MemoryStorage {
  private failNextProjectWrite = true;

  override setItem(key: string, value: string) {
    if (key === 'speckit_studio_projects_v1' && this.failNextProjectWrite) {
      this.failNextProjectWrite = false;
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    }
    super.setItem(key, value);
  }
}

test('saving an imported project activates and retains its feature receipt', () => {
  const previousStorage = globalThis.localStorage;
  const memoryStorage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage });

  try {
    const storage = new StorageService();
    const imported = createProjectFromFeatureExtraction({
      title: 'Security assessment percentage bars',
      summary: 'Show an accurate security assessment result.',
      userStories: [{
        id: 'US-1',
        title: 'View assessment',
        priority: 'High',
        asA: 'security analyst',
        iWantTo: 'view the assessment',
        soThat: 'I can understand the current result',
        acceptanceCriteria: ['The assessment result is visible.'],
      }],
    }, 'Fallback', '2026-09-23T00:00:00.000Z');

    storage.saveImportedProject(imported);
    const active = storage.getActiveProject();

    assert.equal(active.id, imported.id);
    assert.equal(active.featureInbox?.length, 1);
    assert.equal(active.featureInbox?.[0].title, 'Security assessment percentage bars');
    assert.equal(active.featureInbox?.[0].userStoryIds[0], 'US-1');
    assert.equal(memoryStorage.getItem('speckit_studio_active_project_id'), imported.id);

    // A subsequent save of the same imported project must update that project,
    // not duplicate it or switch the user back to a previous workspace.
    const updated = {
      ...imported,
      description: 'Updated imported feature summary.',
      featureInbox: imported.featureInbox?.map((feature) => ({ ...feature, summary: 'Updated receipt' })),
    };
    storage.saveImportedProject(updated);
    const projects = storage.getProjects();

    assert.equal(projects.filter((project) => project.id === imported.id).length, 1);
    assert.equal(projects.length, 2); // starter workspace plus this imported workspace
    assert.equal(storage.getActiveProject().id, imported.id);
    assert.equal(storage.getActiveProject().description, 'Updated imported feature summary.');
    assert.equal(storage.getActiveProject().featureInbox?.[0].summary, 'Updated receipt');

    // Workspaces created during the prior release may already be missing this
    // connection. Repair only when one connected parent makes the ownership
    // unambiguous; a second repository must never be guessed.
    const parent = createProjectFromFeatureExtraction({}, 'Connected parent', '2026-09-22T00:00:00.000Z');
    parent.importedRepo = {
      repoUrl: '/workspace/cloud-asset-inventory', repoName: 'cloud-asset-inventory', description: 'Connected parent',
      primaryLanguage: 'TypeScript', detectedTechStack: [], architectureSummary: 'Known architecture', keyDirectories: ['frontend'],
      suggestedNewFeatures: [], importedAt: '2026-09-22T00:00:00.000Z',
    };
    parent.repositoryIdentity = { canonicalRemote: 'github.com/example/cloud-asset-inventory', lastScannedAt: '2026-09-22T00:00:00.000Z' };
    const legacy = createProjectFromFeatureExtraction({ title: 'Legacy imported feature' }, 'Fallback', '2026-09-24T00:00:00.000Z');
    storage.saveProjects([legacy, parent]);
    storage.setActiveProjectId(legacy.id);

    const repaired = storage.getActiveProject();
    assert.equal(repaired.id, legacy.id);
    assert.equal(repaired.importedRepo?.repoUrl, '/workspace/cloud-asset-inventory');
    assert.equal(repaired.repositoryIdentity?.canonicalRemote, 'github.com/example/cloud-asset-inventory');
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
  }
});

test('a failed workspace write reports failure and leaves the durable project unchanged', () => {
  const previousStorage = globalThis.localStorage;
  const memoryStorage = new FailingStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage });

  try {
    const storage = new StorageService();
    const project = createProjectFromFeatureExtraction({ title: 'Durable import' }, 'Fallback');

    assert.equal(storage.updateActiveProject(project), false);
    assert.equal(memoryStorage.getItem('speckit_studio_projects_v1'), null);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
  }
});

test('primary workspace save reclaims optional recovery snapshots before failing for quota pressure', () => {
  const previousStorage = globalThis.localStorage;
  const memoryStorage = new RecoveryPressureStorage();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage });

  try {
    memoryStorage.setItem('speckit_studio_project_backups_v1', JSON.stringify([{ projectId: 'old', savedAt: 'now' }]));
    const storage = new StorageService();
    const project = createProjectFromFeatureExtraction({ title: 'Quota-safe import' }, 'Fallback');

    assert.equal(storage.saveProjects([project]), true);
    assert.equal(memoryStorage.getItem('speckit_studio_project_backups_v1'), null);
    assert.equal(storage.getProjects()[0].id, project.id);
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: previousStorage });
  }
});
