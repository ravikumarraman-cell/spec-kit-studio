import assert from 'node:assert/strict';
import test from 'node:test';
import { decisionsComplete, featureTaskDecisionGate, formatApprovedDecisions } from '../src/lib/featureTaskDecisions';
import { actionableFeatureDeliveryTasks, FeatureDeliveryTask } from '../src/lib/featureDeliveryTasks';

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
});
