import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { resolveStackProfile } from '../src/lib/stackProfiles';
import { portableFeatureTaskPrompt } from '../src/lib/portablePrompts';

test('stack profiles provide safe technology-specific defaults', () => {
  const project = createProjectWorkspace('Example', 'Example');
  project.stackProfile = { id: 'infrastructure' };
  assert.match(resolveStackProfile(project).guidance, /Never apply/);
});

test('feature task contract includes the resolved stack guardrails', () => {
  const project = createProjectWorkspace('Example', 'Example');
  const feature = { id: 'f', featureKey: 'EX-1', slug: 'ex-1', title: 'Example feature', summary: '', source: 'text' as const, importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [] };
  const prompt = portableFeatureTaskPrompt(project, feature, { id: 'T001', title: 'Do work', done: false, requirementIds: [] }, 'codex');
  assert.match(prompt, /Stack execution contract/);
});
