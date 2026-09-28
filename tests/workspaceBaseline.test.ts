import assert from 'node:assert/strict';
import test from 'node:test';
import { baselineStillMatches } from '../src/lib/workspaceBaseline.ts';
import type { TruthReport } from '../src/lib/connector.ts';
import type { WorkspaceBaselineEvidence } from '../src/types/speckit.ts';

const scan: TruthReport = {
  repositoryPath: '/repo', repositoryName: 'repo', scannedAt: '2026-09-27T00:00:00.000Z', files: [], filesTruncated: false, manifests: [], technologies: [], packageScripts: {}, baselineCommands: [], dependencyReadiness: [], agents: [],
  git: { available: true, branch: 'main', head: 'abc123', status: '## main', remotes: '' }, specKit: { detected: true, featureFile: true, artifactFiles: [], hasWorkflowSetup: true },
};
const baseline: WorkspaceBaselineEvidence = { repositoryPath: '/repo', branch: 'main', commit: 'abc123', recordedAt: '2026-09-27T00:00:00.000Z', results: [{ label: 'test', ok: true, output: 'passed' }] };

test('reuses a successful baseline for the same clean revision', () => assert.equal(baselineStillMatches(scan, baseline), true));
test('does not reuse a baseline after a commit, branch, or working-tree change', () => {
  assert.equal(baselineStillMatches({ ...scan, git: { ...scan.git, head: 'next' } }, baseline), false);
  assert.equal(baselineStillMatches({ ...scan, git: { ...scan.git, branch: 'feature' } }, baseline), false);
  assert.equal(baselineStillMatches({ ...scan, git: { ...scan.git, status: '## main\n M src/App.tsx' } }, baseline), false);
});
