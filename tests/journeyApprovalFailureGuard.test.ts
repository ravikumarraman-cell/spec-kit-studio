import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('a failed or unverified current-stage run can never expose journey approval', async () => {
  const source = await readFile(new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url), 'utf8');
  assert.match(source, /const approvalBlockedByCurrentRun = Boolean\(/);
  assert.match(source, /agentJob && agentStageId === current\.id && !agentJob\.ok/);
  assert.match(source, /const canApproveCurrentStage = current\.ready\(project\)/);
  assert.match(source, /&& !approvalBlockedByCurrentRun/);
  assert.match(source, /canApprove=\{canApproveCurrentStage\}/);
  assert.match(source, /if \(!stage\.ready\(project\) \|\| approvalBlockedByCurrentRun\) return/);
});

test('failed-agent diagnostics are expanded automatically', async () => {
  const source = await readFile(new URL('../src/components/common/AgentJobStatus.tsx', import.meta.url), 'utf8');
  assert.match(source, /<details open=\{!isRunning && !isSuccess\} className="agent-job-status-details/);
});

test('Stage 8 uses deterministic verification rather than an automatic Codex converge run', async () => {
  const [journey, stages] = await Promise.all([
    readFile(new URL('../src/components/journey/FeatureJourney.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/featureJourney.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(journey, /const runDeterministicHandoff/);
  assert.match(journey, /startFeatureVerification\(repositoryPath\)/);
  assert.match(journey, /if \(stage\.id === 8\) \{ if \(noAutomatedVerificationCommand\) \{ void recordManualHandoffVerification\(\); \} else \{ void runDeterministicHandoff\(\); \} return; \}/);
  assert.match(journey, /const recordManualHandoffVerification/);
  assert.match(stages, /engineStep: 'Deterministic repository verification'/);
  assert.doesNotMatch(stages, /8: `Feature Journey stage 8: run the integration-appropriate Spec-Kit converge/);
});
