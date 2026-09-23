import assert from 'node:assert/strict';
import test from 'node:test';
import { recordFeatureImplementationReceipt } from '../src/lib/featureReceipts';
import { SpecKitProject } from '../src/types/speckit';
import { actionableFeatureDeliveryTasks, FeatureDeliveryTask, nextActionableFeatureDeliveryTask } from '../src/lib/featureDeliveryTasks';

function projectWithFeatures(): SpecKitProject {
  return {
    id: 'project', name: 'Workspace', description: '', createdAt: '', updatedAt: '', version: '1',
    spec: { id: 'spec', title: '', summary: '', userStories: [], functionalRequirements: [], nonFunctionalRequirements: [], userFlows: [], edgeCases: [], successMetrics: [], markdown: '', lastUpdated: '' },
    plan: { id: 'plan', techStack: [], architectureSummary: '', components: [], apiContracts: [], dataSchemas: [], adrs: [], mermaidDiagram: '', markdown: '', lastUpdated: '' },
    tasks: { id: 'tasks', tasks: [], markdown: '', lastUpdated: '' }, constitution: { id: 'constitution', title: '', markdown: '', rules: [], lastUpdated: '' },
    featureInbox: [
      { id: 'feature-a', title: 'A', summary: '', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [], implementationReceipts: [{ taskId: 'T002', jobId: 'job-2', recordedAt: '', changedFiles: [], diffStat: '', verificationSummary: '' }] },
      { id: 'feature-b', title: 'B', summary: '', source: 'text', importedAt: '', userStoryIds: [], requirementIds: [], taskIds: [] },
    ],
  };
}

test('records a receipt on the exact feature and preserves earlier receipts', () => {
  const updated = recordFeatureImplementationReceipt(projectWithFeatures(), 'feature-a', { taskId: 'T003', jobId: 'job-3', recordedAt: '', changedFiles: [], diffStat: '', verificationSummary: '' });
  assert.deepEqual(updated.featureInbox?.[0].implementationReceipts?.map((receipt) => receipt.taskId), ['T002', 'T003']);
  assert.equal(updated.featureInbox?.[1].implementationReceipts, undefined);
});

test('does not attach a receipt to another feature when the target is missing', () => {
  const project = projectWithFeatures();
  assert.equal(recordFeatureImplementationReceipt(project, 'missing-feature', { taskId: 'T003', jobId: 'job', recordedAt: '', changedFiles: [], diffStat: '', verificationSummary: '' }), project);
});

test('re-recording a task replaces only that task receipt without losing the queue history', () => {
  const project = projectWithFeatures();
  const updated = recordFeatureImplementationReceipt(project, 'feature-a', { taskId: 'T002', jobId: 'replacement-job', recordedAt: 'later', changedFiles: ['src/a.ts'], diffStat: '1 file', verificationSummary: 'passed' });
  assert.deepEqual(updated.featureInbox?.[0].implementationReceipts?.map((receipt) => receipt.taskId), ['T002']);
  assert.equal(updated.featureInbox?.[0].implementationReceipts?.[0].jobId, 'replacement-job');
  assert.equal(project.featureInbox?.[0].implementationReceipts?.[0].jobId, 'job-2');
});

test('a sequential feature queue advances T002 to T003 and has no fallback after the final receipt', () => {
  const tasks: FeatureDeliveryTask[] = [
    { id: 'T001', title: 'Already complete in tasks.md', requirementIds: [], done: true },
    { id: 'T002', title: 'Second task', requirementIds: [], done: false },
    { id: 'T003', title: 'Third task', requirementIds: [], done: false },
  ];
  const projectAfterT2 = recordFeatureImplementationReceipt(projectWithFeatures(), 'feature-a', { taskId: 'T002', jobId: 'job-2b', recordedAt: '', changedFiles: [], diffStat: '', verificationSummary: '' });
  const afterT2 = projectAfterT2.featureInbox?.[0].implementationReceipts?.map((receipt) => receipt.taskId) || [];
  assert.deepEqual(actionableFeatureDeliveryTasks(tasks, afterT2).map((task) => task.id), ['T003']);
  assert.equal(nextActionableFeatureDeliveryTask(tasks, afterT2, 'T003'), undefined);
});
