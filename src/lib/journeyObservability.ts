import { FeatureImplementationReceipt, FeatureJourney, JourneyStageAttempt } from '../types/speckit';

const MAX_RETAINED_ATTEMPTS = 100;

function elapsedMs(startedAt: string, finishedAt: string): number {
  const start = Date.parse(startedAt); const end = Date.parse(finishedAt);
  return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0;
}

/** Records only terminal events and is idempotent by job/approval id. */
export function retainJourneyAttempt(journey: FeatureJourney, attempt: Omit<JourneyStageAttempt, 'durationMs'>): FeatureJourney {
  const attempts = journey.observability?.attempts || [];
  if (attempts.some((item) => item.id === attempt.id)) return journey;
  return {
    ...journey,
    observability: { attempts: [...attempts, { ...attempt, durationMs: elapsedMs(attempt.startedAt, attempt.finishedAt) }].slice(-MAX_RETAINED_ATTEMPTS) },
  };
}

export function formatElapsed(durationMs: number): string {
  if (durationMs < 1_000) return '<1s';
  const seconds = Math.round(durationMs / 1_000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60); const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

export function journeyObservabilitySummary(journey: FeatureJourney, implementationReceiptsOrNow: FeatureImplementationReceipt[] | number = [], suppliedNow = Date.now()) {
  // Preserve the original `(journey, now)` call shape for consumers and old
  // tests while allowing the richer implementation-receipt input.
  const implementationReceipts = Array.isArray(implementationReceiptsOrNow) ? implementationReceiptsOrNow : [];
  const now = typeof implementationReceiptsOrNow === 'number' ? implementationReceiptsOrNow : suppliedNow;
  const attempts = journey.observability?.attempts || [];
  const failed = attempts.filter((item) => item.outcome === 'failed').length;
  const successful = attempts.filter((item) => item.outcome !== 'failed').length;
  const handoffDurationMs = Math.max(0, now - Date.parse(journey.startedAt));
  const timedImplementationReceipts = implementationReceipts.filter((receipt) => receipt.startedAt && receipt.finishedAt);
  const implementationDurationMs = timedImplementationReceipts.reduce((total, receipt) => total + elapsedMs(receipt.startedAt!, receipt.finishedAt!), 0);
  const recordedJourneyDurationMs = attempts.reduce((total, attempt) => total + attempt.durationMs, 0);
  const unmeasuredDurationMs = Math.max(0, handoffDurationMs - implementationDurationMs - recordedJourneyDurationMs);
  return { attempts, failed, successful, handoffDurationMs, implementationDurationMs, implementationRuns: timedImplementationReceipts.length, implementationRunsWithoutTiming: Math.max(0, implementationReceipts.length - timedImplementationReceipts.length), recordedJourneyDurationMs, unmeasuredDurationMs };
}
