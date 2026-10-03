import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('quality-gate and process decisions require a visible review route plus a human acknowledgement', async () => {
  const [audit, process, prompt] = await Promise.all([
    readFile(new URL('../src/components/audit/AuditDashboard.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/process/ProcessStudio.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/prompt/PromptStudio.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(audit, /Review audit evidence/);
  assert.match(audit, /I reviewed this audit’s score dimensions, findings, and advisory guidance/);
  assert.match(audit, /One action is blocking progress: run quality checks/);
  assert.match(audit, /disabled=\{!hasReviewedAudit\}/);
  assert.match(process, /Review \{step\.artifact\}/);
  assert.match(process, /I reviewed this artifact and its recorded evidence/);
  assert.match(process, /disabled=\{!hasReviewedArtifact\}/);
  assert.match(process, /process-artifact-\$\{item\.id\}-\$\{index\}/);
  assert.match(prompt, /Review approved feature artifacts/);
  assert.match(prompt, /Confirm review and record approval/);
  assert.match(prompt, /featureDeliveryReviewStatus\(featureTasks, reviewedFeatureTaskIds\)/);
  assert.match(prompt, /All planned work has reviewed evidence/);
  assert.match(prompt, /Review Stage 7 evidence/);
  assert.match(prompt, /!allFeatureTasksReviewed && !isHumanApprovalTask/);
});
