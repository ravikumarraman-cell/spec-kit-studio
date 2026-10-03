import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectWorkspace } from '../src/lib/projectFactory';
import { createWorkspaceFiles } from '../src/lib/workspaceFiles';
import { createFeaturePackageFiles, generateEngineFeaturePackageZip, generateFeaturePackageZip, generateSpecKitZip, githubSpecKitExportIssues } from '../src/lib/export';
import { createFeatureInboxItem, createStoryInboxItem } from '../src/lib/featureInbox';
import { requireArray, requireObjectField, requireString, requireSuccessEnvelope } from '../src/lib/api/guards';

test('workspace artifact export stays confined to Studio paths', () => {
  const files = createWorkspaceFiles(createProjectWorkspace('Example', 'Example project'));
  assert.ok(files.length > 0);
  assert.ok(files.every((file) => file.path.startsWith('.specify/studio/')));
  assert.ok(files.some((file) => file.path.endsWith('spec.md')));
});

test('feature package is isolated beneath its generated feature namespace', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const feature = createFeatureInboxItem({ title: 'Safe CSV export', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, '2026-09-21T00:00:00.000Z');
  const files = createFeaturePackageFiles(project, feature);
  assert.ok(files.length >= 6);
  assert.ok(files.every((file) => file.path.startsWith(`specs/${feature.slug}/`)));
  assert.ok(files.some((file) => file.path.endsWith('/manifest.json')));
  const manifest = JSON.parse(files.find((file) => file.path.endsWith('/manifest.json'))!.content);
  assert.equal(manifest.schemaVersion, 1);
});

test('story package uses schema v2 and excludes sibling stories', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const story = { id: 'US-101', title: 'Export CSV', priority: 'High' as const, asA: 'Analyst', iWantTo: 'export inventory', soThat: 'I can review it offline', acceptanceCriteria: ['CSV downloads.'], requirementIds: ['FR-101'] };
  const sibling = { id: 'US-999', title: 'Delete tenant', priority: 'Low' as const, asA: 'Admin', iWantTo: 'delete tenant', soThat: 'data is removed', acceptanceCriteria: ['Tenant is deleted.'] };
  const requirement = { id: 'FR-101', title: 'Export CSV', description: 'Generate CSV.', category: 'Core' as const, priority: 'High' as const };
  project.spec.userStories = [story, sibling]; project.spec.functionalRequirements = [requirement];
  const item = createStoryInboxItem(story, [requirement], 'repository', 0, undefined, '2026-09-24T00:00:00.000Z');
  const files = createFeaturePackageFiles(project, item);
  const manifest = JSON.parse(files.find((file) => file.path.endsWith('/manifest.json'))!.content);
  const spec = files.find((file) => file.path.endsWith('/spec.md'))!.content;
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.scope, 'user-story');
  assert.equal(manifest.primaryStoryId, 'US-101');
  assert.match(spec, /Export CSV/);
  assert.doesNotMatch(spec, /Delete tenant/);
  assert.match(spec, /^# Feature Specification:/);
  assert.match(spec, /^## User Scenarios & Testing/m);
  assert.match(spec, /^## Success Criteria/m);
  assert.ok(files.filter((file) => file.path.startsWith(`specs/${item.slug}/`)).every((file) => ['spec.md', 'plan.md', 'tasks.md'].includes(file.path.split('/').at(-1)!)));
});

test('story ZIP preserves canonical repository-relative Spec-Kit paths', async () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const story = { id: 'US-101', title: 'Export CSV', priority: 'High' as const, asA: 'Analyst', iWantTo: 'export inventory', soThat: 'I can review it offline', acceptanceCriteria: ['CSV downloads.'] };
  project.spec.userStories = [story];
  const item = createStoryInboxItem(story, [], 'text', 0, undefined, '2026-09-24T00:00:00.000Z');
  item.pullRequest = { provider: 'github', url: 'https://github.example.test/org/repo/pull/42', number: 42, title: 'Export CSV safely', baseBranch: 'main', headBranch: 'feature/export-csv', createdAt: '2026-09-24T02:00:00.000Z', state: 'open' };
  const archive = await (await generateFeaturePackageZip(project, item)).arrayBuffer();
  const zip = await import('jszip').then(({ default: JSZip }) => JSZip.loadAsync(archive));
  assert.ok(zip.file(`specs/${item.slug}/spec.md`));
  assert.equal(zip.file(`${item.slug}/specs/${item.slug}/spec.md`), null);
  assert.ok(zip.file(`.specify/studio/delivery/${item.slug}/manifest.json`));
  assert.ok(zip.file(`.specify/studio/delivery/${item.slug}/implementation-receipts.json`));
  const pullRequest = zip.file(`.specify/studio/delivery/${item.slug}/pull-request.json`);
  assert.ok(pullRequest);
  assert.match(await pullRequest!.async('string'), /https:\/\/github\.example\.test\/org\/repo\/pull\/42/);
  assert.ok(zip.file(`.specify/studio/delivery/${item.slug}/ci-pr-template.md`));
});

test('GitHub Spec Kit export fails closed and archives only validated engine artifacts', async () => {
  const project = createProjectWorkspace('Example', 'Example project');
  const feature = createFeatureInboxItem({ title: 'Safe CSV export', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, '2026-09-21T00:00:00.000Z');
  project.featureInbox = [feature];
  assert.ok(githubSpecKitExportIssues(project).length > 0);
  const root = `specs/${feature.slug}`;
  const acceptedAt = '2026-09-21T01:00:00.000Z';
  feature.specification = { path: `${root}/spec.md`, content: '# Feature Specification: Safe CSV export\n## User Scenarios & Testing\n### User Story 1 - Export safely (Priority: P1)\n## Requirements\n### Functional Requirements\n- **FR-001**: System MUST export CSV safely.\n## Success Criteria\n### Measurable Outcomes\n- **SC-001**: CSV exports successfully.', acceptedAt };
  feature.architecturePlan = { path: `${root}/plan.md`, content: '# Implementation Plan: Safe CSV export\n## Summary\nExport CSV safely.\n## Technical Context\nExisting export boundary.\n## Constitution Check\nPreserve data access rules.\n## Project Structure\n- src/export.ts', acceptedAt };
  feature.deliveryPlan = { path: `${root}/tasks.md`, content: '# Tasks: Safe CSV export\n## Phase 1: Setup\n- [ ] T001 Prepare export in src/export.ts\n## Dependencies & Execution Order\n## Implementation Strategy', acceptedAt };
  assert.deepEqual(githubSpecKitExportIssues(project), []);
  const archive = await (await generateSpecKitZip(project)).arrayBuffer();
  const zip = await import('jszip').then(({ default: JSZip }) => JSZip.loadAsync(archive));
  assert.ok(zip.file(`${project.name.toLowerCase()}/specs/${feature.slug}/spec.md`));
  assert.ok(zip.file(`${project.name.toLowerCase()}/.specify/memory/constitution.md`));
  const featurePointer = zip.file(`${project.name.toLowerCase()}/.specify/feature.json`);
  assert.ok(featurePointer);
  assert.deepEqual(JSON.parse(await featurePointer!.async('string')), { feature_directory: `specs/${feature.slug}` });
  assert.equal(zip.file(`${project.name.toLowerCase()}/specify.sh`), null);

  const featureArchive = await (await generateEngineFeaturePackageZip(project, feature)).arrayBuffer();
  const featureZip = await import('jszip').then(({ default: JSZip }) => JSZip.loadAsync(featureArchive));
  assert.ok(featureZip.file(`specs/${feature.slug}/spec.md`));
  assert.ok(featureZip.file(`specs/${feature.slug}/plan.md`));
  assert.ok(featureZip.file(`specs/${feature.slug}/tasks.md`));
  assert.ok(featureZip.file('.specify/memory/constitution.md'));
  assert.deepEqual(JSON.parse(await featureZip.file('.specify/feature.json')!.async('string')), { feature_directory: `specs/${feature.slug}` });
  assert.equal(featureZip.file('.specify/studio/export-manifest.json'), null);
});

test('workspace apply candidates include feature packages only in feature namespaces', () => {
  const project = createProjectWorkspace('Example', 'Example project');
  project.featureInbox = [createFeatureInboxItem({ title: 'Safe CSV export', userStories: [], functionalRequirements: [], tasks: [] }, 'text', 0, '2026-09-21T00:00:00.000Z')];
  const files = createWorkspaceFiles(project);
  assert.ok(files.some((file) => file.path === `specs/${project.featureInbox![0].slug}/manifest.json`));
});

test('API envelope guard rejects failed or malformed server data', () => {
  assert.throws(() => requireSuccessEnvelope({ success: false, error: 'nope' }), /nope/);
  assert.throws(() => requireSuccessEnvelope([]), /expected an object/);
  assert.equal(requireSuccessEnvelope({ success: true }).success, true);
});

test('API contract guards reject malformed required response fields', () => {
  assert.throws(() => requireString(42, 'message'), /message/);
  assert.throws(() => requireArray({}, 'repos'), /repos/);
  assert.throws(() => requireObjectField({ success: true }, 'data'), /data/);
  assert.deepEqual(requireArray(['one'], 'repos'), ['one']);
});
