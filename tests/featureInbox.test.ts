import assert from 'node:assert/strict';
import test from 'node:test';
import { createFeatureInboxItem } from '../src/lib/featureInbox';

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
});
