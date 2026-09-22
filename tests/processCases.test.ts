import assert from 'node:assert/strict';
import test from 'node:test';
import { approveProcessStep, createProcessCase, processDefinitions } from '../src/lib/processCases';

test('bug cases keep the official three-step assess, fix, test sequence isolated by slug', () => {
  const item = createProcessCase('bug', 'Login crash', 'Empty password crashes the form.', '2026-09-21T00:00:00.000Z');
  assert.equal(item.slug, 'login-crash');
  assert.deepEqual(processDefinitions.bug.steps.map((step) => step.artifact), ['assessment.md', 'fix.md', 'test.md']);
  assert.match(processDefinitions.bug.steps[0].command(item), /speckit-bug-assess/);
  assert.match(processDefinitions.bug.root(item.slug), /\.specify\/bugs\/login-crash/);
});

test('idea assessment keeps source changes out of every step and preserves a deliberate decision', () => {
  const item = createProcessCase('assessment', 'Offline mode', 'Let field staff work offline.', '2026-09-21T00:00:00.000Z');
  assert.ok(processDefinitions.assessment.steps.every((step) => step.writeScope === 'read-only'));
  const reviewed = approveProcessStep(item, 'needs-clarification');
  assert.deepEqual(reviewed.completedSteps, [0]);
  assert.equal(reviewed.currentStep, 1);
  assert.equal(reviewed.verdict, 'needs-clarification');
});
