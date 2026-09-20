import assert from 'node:assert/strict';
import test from 'node:test';
import { approveJourneyStage, createFeatureJourney, engineInstructionForStage, featureJourneyStages, getJourneyStageForTab } from '../src/lib/featureJourney';
import { createProjectWorkspace } from '../src/lib/projectFactory';

test('feature journey has one ordered, routable definition for every stage', () => {
  assert.deepEqual(featureJourneyStages.map((stage) => stage.id), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(featureJourneyStages.map((stage) => stage.destination)).size, featureJourneyStages.length);
  assert.equal(getJourneyStageForTab('plan')?.id, 4);
  assert.equal(getJourneyStageForTab('settings'), undefined);
});

test('stage approval is explicit, idempotent, and moves to the next configured stage', () => {
  const journey = createFeatureJourney('2026-01-01T00:00:00.000Z');
  const approved = approveJourneyStage(journey, 1, '2026-01-02T00:00:00.000Z');
  const repeated = approveJourneyStage(approved, 1, '2026-01-03T00:00:00.000Z');

  assert.deepEqual(approved.completedStages, [1]);
  assert.equal(approved.activeStage, 2);
  assert.deepEqual(repeated.completedStages, [1]);
  assert.equal(repeated.activeStage, 2);
  assert.equal(repeated.updatedAt, '2026-01-03T00:00:00.000Z');
});

test('impact-map readiness honors the approved repository review instead of incidental scan shape', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 3)!;
  project.constitution.rules = [{ id: 'RULE-1', title: 'Rule', category: 'Architecture', description: 'Keep boundaries.', ruleStatement: 'Keep boundaries.', strictness: 'Mandatory' }];
  project.journey = { ...createFeatureJourney(), completedStages: [1], activeStage: 3 };
  project.featureInbox = [{ id: 'feature-1', title: 'Feature', summary: 'Feature', source: 'repository', importedAt: '2026-01-01', userStoryIds: [], requirementIds: [], taskIds: [], impactMap: { content: 'Reviewed architecture evidence.', acceptedAt: '2026-01-01' } }];
  project.importedRepo = { ...project.importedRepo!, detectedTechStack: [] };
  assert.equal(stage.ready(project), true);
});

test('engine instructions are only supplied for Engine-capable stages and stay task-scoped', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  assert.equal(engineInstructionForStage(2, project), null);
  assert.match(engineInstructionForStage(7, project) || '', /TASK-001/);
  assert.match(engineInstructionForStage(8, project) || '', /Do not commit, push/);
});
