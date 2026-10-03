import assert from 'node:assert/strict';
import test from 'node:test';
import { featureImplementationBlocker, featureImplementationWorkspace } from '../src/lib/featureWorktree';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { createFeatureInboxItem } from '../src/lib/featureInbox';

test('implementation never falls back to the shared repository checkout', () => {
  const project = createProjectWorkspace('Tenant Details', 'Feature workspace', '2026-09-23T00:00:00.000Z');
  project.importedRepo = { repoUrl: '/repo/main', repoName: 'main', description: 'Connected', primaryLanguage: 'TypeScript', detectedTechStack: [], architectureSummary: 'Known', keyDirectories: [], suggestedNewFeatures: [], importedAt: '2026-09-23T00:00:00.000Z' };
  const feature = createFeatureInboxItem({ title: 'Tenant Details', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, '2026-09-23T00:00:00.000Z');
  project.featureInbox = [feature];

  assert.equal(featureImplementationWorkspace(feature), null);
  assert.match(featureImplementationBlocker(project, feature) || '', /isolated Git worktree/);

  feature.worktreePath = '/repo/feature-tenant-details';
  assert.equal(featureImplementationWorkspace(feature), '/repo/feature-tenant-details');
  assert.equal(featureImplementationBlocker(project, feature), null);
});
