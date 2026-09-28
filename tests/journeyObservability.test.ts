import assert from 'node:assert/strict';
import test from 'node:test';
import { createFeatureJourney } from '../src/lib/featureJourney';
import { journeyObservabilitySummary, retainJourneyAttempt } from '../src/lib/journeyObservability';

test('journey observability retains terminal attempts once and calculates elapsed time', () => {
  const journey = createFeatureJourney('2026-09-27T10:00:00.000Z');
  const recorded = retainJourneyAttempt(journey, { id: 'agent:one', stageId: 5, operation: 'agent', outcome: 'failed', startedAt: '2026-09-27T10:00:00.000Z', finishedAt: '2026-09-27T10:01:30.000Z' });
  const repeated = retainJourneyAttempt(recorded, { id: 'agent:one', stageId: 5, operation: 'agent', outcome: 'failed', startedAt: '2026-09-27T10:00:00.000Z', finishedAt: '2026-09-27T10:01:30.000Z' });
  assert.equal(repeated.observability?.attempts.length, 1);
  assert.equal(repeated.observability?.attempts[0].durationMs, 90_000);
  const summary = journeyObservabilitySummary(repeated, Date.parse('2026-09-27T10:02:00.000Z'));
  assert.equal(summary.failed, 1);
  assert.equal(summary.handoffDurationMs, 120_000);
});
