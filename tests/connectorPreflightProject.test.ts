import assert from 'node:assert/strict';
import test from 'node:test';
import { connectorPreflightProject } from '../src/lib/connector';

test('connector execution context sends feature identity, never retained artifacts or agent output', () => {
  const project = {
    repositoryIdentity: { canonicalRemote: 'https://github.com/example/repo' },
    featureInbox: [{
      id: 'feat-1',
      featureKey: 'US-101',
      slug: '101-copy-id',
      branch: '101-copy-id',
      worktreePath: '/tmp/worktree',
      scope: 'user-story',
      impactMap: { content: 'x'.repeat(2_000_000) },
      architecturePlan: { content: 'y'.repeat(2_000_000) },
      deliveryPlan: { content: 'z'.repeat(2_000_000) },
      implementationReceipts: [{ output: 'q'.repeat(2_000_000) }],
    }],
  } as any;
  const context = connectorPreflightProject(project, 'feat-1');
  assert.deepEqual(context, { repositoryIdentity: { canonicalRemote: 'https://github.com/example/repo' }, featureInbox: [{ id: 'feat-1', featureKey: 'US-101', slug: '101-copy-id', branch: '101-copy-id', worktreePath: '/tmp/worktree', scope: 'user-story' }] });
  assert.ok(JSON.stringify(context).length < 1_000);
});
