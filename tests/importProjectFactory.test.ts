import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectFromFeatureExtraction } from '../src/lib/importProjectFactory';

test('feature extraction factory supplies a complete project when AI output is sparse', () => {
  const project = createProjectFromFeatureExtraction({}, 'Billing portal', '2026-01-01T00:00:00.000Z');

  assert.equal(project.name, 'Billing portal');
  assert.equal(project.spec.title, 'Billing portal');
  assert.equal(project.plan.techStack.length, 2);
  assert.equal(project.spec.userFlows.length, 3);
  assert.equal(project.featureInbox?.length, 1);
  assert.equal(project.featureInbox?.[0].title, 'Billing portal');
  assert.equal(project.createdAt, '2026-01-01T00:00:00.000Z');
});

test('feature extraction factory preserves valid artifacts and normalizes invalid task phases', () => {
  const project = createProjectFromFeatureExtraction({
    title: 'Access reviews',
    summary: 'Review privileged access quarterly.',
    tasks: [{ title: 'Create review endpoint', phase: 'not-a-phase', estimatedHours: 5 }],
    constitutionRules: [{ title: 'Tests required', category: 'Testing & QA', strictness: 'Mandatory' }],
  }, 'Fallback title', '2026-01-02T00:00:00.000Z');

  assert.equal(project.spec.summary, 'Review privileged access quarterly.');
  assert.equal(project.tasks.tasks[0].phase, 'Phase 1: Setup');
  assert.equal(project.tasks.tasks[0].estimatedHours, 5);
  assert.equal(project.constitution.rules[0].category, 'Testing & QA');
});
