import assert from 'node:assert/strict';
import test from 'node:test';
import { portableFeatureTaskPrompt, portableTaskPrompt } from '../src/lib/portablePrompts';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { parseFeatureDeliveryTasks } from '../src/lib/featureDeliveryTasks';

test('portable prompt includes task, constitution, and evidence', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const prompt = portableTaskPrompt(project, project.tasks.tasks[0], 'copilot', ['src/app.tsx']);
  assert.match(prompt, /TASK-001/);
  assert.match(prompt, /explicitly typed/);
  assert.match(prompt, /src\/app.tsx/);
});

test('parses official feature tasks and carries only mapped feature evidence into the handoff', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  project.spec.functionalRequirements = [
    { id: 'FR-003', title: 'Show funding status', description: 'Show AIDE status for the tenant.', category: 'Core', priority: 'High' },
    { id: 'FR-999', title: 'Unrelated shared feature', description: 'Must not appear.', category: 'Core', priority: 'Low' },
  ];
  const feature = {
    id: 'feature-1',
    title: 'Tenant AIDE Funding Visibility',
    summary: 'Make funding status visible before onboarding.',
    source: 'text' as const,
    importedAt: '2026-09-20T00:00:00.000Z',
    userStoryIds: [],
    requirementIds: ['FR-003'],
    taskIds: ['T001'],
    architecturePlan: { path: 'specs/001-aide/plan.md', content: '# Tenant AIDE Funding Visibility\n\n## Architecture\nUse the existing tenant service.' },
    deliveryPlan: { path: 'specs/001-aide/tasks.md', content: '- [ ] T001 [FR-003] Show the AIDE funding status' },
  };
  const [task] = parseFeatureDeliveryTasks(feature.deliveryPlan.content);
  const prompt = portableFeatureTaskPrompt(project, feature, task, 'codex');

  assert.equal(task.id, 'T001');
  assert.deepEqual(task.requirementIds, ['FR-003']);
  assert.match(prompt, /Tenant AIDE Funding Visibility/);
  assert.match(prompt, /FR-003: Show funding status/);
  assert.doesNotMatch(prompt, /Unrelated shared feature/);
  assert.match(prompt, /specs\/001-aide\/plan\.md/);
});

test('parses numbered Spec-Kit task lists when an imported repository omits checklist markers', () => {
  const tasks = parseFeatureDeliveryTasks('1. T001 [FR-001] Prepare the tenant detail view\n2. T002 [FR-002, NFR-001] Verify the new view');

  assert.deepEqual(tasks.map((task) => task.id), ['T001', 'T002']);
  assert.deepEqual(tasks[1].requirementIds, ['FR-002', 'NFR-001']);
});
