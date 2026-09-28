import assert from 'node:assert/strict';
import test from 'node:test';
import { currentFeatureArchitectureArtifact, needsFeatureArchitectureReconciliation } from '../src/lib/featureArchitectureReconciliation';
import { FeatureInboxItem } from '../src/types/speckit';

const feature: FeatureInboxItem = {
  id: 'feature-1', slug: 'tenant-details', title: 'Tenant details', summary: 'Improve tenant details.', source: 'text', importedAt: '', userStoryIds: [], requirementIds: ['FR-1'], taskIds: [],
  architecturePlan: { path: 'specs/001-tenant-details/plan.md', content: '# Tenant details\n\n## Plan', acceptedAt: '2026-09-23' },
};

test('keeps the saved feature plan path when it is still present in the authoritative scan', () => {
  const selected = currentFeatureArchitectureArtifact(feature, [
    { path: 'specs/001-tenant-details/plan.md', kind: 'plan', content: '# Tenant details\n\n## Plan', modifiedAt: '2026-09-20' },
    { path: 'specs/002-other/plan.md', kind: 'plan', content: '# Other\n\n## Plan', modifiedAt: '2026-09-23' },
  ]);
  assert.equal(selected?.path, feature.architecturePlan?.path);
  assert.equal(needsFeatureArchitectureReconciliation(feature, selected), false);
});

test('reconciles an updated official feature plan instead of retaining a stale cache', () => {
  const updated = { path: 'specs/001-tenant-details/plan.md', kind: 'plan' as const, content: '# Tenant details\n\n## Updated plan', modifiedAt: '2026-09-23' };
  const selected = currentFeatureArchitectureArtifact(feature, [updated]);
  assert.equal(selected?.content, updated.content);
  assert.equal(needsFeatureArchitectureReconciliation(feature, selected), true);
});
