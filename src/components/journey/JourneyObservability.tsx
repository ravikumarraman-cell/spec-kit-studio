import { FeatureJourney } from '../../types/speckit';
import { featureJourneyStages } from '../../lib/featureJourney';
import { formatElapsed, journeyObservabilitySummary } from '../../lib/journeyObservability';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';

export function JourneyObservability({ journey }: { journey: FeatureJourney }) {
  const summary = journeyObservabilitySummary(journey);
  const stages = featureJourneyStages.map((stage) => {
    const attempts = summary.attempts.filter((item) => item.stageId === stage.id);
    return { stage, attempts, elapsed: attempts.reduce((total, item) => total + item.durationMs, 0), failed: attempts.filter((item) => item.outcome === 'failed').length };
  }).filter((item) => item.attempts.length > 0);
  return <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" tone="context" label="Delivery observability" summary={`${summary.attempts.length} attempts · ${formatElapsed(summary.handoffDurationMs)} elapsed`}>
    <section className="p-3 text-xs"><div className="grid gap-2 sm:grid-cols-3"><Metric label="Total elapsed" value={formatElapsed(summary.handoffDurationMs)} /><Metric label="Successful actions" value={String(summary.successful)} /><Metric label="Retries needed" value={String(summary.failed)} /></div>{stages.length > 0 ? <div className="mt-3 divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950/50">{stages.map(({ stage, attempts, elapsed, failed }) => <div key={stage.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span className="font-semibold text-zinc-100">{stage.id}. {stage.shortLabel}</span><span className="text-zinc-400">{attempts.length} attempt{attempts.length === 1 ? '' : 's'} · {formatElapsed(elapsed)}{failed ? ` · ${failed} retry` : ''}</span></div>)}</div> : <p className="mt-3 text-zinc-400">Attempts and elapsed time appear here as you work through the Journey.</p>}</section>
  </ProgressiveDisclosure>;
}

/** A deliberately small, always-visible status line for the Journey header. */
export function JourneyObservabilitySnapshot({ journey }: { journey: FeatureJourney }) {
  const summary = journeyObservabilitySummary(journey);
  return <div aria-label="Delivery telemetry" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300">
    <span className="font-bold uppercase tracking-wide text-cyan-200">Delivery telemetry</span>
    <span><strong className="text-zinc-100">{formatElapsed(summary.handoffDurationMs)}</strong> elapsed</span>
    <span><strong className="text-zinc-100">{summary.attempts.length}</strong> attempt{summary.attempts.length === 1 ? '' : 's'}</span>
    <span><strong className={summary.failed ? 'text-amber-200' : 'text-emerald-200'}>{summary.failed}</strong> retr{summary.failed === 1 ? 'y' : 'ies'}</span>
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-1 text-base font-bold text-cyan-200">{value}</p></div>; }
