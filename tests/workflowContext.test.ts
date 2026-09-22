import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { activeWorkflowContext, workflowBaselineContext } from '../src/lib/workflowContext';

test('workflow context resolves a bug case to its own next step instead of feature delivery', () => {
  const project = createProjectWorkspace('Example', 'Example');
  project.workflowFocus = 'bug';
  project.processCases = [{ id: 'bug-1', kind: 'bug', slug: 'login-crash', title: 'Login crash', input: 'Crash', currentStep: 0, completedSteps: [], createdAt: '2026-09-22', updatedAt: '2026-09-22' }];
  assert.equal(workflowBaselineContext(project).action, 'Assess the problem');
  assert.equal(activeWorkflowContext(project)?.nextStep, 'Assess the problem');
});

test('feature delivery remains the default only when no independent workflow is active', () => {
  const project = createProjectWorkspace('Example', 'Example');
  assert.equal(activeWorkflowContext(project), null);
  assert.equal(workflowBaselineContext(project).action, 'Describe feature');
});
