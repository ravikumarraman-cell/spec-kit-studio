import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { buildFeatureRegistry } from '../src/lib/featureRegistry';

test('feature registry flags only explicit path overlap', () => {
  const project = createProjectWorkspace('Example', 'Example');
  project.featureInbox = [
    { id: 'one', featureKey: 'ONE-1', slug: 'one', title: 'One', summary: '', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [], allowedSourceRoots: ['src/api'] },
    { id: 'two', featureKey: 'TWO-2', slug: 'two', title: 'Two', summary: '', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [], allowedSourceRoots: ['src/api/routes'] },
  ];
  assert.equal(buildFeatureRegistry(project)[0].conflicts.length, 1);
});
