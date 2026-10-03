import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { reconcileExecutionActivity, RepositoryExecutionBusyError, startRepositoryExecution } from '../src/lib/repositoryExecution.ts';
import type { ConnectorJob } from '../src/lib/connector.ts';

const runningJob: ConnectorJob = {
  id: 'job-existing', label: 'Existing local agent', command: 'codex <agent arguments redacted>', status: 'running', output: '', startedAt: '2026-01-01T00:00:00.000Z', finishedAt: null, ok: null,
};

test('execution gateway exposes an existing job and never calls the new starter', async () => {
  let started = false;
  await assert.rejects(
    () => startRepositoryExecution({ activeJob: async () => runningJob }, '/linked/worktree', async () => { started = true; return runningJob; }),
    (error: unknown) => error instanceof RepositoryExecutionBusyError && error.job.id === runningJob.id,
  );
  assert.equal(started, false);
});

test('execution gateway rehydrates the competing job after a launch race', async () => {
  let checks = 0;
  await assert.rejects(
    () => startRepositoryExecution({ activeJob: async () => (++checks === 1 ? null : runningJob) }, '/linked/worktree', async () => { throw new Error('Another Studio job is already running for this repository.'); }),
    RepositoryExecutionBusyError,
  );
  assert.equal(checks, 2);
});

test('execution gateway starts work when the repository is available', async () => {
  const created = { ...runningJob, id: 'job-new' };
  const result = await startRepositoryExecution({ activeJob: async () => null }, '/linked/worktree', async () => created);
  assert.equal(result.id, 'job-new');
});

test('execution activity never presents a durable running record as a live job without connector evidence', () => {
  assert.equal(reconcileExecutionActivity({ durableStatus: 'running' }), 'interrupted');
  assert.equal(reconcileExecutionActivity({ durableStatus: 'running', job: runningJob }), 'active');
  assert.equal(reconcileExecutionActivity({ durableStatus: 'ready-to-run' }), 'inactive');
});

test('every repository job-starting screen uses the shared execution gateway', async () => {
  const screens = [
    '../src/components/process/ProcessStudio.tsx',
    '../src/components/prompt/PromptStudio.tsx',
    '../src/components/import/FeatureImportModal.tsx',
    '../src/components/journey/FeatureJourney.tsx',
    '../src/components/workspace/WorkspaceControlCenter.tsx',
    '../src/components/refinery/OutcomeRefinery.tsx',
  ];
  for (const screen of screens) {
    const source = await readFile(new URL(screen, import.meta.url), 'utf8');
    assert.match(source, /startRepositoryExecution/);
  }
});

test('a completed local-agent run guides the user to retained review instead of inviting an accidental rerun', async () => {
  const source = await readFile(new URL('../src/components/prompt/PromptStudio.tsx', import.meta.url), 'utf8');

  assert.match(source, /completedCodexRunNeedsReview/);
  assert.match(source, /reviewedImplementationRef\.current\?\.scrollIntoView/);
  assert.match(source, /Review completed work/);
  assert.match(source, /Record reviewed implementation/);
  assert.match(source, /Need to run this task again\?/);
});
