import assert from 'node:assert/strict';
import test from 'node:test';
import { relatedFeatureWorkspaces } from '../src/lib/featureWorkspaceRecovery';
import { createProjectWorkspace } from '../src/lib/projectFactory';

test('surfaces a feature retained in another workspace for the same repository without moving it', () => {
  const current = createProjectWorkspace('Current', 'Current workspace');
  current.id = 'current';
  current.importedRepo = { repoUrl: '/repos/cloud', repoName: 'cloud', description: '', primaryLanguage: '', detectedTechStack: [], architectureSummary: '', keyDirectories: [], suggestedNewFeatures: [], importedAt: '' };
  current.repositoryIdentity = { canonicalRemote: 'https://github.com/example/cloud', lastScannedAt: '' };
  const retained = createProjectWorkspace('Retained feature', 'Separate workspace');
  retained.id = 'retained';
  retained.importedRepo = { ...current.importedRepo };
  retained.repositoryIdentity = { ...current.repositoryIdentity };
  retained.featureInbox = [{ id: 'feature-1', title: 'Retained feature', summary: '', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [] }];
  const unrelated = createProjectWorkspace('Other', 'Other repository');
  unrelated.id = 'unrelated';
  unrelated.repositoryIdentity = { canonicalRemote: 'https://github.com/example/other', lastScannedAt: '' };

  assert.deepEqual(relatedFeatureWorkspaces(current, [current, retained, unrelated]).map((workspace) => workspace.id), [retained.id]);
  assert.equal(retained.featureInbox?.[0].title, 'Retained feature');
});

test('still surfaces retained feature workspaces before the current workspace has repository identity', () => {
  const current = createProjectWorkspace('Current', 'Current workspace');
  current.id = 'current';
  const retained = createProjectWorkspace('Retained feature', 'Separate workspace');
  retained.id = 'retained';
  retained.featureInbox = [{ id: 'feature-1', title: 'Retained feature', summary: '', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [] }];
  assert.deepEqual(relatedFeatureWorkspaces(current, [current, retained]).map((workspace) => workspace.id), ['retained']);
});
