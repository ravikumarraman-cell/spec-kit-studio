import assert from 'node:assert/strict';
import test from 'node:test';
import { activeFeatureForProject, approveJourneyStage, createFeatureJourney, engineInstructionForStage, featureJourneyStages, getJourneyStageForTab, nextFeatureJourneyStage, reopenJourneyStage } from '../src/lib/featureJourney';
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

test('uses the persisted feature identity instead of inbox order', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  project.featureInbox = [
    { id: 'feature-a', title: 'Feature A', summary: 'First feature', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [] },
    { id: 'feature-b', title: 'Feature B', summary: 'Second feature', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [] },
  ];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-a' };
  assert.equal(activeFeatureForProject(project)?.id, 'feature-a');

  project.featureInbox = [...project.featureInbox].reverse();
  assert.equal(activeFeatureForProject(project)?.id, 'feature-a');
});

test('the final journey stage has no successor and never wraps back to Stage 1', () => {
  assert.equal(nextFeatureJourneyStage(7)?.id, 8);
  assert.equal(nextFeatureJourneyStage(8), undefined);
});

test('reopening a feature stage retains evidence history but invalidates downstream approvals', () => {
  const journey = { ...createFeatureJourney(), activeStage: 5, completedStages: [1, 2, 3, 4] };
  const reopened = reopenJourneyStage(journey, 3, '2026-01-03T00:00:00.000Z');
  assert.equal(reopened.activeStage, 3);
  assert.deepEqual(reopened.completedStages, [1, 2]);
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

test('feature-only stages cannot advance from workspace-wide evidence without an imported feature', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  project.constitution.rules = [{ id: 'RULE-1', title: 'Rule', category: 'Architecture', description: 'Keep boundaries.', ruleStatement: 'Keep boundaries.', strictness: 'Mandatory' }];
  project.journey = { ...createFeatureJourney(), completedStages: [1], activeStage: 3 };
  project.tasks.tasks.forEach((task) => { task.status = 'done'; });

  assert.equal(featureJourneyStages.find((item) => item.id === 3)!.ready(project), false);
  assert.equal(featureJourneyStages.find((item) => item.id === 7)!.ready(project), false);
  assert.equal(featureJourneyStages.find((item) => item.id === 8)!.ready(project), false);
});

test('Stage 2 cannot be approved from shared stories without an imported feature receipt', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stageTwo = featureJourneyStages.find((item) => item.id === 2)!;
  // Sample/workspace stories are context only; no feature owns them yet.
  assert.equal(stageTwo.ready(project), false);

  project.spec.userStories = [{ id: 'US-001', title: 'View tenant details', priority: 'High', asA: 'user', iWantTo: 'view details', soThat: 'I can act', acceptanceCriteria: ['Details are shown.'] }];
  project.spec.functionalRequirements = [{ id: 'FR-001', title: 'Show tenant details', description: 'Render the tenant detail view.', category: 'UI/UX', priority: 'High' }];

  project.featureInbox = [{
    id: 'feature-1', title: 'Tenant details', summary: 'Improve details.', source: 'text', importedAt: '2026-09-23',
    userStoryIds: project.spec.userStories.map((story) => story.id),
    requirementIds: project.spec.functionalRequirements.map((requirement) => requirement.id), taskIds: [],
  }];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-1' };
  assert.equal(stageTwo.ready(project), true);
});

test('engine instructions are only supplied for Engine-capable stages and stay task-scoped', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  assert.equal(engineInstructionForStage(2, project), null);
  assert.match(engineInstructionForStage(7, project) || '', /TASK-001/);
  assert.match(engineInstructionForStage(8, project) || '', /Do not commit, push/);
});

test('a human-reviewed local implementation receipt unlocks Stage 7 without relying on shared workspace task state', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 7)!;
  project.tasks.tasks[0].status = 'todo';
  project.featureInbox = [{
    id: 'feature-1', title: 'Tenant AIDE Funding Visibility', summary: 'Show funding status.', source: 'text',
    importedAt: '2026-09-20', userStoryIds: [], requirementIds: [], taskIds: ['T001'],
    implementationReceipts: [{
      taskId: 'T001', jobId: 'job-1', recordedAt: '2026-09-20',
      changedFiles: ['src/funding.ts'], diffStat: '1 file changed', verificationSummary: 'tests passed',
    }],
  }];

  assert.equal(stage.ready(project), true);
});

test('a shared board task cannot advance an imported feature that has unreviewed feature-scoped tasks', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 7)!;
  project.tasks.tasks[0].status = 'done';
  project.featureInbox = [{
    id: 'feature-1', slug: 'tenant-aide-funding-visibility', title: 'Tenant AIDE Funding Visibility', summary: 'Show funding status.', source: 'repository',
    importedAt: '2026-09-20', userStoryIds: [], requirementIds: ['FR-001'], taskIds: ['T001'],
    deliveryPlan: { path: 'specs/001-tenant-aide-funding-visibility/tasks.md', acceptedAt: '2026-09-20', content: '- [ ] T001 [FR-001] Show funding status' },
  }];

  assert.equal(stage.ready(project), false);
});

test('Stage 5 rejects a reviewed task document unless it contains parseable feature tasks', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 5)!;
  project.featureInbox = [{
    id: 'feature-1', slug: 'tenant-aide-funding-visibility', title: 'Tenant AIDE Funding Visibility', summary: 'Show funding status.', source: 'repository',
    importedAt: '2026-09-20', userStoryIds: [], requirementIds: ['FR-001'], taskIds: [],
    deliveryPlan: { path: 'specs/001-tenant-aide-funding-visibility/tasks.md', acceptedAt: '2026-09-20', content: '# Tenant AIDE Funding Visibility\n\nTasks will be added later.' },
  }];

  assert.equal(stage.ready(project), false);
});

test('an approved legacy Stage 7 unlocks final handoff without inventing receipts', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 8)!;
  project.journey = { ...createFeatureJourney(), completedStages: [1, 2, 3, 4, 5, 6, 7], activeStage: 8 };
  project.tasks.tasks.forEach((task) => { task.status = 'todo'; });
  project.featureInbox = [{
    id: 'feature-1', title: 'Tenant AIDE Funding Visibility', summary: 'Show funding status.', source: 'text',
    importedAt: '2026-09-20', userStoryIds: [], requirementIds: [], taskIds: ['T001'],
    deliveryPlan: { path: 'specs/tenant-aide-funding-visibility/tasks.md', content: '- [ ] T001 [FR-001] Show funding status' },
  }];

  assert.equal(stage.ready(project), true);
});

test('final handoff stays blocked until every feature-scoped task has a durable receipt', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 8)!;
  project.featureInbox = [{
    id: 'feature-1', slug: 'tenant-aide-funding-visibility', title: 'Tenant AIDE Funding Visibility', summary: 'Show funding status.', source: 'text',
    importedAt: '2026-09-20', userStoryIds: [], requirementIds: ['FR-001'], taskIds: ['T001', 'T002', 'T003'],
    deliveryPlan: { path: 'specs/tenant-aide-funding-visibility/tasks.md', acceptedAt: '2026-09-20', content: '- [ ] T001 [FR-001] First\n- [ ] T002 [FR-001] Second\n- [ ] T003 [FR-001] Third' },
    implementationReceipts: [
      { taskId: 'T001', jobId: '1', recordedAt: '', changedFiles: [], diffStat: '', verificationSummary: '' },
      { taskId: 'T002', jobId: '2', recordedAt: '', changedFiles: [], diffStat: '', verificationSummary: '' },
    ],
  }];
  assert.equal(stage.ready(project), false);
  project.featureInbox[0].implementationReceipts!.push({ taskId: 'T003', jobId: '3', recordedAt: '', changedFiles: [], diffStat: '', verificationSummary: '' });
  assert.equal(stage.ready(project), true);
});
