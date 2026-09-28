import assert from 'node:assert/strict';
import test from 'node:test';
import { createProjectFromFeatureExtraction } from '../src/lib/importProjectFactory';

test('feature extraction factory supplies a complete project when AI output is sparse', () => {
  const project = createProjectFromFeatureExtraction({}, 'Billing portal', '2026-01-01T00:00:00.000Z');

  assert.equal(project.name, 'Billing portal');
  assert.equal(project.spec.title, 'Billing portal');
  assert.equal(project.plan.techStack.length, 2);
  assert.equal(project.spec.userFlows.length, 3);
  assert.equal(project.featureInbox?.length, 1);
  assert.equal(project.featureInbox?.[0].title, 'Billing portal');
  assert.equal(project.createdAt, '2026-01-01T00:00:00.000Z');
});

test('separate feature imports at the same timestamp never overwrite one another', () => {
  const now = '2026-09-23T00:00:00.000Z';
  const first = createProjectFromFeatureExtraction({ title: 'First' }, 'First', now);
  const second = createProjectFromFeatureExtraction({ title: 'Second' }, 'Second', now);
  assert.notEqual(first.id, second.id);
});

test('feature extraction factory preserves valid artifacts and normalizes invalid task phases', () => {
  const project = createProjectFromFeatureExtraction({
    title: 'Access reviews',
    summary: 'Review privileged access quarterly.',
    tasks: [{ title: 'Create review endpoint', phase: 'not-a-phase', estimatedHours: 5 }],
    constitutionRules: [{ title: 'Tests required', category: 'Testing & QA', strictness: 'Mandatory' }],
  }, 'Fallback title', '2026-01-02T00:00:00.000Z');

  assert.equal(project.spec.summary, 'Review privileged access quarterly.');
  assert.equal(project.tasks.tasks[0].phase, 'Phase 1: Setup');
  assert.equal(project.tasks.tasks[0].estimatedHours, 5);
  assert.equal(project.constitution.rules[0].category, 'Testing & QA');
});

test('a separate imported feature inherits only its parent workspace connection evidence', () => {
  const project = createProjectFromFeatureExtraction(
    { title: 'Security assessment percentage bars' },
    'Fallback title',
    '2026-09-23T00:00:00.000Z',
    {
      importedRepo: {
        repoUrl: '/workspace/cloud-asset-inventory', repoName: 'cloud-asset-inventory', description: 'Scanned repository',
        primaryLanguage: 'TypeScript', detectedTechStack: [], architectureSummary: 'Known architecture', keyDirectories: ['frontend'],
        suggestedNewFeatures: [], importedAt: '2026-09-22T00:00:00.000Z',
      },
      repositoryIdentity: { canonicalRemote: 'github.com/example/cloud-asset-inventory', lastScannedBranch: 'develop', lastScannedAt: '2026-09-22T00:00:00.000Z' },
      stackProfile: { id: 'react', runtime: 'node', testCommands: ['npm test'], allowedSourceRoots: ['frontend/src'] },
    },
  );

  assert.equal(project.importedRepo?.repoUrl, '/workspace/cloud-asset-inventory');
  assert.equal(project.repositoryIdentity?.canonicalRemote, 'github.com/example/cloud-asset-inventory');
  assert.deepEqual(project.stackProfile?.testCommands, ['npm test']);
  assert.equal(project.featureInbox?.[0].title, 'Security assessment percentage bars');
});
