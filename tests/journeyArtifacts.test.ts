import assert from 'node:assert/strict';
import test from 'node:test';
import { legacyArchitectureSnapshot, officialArtifactFromAgentOutput } from '../src/lib/journeyArtifacts';
import { createProjectWorkspace } from '../src/lib/projectFactory';

test('accepts only an explicit official artifact envelope', () => {
  assert.deepEqual(officialArtifactFromAgentOutput('status\n--- Official specs/001-demo/plan.md ---\n# Plan'), { path: 'specs/001-demo/plan.md', content: '# Plan' });
  assert.equal(officialArtifactFromAgentOutput('# Plan'), null);
});

test('legacy architecture snapshots remain historical and feature-scoped', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  project.plan.markdown = 'Shared architecture evidence.';
  const snapshot = legacyArchitectureSnapshot(project, { id: 'feature', title: 'Demo', summary: 'A scoped change.', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [] });

  assert.match(snapshot, /historical context/);
  assert.match(snapshot, /Shared architecture evidence/);
});
