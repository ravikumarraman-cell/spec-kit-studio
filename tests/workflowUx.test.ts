import assert from 'node:assert/strict';
import test from 'node:test';
import { canStartFeatureIntake, needsLegacyJourneyRepair, userFacingActionError } from '../src/lib/workflowUx';

test('feature intake remains unavailable until repository connection is complete', () => {
  assert.equal(canStartFeatureIntake(1), false);
  assert.equal(canStartFeatureIntake(2), true);
});

test('legacy Journey repair appears only when the missing evidence belongs to a completed later stage', () => {
  assert.equal(needsLegacyJourneyRepair({ stageId: 3, hasImpactMap: false, hasArchitecturePlan: false, hasDeliveryPlan: false }), false);
  assert.equal(needsLegacyJourneyRepair({ stageId: 4, hasImpactMap: false, hasArchitecturePlan: false, hasDeliveryPlan: false }), true);
  assert.equal(needsLegacyJourneyRepair({ stageId: 5, hasImpactMap: true, hasArchitecturePlan: false, hasDeliveryPlan: false }), true);
  assert.equal(needsLegacyJourneyRepair({ stageId: 8, hasImpactMap: true, hasArchitecturePlan: true, hasDeliveryPlan: true }), false);
});

test('action failures always yield a visible recovery message', () => {
  assert.equal(userFacingActionError('run the audit', new Error('Connector unavailable'), 'fallback'), 'Couldn’t run the audit: Connector unavailable');
  assert.equal(userFacingActionError('package this workspace', undefined, 'Couldn’t package this workspace. Try again.'), 'Couldn’t package this workspace. Try again.');
});
