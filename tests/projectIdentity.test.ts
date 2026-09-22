import assert from 'node:assert/strict';
import test from 'node:test';
import { createFeatureInboxItem } from '../src/lib/featureInbox';
import { featureArtifactRoot, normalizeGitRemote } from '../src/lib/projectIdentity';

test('feature identity is stable, readable, and owns a unique artifact folder', () => {
  const feature = createFeatureInboxItem({ title: 'Export inventory CSV', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 2, '2026-09-21T00:00:00.000Z');
  assert.equal(feature.featureKey, 'FEAT-2026-3');
  assert.equal(feature.slug, 'feat-2026-3-export-inventory-csv');
  assert.equal(featureArtifactRoot(feature), 'specs/feat-2026-3-export-inventory-csv');
});

test('repository identity normalizes SSH and HTTPS remotes to the same value', () => {
  assert.equal(normalizeGitRemote('git@github.com:Acme/Inventory.git'), normalizeGitRemote('https://github.com/acme/inventory'));
});
