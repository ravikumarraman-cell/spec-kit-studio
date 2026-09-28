import assert from 'node:assert/strict';
import test from 'node:test';
import { createFeatureInboxItem } from '../src/lib/featureInbox';
import { featureArtifactRoot, normalizeGitRemote, officialFeatureIdentity } from '../src/lib/projectIdentity';

test('feature identity is stable, readable, and owns a unique artifact folder', () => {
  const feature = createFeatureInboxItem({ title: 'Export inventory CSV', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 2, '2026-09-21T00:00:00.000Z');
  assert.equal(feature.featureKey, 'FEAT-2026-3');
  assert.equal(feature.slug, '003-export-inventory-csv');
  assert.equal(featureArtifactRoot(feature), 'specs/003-export-inventory-csv');
});

test('migrates legacy Studio slugs to their official numbered Spec-Kit identity', () => {
  const identity = officialFeatureIdentity({ id: 'legacy', title: 'Export inventory CSV', featureKey: 'FEAT-2026-3', slug: 'feat-2026-3-export-inventory-csv', summary: '', source: 'text', importedAt: '2026-09-21T00:00:00.000Z', userStoryIds: [], requirementIds: [], taskIds: [] }, 2);
  assert.deepEqual(identity, { featureKey: 'FEAT-2026-3', slug: '003-export-inventory-csv' });
});

test('repository identity normalizes SSH and HTTPS remotes to the same value', () => {
  assert.equal(normalizeGitRemote('git@github.com:Acme/Inventory.git'), normalizeGitRemote('https://github.com/acme/inventory'));
});
