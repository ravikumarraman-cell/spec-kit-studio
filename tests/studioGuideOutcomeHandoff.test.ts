import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { outcomeMismatchFromGuideReply } from '../src/lib/studioGuide.ts';

test('Kit Guide extracts the bounded Delivered outcome section from a visual review', () => {
  const mismatch = outcomeMismatchFromGuideReply('The screens differ. Delivered outcome: The current page omits the six infrastructure groups, uses generic cards, has insufficient contrast, and does not preserve the narrow layout.');
  assert.match(mismatch, /omits the six infrastructure groups/i);
  assert.doesNotMatch(mismatch, /^The screens differ/i);
});

test('Kit Guide exposes a one-click Outcome Refinery handoff and the Refinery consumes it', async () => {
  const [guide, refinery] = await Promise.all([
    readFile(new URL('../src/components/common/StudioGuide.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/refinery/OutcomeRefinery.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(guide, /Use in Outcome Refinery/);
  assert.match(guide, /sendMismatchToOutcomeRefinery/);
  assert.match(refinery, /consumeOutcomeRefineryMismatch/);
  assert.match(refinery, /refreshed the local repair proposal/);
});

test('the full repair cycle reuses a local feature reference and always exposes a state-specific next action', async () => {
  const [guide, refinery, helper] = await Promise.all([
    readFile(new URL('../src/components/common/StudioGuide.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/refinery/OutcomeRefinery.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/studioGuide.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(guide, /Use feature’s retained reference/);
  assert.match(guide, /prepareRetainedStudioGuideImage/);
  assert.match(helper, /never fetches a remote image/i);
  assert.match(refinery, /Your next action/);
  assert.match(refinery, /Start bounded repair/);
  assert.match(refinery, /View live repair status/);
  assert.match(refinery, /Review final handoff/);
  assert.match(refinery, /Prepare another iteration/);
});

test('preparing another iteration gives immediate feedback, moves focus to the next action, and keeps long contracts optional', async () => {
  const refinery = await readFile(new URL('../src/components/refinery/OutcomeRefinery.tsx', import.meta.url), 'utf8');
  assert.match(refinery, /New iteration ready\. Your feature scope, reference, and mismatch were retained/);
  assert.match(refinery, /repairCycleRef\.current\?\.focus/);
  assert.match(refinery, /role="status"/);
  assert.match(refinery, /Review the binding contract/);
  assert.match(refinery, /Optional detail before repair/);
  assert.doesNotMatch(refinery, /<pre data-outcome-contract/);
});
