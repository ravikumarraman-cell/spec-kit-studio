import assert from 'node:assert/strict';
import test from 'node:test';
import { activeFeatureForProject, approveJourneyStage, createFeatureJourney, engineInstructionForStage, featureHasVisualReference, featureIdForEnginePreflight, featureJourneyStages, getJourneyStageForTab, hasVisualAcceptanceContract, nextFeatureJourneyStage, reopenJourneyStage, repositoryPathForEngineStage, stageRequiresFeatureWorktree } from '../src/lib/featureJourney';
import { compactDemoPlanIssue, visualDeliveryPlanIssue } from '../src/lib/featureDeliveryTasks';
import { validateSpecKitArtifacts } from '../src/lib/specKitCompliance';
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

test('story Stage 2 requires one valid story and only its scoped requirements', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  project.spec.userStories = [
    { id: 'US-101', title: 'Export CSV', priority: 'High', asA: 'Analyst', iWantTo: 'export inventory', soThat: 'I can review it offline', acceptanceCriteria: ['CSV downloads.'], requirementIds: ['FR-101'] },
    { id: 'US-999', title: 'Delete tenant', priority: 'Low', asA: 'Admin', iWantTo: 'delete a tenant', soThat: 'old data is removed', acceptanceCriteria: ['Tenant is deleted.'], requirementIds: ['FR-999'] },
  ];
  project.spec.functionalRequirements = [
    { id: 'FR-101', title: 'Export CSV', description: 'Generate CSV.', category: 'Core', priority: 'High' },
    { id: 'FR-999', title: 'Delete tenant', description: 'Delete tenant.', category: 'Core', priority: 'Low' },
  ];
  const officialSpec = `# Feature Specification: Export CSV
## User Scenarios & Testing
### User Story 1 - Export CSV (Priority: P1)
## Requirements
### Functional Requirements
## Success Criteria
### Measurable Outcomes`;
  project.featureInbox = [{ id: 'story-1', scope: 'user-story', primaryStoryId: 'US-101', title: 'Export CSV', featureKey: 'US-101', slug: '001-export-csv', summary: '', source: 'repository', importedAt: '', userStoryIds: ['US-101'], requirementIds: ['FR-101'], taskIds: [], specification: { path: 'specs/001-export-csv/spec.md', content: officialSpec, acceptedAt: '2026-09-24' } }];
  project.journey = { ...createFeatureJourney(), featureId: 'story-1', activeStage: 2 };

  assert.equal(featureJourneyStages.find((stage) => stage.id === 2)!.ready(project), true);
  assert.match(engineInstructionForStage(2, project) || '', /speckit-specify/);
  const instruction = engineInstructionForStage(4, project) || '';
  assert.match(instruction, /USER STORY IN FOCUS: US-101/);
  assert.match(instruction, /CSV downloads/);
  assert.match(instruction, /Completion check \(required\)/);
  assert.match(instruction, /If a slash command, skill, or integration command is unavailable, do not stop/);
  assert.match(instruction, /official template unchanged/);
  assert.match(instruction, /\[FEATURE NAME\]/);
  assert.doesNotMatch(instruction, /Delete tenant/);
});

test('engine instructions are only supplied for Engine-capable stages and stay task-scoped', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  assert.equal(engineInstructionForStage(2, project), null);
  assert.match(engineInstructionForStage(7, project) || '', /TASK-001/);
  assert.equal(engineInstructionForStage(8, project), null);
});

test('bounded delivery planning asks the agent for an exact task count and keeps the artifact contract', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const instruction = engineInstructionForStage(5, project, 'compact') || '';
  assert.match(instruction, /selected bounded task count \(3–12 individual T001-style tasks\)/i);
  assert.match(instruction, /Studio bounded delivery contract — non-negotiable/);
  assert.match(instruction, /Do not run lint/i);
  assert.match(instruction, /BOUNDED CODEX MODE: Create exactly the selected number of individual T001-style tasks/);
  assert.match(instruction, /Studio will reject the run unless the final file contains exactly the requested task count/);
  assert.match(instruction, /First inspect the repository and the approved feature artifacts/);
  assert.ok(instruction.indexOf('Studio bounded delivery contract') > instruction.indexOf('Artifact completion contract'));
  const detailedInstruction = engineInstructionForStage(5, project, 'detailed') || '';
  assert.match(detailedInstruction, /First inspect whether specs\/<numbered-feature-name>\/spec\.md and specs\/<numbered-feature-name>\/plan\.md exist/);
  assert.match(detailedInstruction, /If either prerequisite is missing, skip those commands and directly author the completed delivery artifact/);
  assert.match(instruction, /Studio physical artifact proof — required/);
  assert.match(instruction, /test -s 'specs\/<numbered-feature-name>\/tasks\.md'/);
  assert.match(instruction, /Do not claim that the artifact was created unless that command succeeds/);
  assert.ok(instruction.lastIndexOf('Studio physical artifact proof') > instruction.lastIndexOf('Studio bounded delivery contract'));
  assert.doesNotMatch(engineInstructionForStage(5, project) || '', /exactly three individual tasks/i);
});

test('compact delivery plans reject detailed task artifacts', () => {
  const threeTasks = '- [ ] T001 Confirm scope\n- [ ] T002 Implement the feature\n- [ ] T003 Run focused verification';
  const detailedPlan = `${threeTasks}\n- [ ] T004 Add a fixture`;
  assert.equal(compactDemoPlanIssue(threeTasks, 3), undefined);
  assert.match(compactDemoPlanIssue(detailedPlan, 3) || '', /exactly 3 individual tasks/);
  assert.equal(compactDemoPlanIssue(`${detailedPlan}\n- [ ] T005 More work`, 5), undefined);
});

test('visual delivery plans require source hierarchy, contrast, and responsive comparison evidence', () => {
  const incomplete = '- [ ] T001 Map sources\n- [ ] T002 Implement the dashboard\n- [ ] T003 Verify it';
  const complete = [
    '- [ ] T001 Map every visible category and subcategory to an authoritative source.',
    '- [ ] T002 Preserve category hierarchy and component counts; render No Source when absent.',
    '- [ ] T003 Capture visual screenshot evidence at desktop and narrow mobile viewports; review contrast, accessibility, design tokens, and responsive reflow.',
  ].join('\n');
  assert.match(visualDeliveryPlanIssue(incomplete) || '', /hierarchy|desktop/i);
  assert.equal(visualDeliveryPlanIssue(complete), undefined);
});

test('a Studio compact plan is a valid narrow alternative to detailed task-plan headings', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const feature = { id: 'feature-compact', slug: '001-export-csv', title: 'Export CSV', summary: '', source: 'text' as const, importedAt: '', scope: 'user-story' as const, userStoryIds: [], requirementIds: [], taskIds: [] };
  const compact = `# Tasks: Export CSV\n\n## Studio Compact Delivery Plan\n\n## Phase 1: User Story 1\n\n- [ ] T001 [US1] Confirm scope against \`specs/001-export-csv/spec.md\`.\n- [ ] T002 [US1] Implement approved work from \`specs/001-export-csv/plan.md\`.\n- [ ] T003 [US1] Verify against \`specs/001-export-csv/tasks.md\`.\n\n## Dependencies & Execution Order\n\nT001, then T002, then T003.\n\n## Implementation Strategy\n\nKeep focused coverage with implementation.`;
  assert.equal(validateSpecKitArtifacts(feature, [{ path: 'specs/001-export-csv/tasks.md', kind: 'tasks', content: compact }], ['tasks']).length, 0);
  void project;
});

test('only implementation and handoff stages require a feature worktree', () => {
  for (const stageId of [1, 2, 3, 4, 5, 6]) {
    assert.equal(stageRequiresFeatureWorktree(stageId), false, `Stage ${stageId} must run from the connected checkout`);
  }
  assert.equal(stageRequiresFeatureWorktree(7), true);
  assert.equal(stageRequiresFeatureWorktree(8), true);
});

test('planning uses the connected checkout without feature branch preflight', () => {
  const mainCheckout = '/repos/cloud-asset-inventory';
  const worktree = '/repos/cloud-asset-inventory-feature';

  for (const stageId of [3, 4]) {
    assert.equal(repositoryPathForEngineStage(stageId, mainCheckout, worktree), mainCheckout);
    assert.equal(featureIdForEnginePreflight(stageId, 'feature-123'), undefined);
  }
});

test('implementation uses the registered worktree and feature-identity preflight', () => {
  assert.equal(repositoryPathForEngineStage(7, '/repos/main', '/repos/feature'), '/repos/feature');
  assert.equal(featureIdForEnginePreflight(7, 'feature-123'), 'feature-123');
  assert.equal(repositoryPathForEngineStage(7, '/repos/main'), '/repos/main');
});

test('a re-planned delivery file uses the registered worktree when one exists', () => {
  assert.equal(repositoryPathForEngineStage(5, '/repos/main', '/repos/feature-worktree'), '/repos/feature-worktree');
  assert.equal(repositoryPathForEngineStage(5, '/repos/main'), '/repos/main');
});

test('discovering a feature-scoped plan cannot unlock Stage 4 until a reviewer accepts it', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 4)!;
  project.featureInbox = [{
    id: 'feature-1', slug: 'tenant-details', title: 'Tenant details', summary: 'Improve details.', source: 'text', importedAt: '2026-09-23',
    userStoryIds: [], requirementIds: [], taskIds: [],
    architecturePlan: { path: 'specs/001-tenant-details/plan.md', content: '# Tenant details\n\n## Plan' },
  }];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-1', activeStage: 4, completedStages: [1, 2, 3] };

  assert.equal(stage.ready(project), false);
  project.featureInbox[0].architecturePlan!.acceptedAt = '2026-09-23T12:00:00.000Z';
  assert.equal(stage.ready(project), true);
});

test('reference-image features require a source-backed visual contract before plan or delivery approval', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const planStage = featureJourneyStages.find((item) => item.id === 4)!;
  const deliveryStage = featureJourneyStages.find((item) => item.id === 5)!;
  const visualContract = `## Visual Acceptance Contract

### Source mapping
Every field maps to an existing endpoint. Missing values render No Source.

### Visual verification
Compare desktop and narrow mobile screenshots with the reference image. Preserve category and component hierarchy, reuse existing design-system tokens, and review contrast and accessibility.`;
  project.featureInbox = [{
    id: 'feature-visual', slug: 'tenant-summary', title: 'Tenant summary', summary: 'Match the supplied dashboard.', source: 'repository', importedAt: '2026-09-27',
    sourceContent: `# Imported feature\n\n## Authoritative source-backed implementation contract\n\nUse endpoint TenantDetails and show No Source when a value is absent.\n\n## Other notes\n\nDiscard this unrelated text.`,
    userStoryIds: [], requirementIds: [], taskIds: [], referenceImages: [{ alt: 'Tenant dashboard', url: 'https://example.test/tenant-dashboard.png' }],
    architecturePlan: { path: 'specs/001-tenant-summary/plan.md', acceptedAt: '2026-09-27', content: '# Plan\n\n## Components' },
    deliveryPlan: { path: 'specs/001-tenant-summary/tasks.md', acceptedAt: '2026-09-27', content: '- [ ] T001 [FR-001] Build the dashboard' },
  }];
  project.journey = { ...createFeatureJourney(), featureId: 'feature-visual' };

  assert.equal(featureHasVisualReference(project), true);
  assert.equal(hasVisualAcceptanceContract(visualContract), true);
  assert.equal(planStage.ready(project), false);
  assert.equal(deliveryStage.ready(project), false);
  assert.match(engineInstructionForStage(4, project) || '', /Binding visual acceptance contract/);
  assert.match(engineInstructionForStage(4, project) || '', /Use endpoint TenantDetails/);
  assert.doesNotMatch(engineInstructionForStage(4, project) || '', /Discard this unrelated text/);
  assert.match(engineInstructionForStage(7, project) || '', /raw data list/i);

  project.featureInbox[0].architecturePlan!.content += `\n\n${visualContract}`;
  project.featureInbox[0].deliveryPlan!.content = `# Tasks: Tenant summary\n\n${visualContract}\n\n- [ ] T001 [FR-001] Create an authoritative source mapping for every visible category, subcategory, and count.\n- [ ] T002 [FR-001] Preserve hierarchy and render No Source for absent source values.\n- [ ] T003 [FR-001] Capture desktop and narrow mobile visual screenshots; review contrast, accessibility, design tokens, and responsive reflow.`;
  assert.equal(planStage.ready(project), true);
  assert.equal(deliveryStage.ready(project), true);
});

test('Stage 7 unlocks only after every official feature task has a reviewed receipt', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 7)!;
  project.tasks.tasks[0].status = 'todo';
  project.featureInbox = [{
    id: 'feature-1', slug: 'tenant-aide-funding-visibility', title: 'Tenant AIDE Funding Visibility', summary: 'Show funding status.', source: 'text',
    importedAt: '2026-09-20', userStoryIds: [], requirementIds: [], taskIds: ['T001', 'T002'],
    deliveryPlan: { path: 'specs/tenant-aide-funding-visibility/tasks.md', acceptedAt: '2026-09-20', content: '- [ ] T001 [FR-001] First\n- [ ] T002 [FR-001] Second' },
    implementationReceipts: [{
      taskId: 'T001', jobId: 'job-1', recordedAt: '2026-09-20',
      changedFiles: ['src/funding.ts'], diffStat: '1 file changed', verificationSummary: 'tests passed',
    }],
  }];

  assert.equal(stage.ready(project), false);
  project.featureInbox[0].implementationReceipts!.push({ taskId: 'T002', jobId: 'job-2', recordedAt: '2026-09-20', changedFiles: ['src/funding.test.ts'], diffStat: '1 file changed', verificationSummary: 'tests passed' });
  project.featureInbox[0].deliveryPlan!.content = '- [x] T001 [FR-001] First\n- [x] T002 [FR-001] Second';
  assert.equal(stage.ready(project), true);
});

test('a checked tasks.md line cannot substitute for a reviewed implementation receipt', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 7)!;
  project.featureInbox = [{
    id: 'feature-1', slug: 'tenant-aide-funding-visibility', title: 'Tenant AIDE Funding Visibility', summary: 'Show funding status.', source: 'text',
    importedAt: '2026-09-20', userStoryIds: [], requirementIds: [], taskIds: ['T001'],
    deliveryPlan: { path: 'specs/tenant-aide-funding-visibility/tasks.md', acceptedAt: '2026-09-20', content: '- [x] T001 [FR-001] Already checked in the plan' },
  }];
  assert.equal(stage.ready(project), false);
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

test('an approved legacy Stage 7 cannot unlock final handoff without task-scoped evidence', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const stage = featureJourneyStages.find((item) => item.id === 8)!;
  project.journey = { ...createFeatureJourney(), completedStages: [1, 2, 3, 4, 5, 6, 7], activeStage: 8 };
  project.tasks.tasks.forEach((task) => { task.status = 'todo'; });
  project.featureInbox = [{
    id: 'feature-1', title: 'Tenant AIDE Funding Visibility', summary: 'Show funding status.', source: 'text',
    importedAt: '2026-09-20', userStoryIds: [], requirementIds: [], taskIds: ['T001'],
    deliveryPlan: { path: 'specs/tenant-aide-funding-visibility/tasks.md', content: '- [ ] T001 [FR-001] Show funding status' },
  }];

  assert.equal(stage.ready(project), false);
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
  project.featureInbox[0].deliveryPlan!.content = '- [x] T001 [FR-001] First\n- [x] T002 [FR-001] Second\n- [x] T003 [FR-001] Third';
  assert.equal(stage.ready(project), true);
});
