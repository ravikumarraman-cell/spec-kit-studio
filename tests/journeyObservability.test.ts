import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JourneyObservability } from '../src/components/journey/JourneyObservability';
import { createFeatureJourney } from '../src/lib/featureJourney';
import { journeyObservabilitySummary, retainJourneyAttempt } from '../src/lib/journeyObservability';
import { personaWorkflowObservabilitySummary } from '../src/lib/personas/personaObservability';
import type { FeatureInboxItem } from '../src/types/speckit';

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

test('full observability view renders every retained attempt field', () => {
  const journey = retainJourneyAttempt(createFeatureJourney('2026-09-27T10:00:00.000Z'), { id: 'agent:one', stageId: 5, operation: 'agent', outcome: 'failed', startedAt: '2026-09-27T10:00:00.000Z', finishedAt: '2026-09-27T10:01:30.000Z' });
  const html = renderToStaticMarkup(createElement(JourneyObservability, { journey, showAttemptLog: true, defaultOpen: true }));
  assert.match(html, /Retained workflow action log/);
  assert.match(html, /agent:one/);
  assert.match(html, /Stage 5/);
  assert.match(html, /agent/);
  assert.match(html, /failed/);
  assert.match(html, /2026-09-27T10:00:00.000Z/);
  assert.match(html, /2026-09-27T10:01:30.000Z/);
  assert.match(html, /90000 ms/);
});

test('observability keeps code-generation timing separate from workflow actions and unattributed elapsed', () => {
  const journey = retainJourneyAttempt(createFeatureJourney('2026-09-27T10:00:00.000Z'), { id: 'agent:stage-3', stageId: 3, operation: 'agent', outcome: 'succeeded', startedAt: '2026-09-27T10:00:00.000Z', finishedAt: '2026-09-27T10:02:00.000Z' });
  const receipts = [{ taskId: 'T004', jobId: 'codex-004', recordedAt: '2026-09-27T10:30:00.000Z', startedAt: '2026-09-27T10:05:00.000Z', finishedAt: '2026-09-27T10:20:00.000Z', changedFiles: ['src/example.ts'], diffStat: '1 file changed', verificationSummary: 'Passed.' }];
  const summary = journeyObservabilitySummary(journey, receipts, Date.parse('2026-09-27T10:30:00.000Z'));
  assert.equal(summary.implementationDurationMs, 900_000);
  assert.equal(summary.recordedJourneyDurationMs, 120_000);
  assert.equal(summary.unmeasuredDurationMs, 780_000);
  const html = renderToStaticMarkup(createElement(JourneyObservability, { journey, implementationReceipts: receipts, defaultOpen: true }));
  assert.match(html, /Code-generation runs/);
  assert.match(html, /Retained code-generation runs/);
  assert.match(html, /T004/);
  assert.match(html, /Studio workflow actions/);
  assert.match(html, /Unattributed elapsed/);
  assert.doesNotMatch(html, /Human \/ waiting time/);
});

test('persona observability reports retained review and completion without inventing automation attempts', () => {
  const feature: FeatureInboxItem = {
    id: 'feature-a', title: 'Review access', summary: 'Review access.', source: 'text', importedAt: '2026-09-27T10:00:00.000Z', userStoryIds: [], requirementIds: [], taskIds: [],
    productOutcome: { schemaVersion: 1, path: 'specs/review-access/product-brief.md', title: 'Review access', targetUsers: [], problem: 'Review access.', desiredOutcome: 'Review access.', nonGoals: [], successMeasures: [], assumptions: [], decisions: [], acceptanceAnchors: [], markdown: '', specKitProjection: { kind: 'spec', path: 'specs/review-access/spec.md', content: '' }, preparedAt: '2026-09-27T10:05:00.000Z', acceptedAt: '2026-09-27T10:10:00.000Z' },
    personaWorkflowCompletions: [{ personaId: 'product-manager', completedAt: '2026-09-27T10:15:00.000Z' }],
  };
  const summary = personaWorkflowObservabilitySummary(feature, 'product-manager', Date.parse('2026-09-27T11:00:00.000Z'));
  assert.equal(summary.startedAt, '2026-09-27T10:05:00.000Z');
  assert.equal(summary.acceptedAt, '2026-09-27T10:10:00.000Z');
  assert.equal(summary.completedAt, '2026-09-27T10:15:00.000Z');
  assert.equal(summary.elapsedMs, 600_000);
  assert.equal(summary.automationAttempts.length, 0);
});
