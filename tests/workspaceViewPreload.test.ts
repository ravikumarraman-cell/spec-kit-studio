import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldWarmWorkspaceViews, workspaceViewWarmupTargets } from '../src/lib/workspaceViewPreload';

test('workspace warmup follows only the immediate delivery path', () => {
  assert.deepEqual(workspaceViewWarmupTargets('overview'), []);
  assert.deepEqual(workspaceViewWarmupTargets('journey'), ['spec', 'plan', 'tasks', 'refinery']);
  assert.deepEqual(workspaceViewWarmupTargets('plan'), ['tasks', 'prompt']);
  assert.deepEqual(workspaceViewWarmupTargets('settings'), []);
});

test('skips speculative view downloads for metered and slow connections', () => {
  assert.equal(shouldWarmWorkspaceViews(undefined), true);
  assert.equal(shouldWarmWorkspaceViews({ effectiveType: '4g' }), true);
  assert.equal(shouldWarmWorkspaceViews({ saveData: true }), false);
  assert.equal(shouldWarmWorkspaceViews({ effectiveType: '2g' }), false);
});
