import test from 'node:test';
import assert from 'node:assert/strict';
import { groupRequirementsByFeature, groupStoriesByFeature } from '../src/lib/featureStoryGroups';

test('groups imported stories by inbox receipt and leaves existing stories visible', () => {
  const stories = [
    { id: 'US-001', title: 'Existing' }, { id: 'US-101', title: 'Funding' }, { id: 'US-102', title: 'Action' },
  ] as any;
  const groups = groupStoriesByFeature(stories, [{ id: 'feature-1', title: 'Funding validation', summary: 'Imported from Engine', source: 'repository', importedAt: '2026-01-01', userStoryIds: ['US-101', 'US-102'], requirementIds: [], taskIds: [] }]);
  assert.deepEqual(groups.map((group) => [group.label, group.stories.length]), [['Existing workspace stories', 1], ['Funding validation', 2]]);
});

test('groups imported requirements by the same inbox receipt', () => {
  const requirements = [{ id: 'FR-001' }, { id: 'FR-101' }, { id: 'FR-102' }] as any;
  const inbox = [{ id: 'feature-1', title: 'Funding validation', summary: 'Imported from Engine', source: 'repository', importedAt: '2026-01-01', userStoryIds: [], requirementIds: ['FR-101', 'FR-102'], taskIds: [] }] as any;
  const groups = groupRequirementsByFeature(requirements, inbox);
  assert.deepEqual(groups.map((group) => [group.label, group.requirements.length]), [['Existing workspace requirements', 1], ['Funding validation', 2]]);
});
