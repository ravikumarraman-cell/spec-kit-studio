import assert from 'node:assert/strict';
import test from 'node:test';
import { decisionsComplete, featureTaskDecisionGate, formatApprovedDecisions } from '../src/lib/featureTaskDecisions';
import { actionableFeatureDeliveryTasks, featureDeliveryCompletionSource, featureDeliveryTaskProgress, FeatureDeliveryTask, nextActionableFeatureDeliveryTask } from '../src/lib/featureDeliveryTasks';

test('requires explicit complete approval for T002', () => {
  const gate = featureTaskDecisionGate('T002');
  assert.equal(gate?.fields.length, 5);
  assert.equal(decisionsComplete(gate, {}, false), false);

  const answers = Object.fromEntries(gate!.fields.map((field) => [field.id, field.options[0].value]));
  assert.equal(decisionsComplete(gate, answers, false), false);
  assert.equal(decisionsComplete(gate, answers, true), true);
  assert.match(formatApprovedDecisions(gate, answers), /Open follow-up grouping/);
});

test('does not gate ordinary implementation tasks', () => {
  assert.equal(featureTaskDecisionGate('T001'), undefined);
  assert.equal(decisionsComplete(undefined, {}, false), true);
});

test('resumes at the next unfinished and unreviewed feature task', () => {
  const tasks: FeatureDeliveryTask[] = [
    { id: 'T001', requirementIds: [], title: 'Done in artifact', done: true },
    { id: 'T002', requirementIds: [], title: 'Recorded evidence', done: false },
    { id: 'T003', requirementIds: [], title: 'Next task', done: false },
  ];
  assert.deepEqual(actionableFeatureDeliveryTasks(tasks, ['T002']).map((task) => task.id), ['T003']);
  assert.equal(nextActionableFeatureDeliveryTask(tasks, [], 'T002')?.id, 'T003');
});

test('does not advance a feature receipt into a shared-board task', () => {
  const featureTasks: FeatureDeliveryTask[] = [
    { id: 'T001', requirementIds: [], title: 'Feature task one', done: false },
    { id: 'T002', requirementIds: [], title: 'Feature task two', done: false },
  ];
  assert.equal(nextActionableFeatureDeliveryTask(featureTasks, [], 'T001')?.id, 'T002');
  assert.equal(nextActionableFeatureDeliveryTask(featureTasks, ['T001'], 'T002'), undefined);
});

test('keeps tasks.md completion separate from Studio-reviewed receipts', () => {
  const tasks: FeatureDeliveryTask[] = [
    { id: 'T001', requirementIds: [], title: 'Completed in imported plan', done: true },
    { id: 'T002', requirementIds: [], title: 'Has Studio receipt', done: false },
    { id: 'T003', requirementIds: [], title: 'Ready now', done: false },
  ];

  assert.deepEqual(featureDeliveryTaskProgress(tasks, ['T002']), {
    readyTaskCount: 1,
    completedInPlanCount: 1,
    reviewedReceiptCount: 1,
  });
  assert.equal(featureDeliveryTaskProgress(tasks, ['NOT-A-FEATURE-TASK']).reviewedReceiptCount, 0);
  assert.equal(featureDeliveryCompletionSource(tasks[0]), 'tasks-md');
  assert.equal(featureDeliveryCompletionSource(tasks[1], ['T002']), 'reviewed-receipt');
  assert.equal(featureDeliveryCompletionSource(tasks[0], ['T001']), 'reviewed-receipt');
});
