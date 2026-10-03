import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { migrateSddEngineProject, normalizeSddEngineSelection, SDD_ENGINE_SELECTION_SCHEMA_VERSION } from '../src/lib/sddEngineMigration';

test('legacy and invalid SDD selections migrate idempotently to the historical GitHub Spec Kit behavior', () => {
  const legacy = createProjectWorkspace('Legacy', 'A migrated project');
  delete legacy.sddEngine;
  delete legacy.sddEngineSchemaVersion;
  const migrated = migrateSddEngineProject(legacy);
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.project.sddEngine, 'github-spec-kit');
  assert.equal(migrated.project.sddEngineSchemaVersion, SDD_ENGINE_SELECTION_SCHEMA_VERSION);
  assert.equal(migrateSddEngineProject(migrated.project).migrated, false);
  assert.equal(normalizeSddEngineSelection('untrusted-engine'), 'github-spec-kit');
  assert.equal(normalizeSddEngineSelection('openspec'), 'openspec');
});
