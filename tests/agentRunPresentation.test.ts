import assert from 'node:assert/strict';
import test from 'node:test';
import { changedFilesFromJobEvidence, mergeDiscoveredAgentFrameworks, verificationFindings } from '../src/lib/agentRunPresentation';

test('merges connector-declared agents without duplicating built-in adapters', () => {
  const options = mergeDiscoveredAgentFrameworks([{ id: 'codex', label: 'Codex', installed: true }, { id: 'local-reviewer', label: 'Local reviewer', installed: true }]);

  assert.equal(options.filter((option) => option.localAgent === 'codex').length, 1);
  assert.ok(options.some((option) => option.localAgent === 'local-reviewer'));
});

test('recovers untracked changed files from a legacy connector receipt', () => {
  const files = changedFilesFromJobEvidence({ id: 'job', label: '', command: '', status: 'succeeded', output: '', startedAt: '', finishedAt: '', ok: true, evidence: { changedFiles: [], repositoryStatus: '?? src/new-file.ts\n M src/old-file.ts', diffStat: '' } });

  assert.deepEqual(files, ['src/new-file.ts', 'src/old-file.ts']);
});

test('extracts actionable verification findings without exposing the whole plan', () => {
  const findings = verificationFindings('# Plan\n\n## Verification evidence\n- Focused test failed because expected output differs\n- All good\n\n## Next');

  assert.deepEqual(findings, ['Focused test failed because expected output differs']);
});
