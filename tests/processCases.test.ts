import assert from 'node:assert/strict';
import test from 'node:test';
import { approveProcessStep, changedFilesFromWorkflowArtifact, createProcessCase, isProcessCaseComplete, isRecoverableArtifactReceipt, isRecoverableWorkflowSuccess, isWorkflowBlockedOutput, normalizeProcessCase, processDefinitions, reopenProcessStep, retainProcessStepReceipt, reviseProcessCase } from '../src/lib/processCases';

test('bug cases keep the official three-step assess, fix, test sequence isolated by slug', () => {
  const item = createProcessCase('bug', 'Login crash', 'Empty password crashes the form.', '2026-09-21T00:00:00.000Z');
  assert.equal(item.slug, 'login-crash');
  assert.deepEqual(processDefinitions.bug.steps.map((step) => step.artifact), ['assessment.md', 'fix.md', 'test.md']);
  assert.match(processDefinitions.bug.steps[0].command(item), /assessment\.md/);
  assert.match(processDefinitions.bug.root(item.slug), /\.specify\/bugs\/login-crash/);
  assert.equal('setup' in processDefinitions.bug, false);
});

test('idea assessment keeps source changes out of every step and preserves a deliberate decision', () => {
  const item = createProcessCase('assessment', 'Offline mode', 'Let field staff work offline.', '2026-09-21T00:00:00.000Z');
  assert.ok(processDefinitions.assessment.steps.every((step) => step.writeScope === 'read-only'));
  const reviewed = approveProcessStep(retainProcessStepReceipt(item, 'intake.md created'), 'needs-clarification');
  assert.deepEqual(reviewed.completedSteps, [0]);
  assert.equal(reviewed.currentStep, 1);
  assert.equal(reviewed.verdict, 'needs-clarification');
});

test('successful process execution is retained separately from explicit review', () => {
  const item = createProcessCase('bug', 'Login crash', 'Empty password crashes the form.', '2026-09-21T00:00:00.000Z');
  const executed = retainProcessStepReceipt(item, 'assessment.md created');
  assert.equal(executed.currentStep, 0);
  assert.deepEqual(executed.completedSteps, []);
  assert.equal(executed.stepReceipts?.[0].step, 0);
  assert.match(executed.stepReceipts?.[0].summary || '', /assessment\.md/);
});

test('reopening a completed process step preserves evidence but invalidates dependent approvals', () => {
  const item = createProcessCase('bug', 'Login crash', 'Empty password crashes the form.', '2026-09-21T00:00:00.000Z');
  const assessed = approveProcessStep(retainProcessStepReceipt(item, 'assessment.md created'));
  const fixed = approveProcessStep(retainProcessStepReceipt(assessed, 'fix.md created'));
  const reopened = reopenProcessStep(fixed, 0);
  assert.equal(reopened.currentStep, 0);
  assert.deepEqual(reopened.completedSteps, []);
  assert.deepEqual(reopened.stepReceipts, []);
});

test('a clean agent exit that reports a workflow block is never treated as success', () => {
  assert.equal(isWorkflowBlockedOutput('## Status\n\nBlocked before assessment and implementation.\n\n## Unresolved limitations\nSpec Kit is unavailable.'), true);
  assert.equal(isWorkflowBlockedOutput('assessment.md created and verification completed.'), false);
  assert.equal(isWorkflowBlockedOutput('## Unresolved limitations\n\nNo other files were intentionally changed.'), false);
});

test('a stale blocked receipt is reopened safely and cannot be shown as a completed workflow', () => {
  const item = createProcessCase('bug', 'Login crash', 'Empty password crashes the form.', '2026-09-21T00:00:00.000Z');
  const stale = { ...item, currentStep: 2, completedSteps: [0, 1, 2], stepReceipts: [{ step: 0, completedAt: item.createdAt, summary: '## Status\n\nBlocked before assessment and implementation.' }] };
  const repaired = normalizeProcessCase(stale);
  assert.equal(repaired.currentStep, 0);
  assert.deepEqual(repaired.completedSteps, []);
  assert.deepEqual(repaired.stepReceipts, []);
  assert.equal(isProcessCaseComplete(repaired), false);
});

test('a process step cannot advance without retained successful evidence', () => {
  const item = createProcessCase('bug', 'Login crash', 'Empty password crashes the form.', '2026-09-21T00:00:00.000Z');
  assert.equal(approveProcessStep(item), item);
  assert.equal(retainProcessStepReceipt(item, '## Status\n\nBlocked before assessment.').stepReceipts, undefined);
});

test('a legacy misclassified agent result can be recovered only with an artifact and passing verification', () => {
  assert.equal(isRecoverableWorkflowSuccess('Created [fix.md]. Result: 1 suite passed, 3 tests passed. git diff --check passed.', 'fix.md'), true);
  assert.equal(isRecoverableWorkflowSuccess('Created/updated only [test.md]. Focused Jest test passed: 3/3.', 'test.md'), true);
  assert.equal(isRecoverableWorkflowSuccess('Created [fix.md].', 'fix.md'), false);
  assert.equal(isRecoverableArtifactReceipt('# Fix\n\n## Tests\nTest Suites: 1 passed, 1 total\nTests: 3 passed', 'fix.md'), true);
});

test('editing a reviewed report preserves its identity while reopening dependent workflow evidence', () => {
  const item = createProcessCase('bug', 'Login crash', 'Empty password crashes the form.', '2026-09-21T00:00:00.000Z');
  const reviewed = approveProcessStep(retainProcessStepReceipt(item, 'assessment.md created'));
  const revised = reviseProcessCase(reviewed, 'Login validation crash', 'Updated reproduction steps.');
  assert.equal(revised.id, item.id);
  assert.equal(revised.slug, item.slug);
  assert.equal(revised.title, 'Login validation crash');
  assert.equal(revised.currentStep, 0);
  assert.deepEqual(revised.completedSteps, []);
});

test('a fix artifact restores its changed-source inventory for read-only code review', () => {
  const artifact = `# Fix\n\n## Changed files\n- \`frontend/src/utils/safe-resize-observer.js\`\n- \`frontend/src/utils/safe-resize-observer.test.js\`\n\n## Tests\nPassed`;
  assert.deepEqual(changedFilesFromWorkflowArtifact(artifact), [
    'frontend/src/utils/safe-resize-observer.js',
    'frontend/src/utils/safe-resize-observer.test.js',
  ]);
});

test('idea assessments require an explicit human decision before completion', () => {
  let item = createProcessCase('assessment', 'Offline mode', 'Allow field teams to work without a connection.', '2026-09-21T00:00:00.000Z');
  for (let step = 0; step < 4; step += 1) item = approveProcessStep(retainProcessStepReceipt(item, `${processDefinitions.assessment.steps[step].artifact} created`));
  item = retainProcessStepReceipt(item, 'decision.md created');
  assert.equal(approveProcessStep(item), item);
  const decided = approveProcessStep(item, 'needs-clarification');
  assert.equal(decided.verdict, 'needs-clarification');
  assert.equal(isProcessCaseComplete(decided), true);
});

test('substantive evidence-only assessment artifacts recover after refresh', () => {
  assert.equal(isRecoverableWorkflowSuccess('Created decision.md with a recommendation.', 'decision.md'), true);
  assert.equal(isRecoverableArtifactReceipt('# Decision\n\n## Recommendation\nGather more evidence before funding this work.\n\n## Rationale\nThe required customer and operational evidence is incomplete.', 'decision.md'), true);
});
