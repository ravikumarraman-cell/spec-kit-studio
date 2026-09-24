import assert from 'node:assert/strict';
import test from 'node:test';
import { createFeatureInboxItem, createStoryInboxItem } from '../src/lib/featureInbox';
import { deliveryScope, validateDeliveryItem } from '../src/lib/deliveryItems';
import { createProjectWorkspace } from '../src/lib/projectFactory';

test('feature inbox keeps an import receipt and links it to generated artifacts', () => {
  const item = createFeatureInboxItem({
    title: 'Access review reminders', summary: 'Notify reviewers before access reviews expire.',
    userStories: [{ id: 'US-301', title: 'Receive reminder', priority: 'High', asA: 'Reviewer', iWantTo: 'receive a reminder', soThat: 'I can act in time', acceptanceCriteria: [] }],
    functionalRequirements: [{ id: 'FR-301', title: 'Schedule reminders', description: 'Schedule notices.', category: 'Core', priority: 'High' }],
    tasks: [{ id: 'TASK-301', title: 'Create scheduler' }],
  }, 'github', 1, '2026-01-01T00:00:00.000Z');

  assert.equal(item.id, 'feature-1767225600000-2');
  assert.equal(item.source, 'github');
  assert.deepEqual(item.userStoryIds, ['US-301']);
  assert.deepEqual(item.requirementIds, ['FR-301']);
  assert.deepEqual(item.taskIds, ['TASK-301']);
  assert.equal(deliveryScope(item), 'feature');
});

test('legacy inbox items remain feature scoped when scope is absent', () => {
  assert.equal(deliveryScope({ id: 'legacy', title: 'Legacy', summary: '', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [] }), 'feature');
});

test('story inbox items own exactly one resolvable story', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const story = { id: 'US-401', title: 'Export inventory', priority: 'High' as const, asA: 'Analyst', iWantTo: 'export inventory', soThat: 'I can review it offline', acceptanceCriteria: ['CSV downloads.'], requirementIds: ['FR-401'] };
  const requirement = { id: 'FR-401', title: 'Export CSV', description: 'Generate a CSV file.', category: 'Core' as const, priority: 'High' as const };
  project.spec.userStories = [story];
  project.spec.functionalRequirements = [requirement];

  const item = createStoryInboxItem(story, [requirement], 'text', 0, undefined, '2026-09-24T00:00:00.000Z');

  assert.equal(deliveryScope(item), 'user-story');
  assert.equal(item.featureKey, 'US-401');
  assert.equal(item.slug, '001-export-inventory');
  assert.equal(item.primaryStoryId, 'US-401');
  assert.deepEqual(item.userStoryIds, ['US-401']);
  assert.deepEqual(validateDeliveryItem(project, item), []);
});
