import assert from 'node:assert/strict';
import test from 'node:test';
import { createDashboardViewModel } from '../src/lib/dashboard/dashboardViewModel';
import { createFeatureJourney } from '../src/lib/featureJourney';
import { createProjectWorkspace } from '../src/lib/projectFactory';

test('dashboard gives an unconnected workspace one setup action', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  project.importedRepo = undefined;
  project.featureInbox = undefined;

  const model = createDashboardViewModel(project);
  assert.equal(model.dominant, 'onboarding');
  assert.equal(model.nextAction.destination.tab, 'workspace');
  assert.equal(model.nextAction.title, 'Connect a repository');
});

test('dashboard routes a selected delivery item to the authoritative journey', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  project.importedRepo = { ...project.importedRepo!, repoUrl: '/workspace/example' };
  project.featureInbox = [{ id: 'feature-1', title: 'Review access', summary: 'Make access reviewable.', source: 'text', importedAt: '2026-01-01', userStoryIds: [], requirementIds: [], taskIds: [] }];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-1', activeStage: 4, completedStages: [1, 2, 3] };

  const model = createDashboardViewModel(project);
  assert.equal(model.dominant, 'next-action');
  assert.equal(model.nextAction.destination.tab, 'journey');
  assert.equal(model.nextAction.title, 'Design safely');
  assert.equal(model.queue[0].id, 'feature-1');
});

test('dashboard does not invent a new completion action', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  project.importedRepo = { ...project.importedRepo!, repoUrl: '/workspace/example' };
  project.featureInbox = [{ id: 'feature-1', title: 'Review access', summary: 'Make access reviewable.', source: 'text', importedAt: '2026-01-01', userStoryIds: [], requirementIds: [], taskIds: [] }];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-1', activeStage: 8, completedStages: [1, 2, 3, 4, 5, 6, 7, 8] };

  const model = createDashboardViewModel(project);
  assert.equal(model.dominant, 'completion');
  assert.equal(model.nextAction.destination.tab, 'export');
});

test('dashboard insights are derived from retained workspace evidence', () => {
  const project = createProjectWorkspace('Example', 'Example workspace');
  project.spec.functionalRequirements = [{ id: 'FR-1', title: 'Review access', description: 'A reviewer can inspect access.', category: 'Core', priority: 'High' }];
  project.tasks.tasks = [{ id: 'T-1', title: 'Implement access review', description: 'Implement it.', phase: 'Phase 2: Core Infrastructure', status: 'todo', estimatedHours: 1, dependencies: [], mappedRequirementId: 'FR-1' }];
  project.audit = { overallScore: 92, completenessScore: 92, clarityScore: 92, testabilityScore: 92, traceabilityScore: 92, summary: 'Reviewable.', gaps: ['Missing glossary'], ambiguities: [], recommendations: [], lastAudited: '2026-01-01' };

  const model = createDashboardViewModel(project);
  assert.deepEqual(model.insights.map((insight) => insight.value), ['1/1', '92%', '0']);
  assert.deepEqual(model.insights.map((insight) => insight.destination.tab), ['tasks', 'audit', 'journey']);
});
