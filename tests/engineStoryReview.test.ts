import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('completed Engine runs load the official spec artifact and expose review failures beside the action', async () => {
  const modal = await readFile(new URL('../src/components/import/FeatureImportModal.tsx', import.meta.url), 'utf8');
  const panel = await readFile(new URL('../src/components/import/EngineWorkPacketPanel.tsx', import.meta.url), 'utf8');
  assert.match(modal, /candidate\.kind === 'spec'/);
  assert.match(modal, /\^specs\\\/\[\^\/\]\+\\\/spec\\\.md/);
  assert.match(modal, /setEngineStoryReviewError/);
  assert.match(panel, /Opening generated stories/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /Previous run cannot be reviewed safely/);
  assert.match(panel, /hasIsolatedSpecReceipt/);
  assert.match(panel, /Load existing official specification/);
  assert.match(panel, /Next required action · step 3 of 3/);
  assert.match(panel, /No agent rerun is needed/);
  assert.match(panel, /reviewReady \? \(/);
  assert.match(panel, /View agent output/);
  assert.match(modal, /agentJob && !agentJob\.ok && !extractedResult/);
  assert.match(modal, /setAgentJob\(null\)/);
});
