import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceViewWarmupTargets } from '../src/lib/workspaceViewPreload';

test('workspace warmup follows only the immediate delivery path', () => {
  assert.deepEqual(workspaceViewWarmupTargets('overview'), ['journey', 'workspace']);
  assert.deepEqual(workspaceViewWarmupTargets('journey'), ['spec', 'plan', 'tasks', 'refinery']);
  assert.deepEqual(workspaceViewWarmupTargets('plan'), ['tasks', 'prompt']);
  assert.deepEqual(workspaceViewWarmupTargets('settings'), []);
});
