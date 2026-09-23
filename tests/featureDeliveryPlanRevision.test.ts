import assert from 'node:assert/strict';
import test from 'node:test';
import { reconcileDeliveryPlanReceipts } from '../src/lib/featureDeliveryPlanRevision';

const receipt = (taskId: string) => ({ taskId, jobId: `job-${taskId}`, recordedAt: '2026-09-23T00:00:00.000Z', changedFiles: [], diffStat: '', verificationSummary: 'verified' });

test('archives a receipt when a replacement plan reuses its task ID for different work', () => {
  const result = reconcileDeliveryPlanReceipts(
    '- [ ] T001 [FR-001] Implement percentage bars',
    '- [ ] T001 [FR-001] Confirm the approved feature scope\n- [ ] T002 [FR-001] Implement percentage bars\n- [ ] T003 [FR-001] Verify focused coverage',
    [receipt('T001')],
  );
  assert.deepEqual(result.active, []);
  assert.deepEqual(result.superseded.map((item) => item.taskId), ['T001']);
});

test('keeps a receipt when an unchanged task survives a plan revision', () => {
  const result = reconcileDeliveryPlanReceipts(
    '- [ ] T001 [FR-001] Confirm the approved feature scope\n- [ ] T002 [FR-001] Implement percentage bars',
    '- [ ] T001 [FR-001] Confirm the approved feature scope\n- [ ] T002 [FR-001] Implement percentage bars\n- [ ] T003 [FR-001] Verify focused coverage',
    [receipt('T001'), receipt('T002')],
  );
  assert.deepEqual(result.active.map((item) => item.taskId), ['T001', 'T002']);
  assert.deepEqual(result.superseded, []);
});

test('does not discard receipts when only checklist state changes', () => {
  const result = reconcileDeliveryPlanReceipts(
    '- [ ] T001 [FR-001] Confirm the approved feature scope',
    '- [x] T001 [FR-001] Confirm the approved feature scope',
    [receipt('T001')],
  );
  assert.deepEqual(result.active.map((item) => item.taskId), ['T001']);
});
