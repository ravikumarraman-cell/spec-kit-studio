import assert from 'node:assert/strict';
import test from 'node:test';
import { currentFeatureDeliveryArtifact, deliveryPlanRepositoryPath, needsFeatureDeliveryReconciliation } from '../src/lib/featureDeliveryReconciliation';
import { FeatureInboxItem } from '../src/types/speckit';

const feature: FeatureInboxItem = {
  id: 'feature-1', featureKey: 'FEAT-1', slug: 'tenant-details', title: 'Tenant details', summary: 'Improve tenant details.', source: 'text', importedAt: '2026-09-23T00:00:00.000Z', userStoryIds: [], requirementIds: [], taskIds: [],
  deliveryPlan: { path: 'specs/tenant-details/tasks.md', content: '- [ ] T001 First task', acceptedAt: '2026-09-23T00:00:00.000Z' },
};

test('reconciles a changed current tasks.md even after Stage 5 was accepted', () => {
  const artifact = currentFeatureDeliveryArtifact(feature, [{
    path: 'specs/tenant-details/tasks.md', kind: 'tasks', modifiedAt: '2026-09-23T01:00:00.000Z', content: '- [x] T001 First task\n- [x] T002 Second task',
  }]);
  assert.equal(artifact?.content, '- [x] T001 First task\n- [x] T002 Second task');
  assert.equal(needsFeatureDeliveryReconciliation(feature, artifact), true);
});

test('does not replace an established feature path with a similarly named artifact', () => {
  const artifact = currentFeatureDeliveryArtifact(feature, [
    { path: 'specs/tenant-details/tasks.md', kind: 'tasks', modifiedAt: '2026-09-23T01:00:00.000Z', content: '- [ ] T001 First task' },
    { path: 'specs/tenant-details-copy/tasks.md', kind: 'tasks', modifiedAt: '2026-09-23T02:00:00.000Z', content: '- [ ] T001 Copy task' },
  ]);
  assert.equal(artifact?.path, 'specs/tenant-details/tasks.md');
  assert.equal(needsFeatureDeliveryReconciliation(feature, artifact), false);
});

test('uses the newest valid artifact only before a feature has an established path', () => {
  const unlinked = { ...feature, deliveryPlan: undefined };
  const artifact = currentFeatureDeliveryArtifact(unlinked, [
    { path: 'specs/tenant-details/tasks.md', kind: 'tasks', modifiedAt: '2026-09-23T01:00:00.000Z', content: '- [ ] T001 First task' },
    { path: 'specs/tenant-details-next/tasks.md', kind: 'tasks', modifiedAt: '2026-09-23T02:00:00.000Z', content: '- [ ] T002 Second task' },
  ]);
  assert.equal(artifact?.path, 'specs/tenant-details-next/tasks.md');
});

test('keeps the registered worktree snapshot authoritative over a divergent main checkout', () => {
  const worktreeArtifact = { path: 'specs/tenant-details/tasks.md', kind: 'tasks', modifiedAt: '2026-09-23T03:00:00.000Z', content: '- [x] T001 First task\n- [x] T002 Second task' };
  const mainCheckoutArtifact = { path: 'specs/tenant-details/tasks.md', kind: 'tasks', modifiedAt: '2026-09-23T04:00:00.000Z', content: '- [ ] T001 First task\n- [ ] T002 Second task' };
  assert.equal(currentFeatureDeliveryArtifact(feature, [worktreeArtifact])?.content, worktreeArtifact.content);
  assert.notEqual(currentFeatureDeliveryArtifact(feature, [worktreeArtifact])?.content, mainCheckoutArtifact.content);
});

test('keeps an accepted plan bound to the repository copy that produced it', () => {
  const acceptedFromMain = { ...feature, worktreePath: '/repos/feature-worktree', deliveryPlan: { ...feature.deliveryPlan!, repositoryPath: '/repos/main' } };
  assert.equal(deliveryPlanRepositoryPath(acceptedFromMain, '/repos/main'), '/repos/main');
  assert.equal(deliveryPlanRepositoryPath({ ...feature, worktreePath: '/repos/feature-worktree' }, '/repos/main'), '/repos/feature-worktree');
});
