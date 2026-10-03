import { FeatureImplementationReceipt, FeatureJourney } from '../../types/speckit';
import { featureJourneyStages } from '../../lib/featureJourney';
import { formatElapsed, journeyObservabilitySummary } from '../../lib/journeyObservability';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';

interface JourneyObservabilityProps {
  journey: FeatureJourney;
  showAttemptLog?: boolean;
  defaultOpen?: boolean;
  implementationReceipts?: FeatureImplementationReceipt[];
}

export function JourneyObservability({ journey, showAttemptLog = false, defaultOpen = false, implementationReceipts = [] }: JourneyObservabilityProps) {
  const summary = journeyObservabilitySummary(journey, implementationReceipts);
  const timedImplementationRuns = implementationReceipts.filter((receipt) => receipt.startedAt && receipt.finishedAt);
  const stages = featureJourneyStages.map((stage) => {
    const attempts = summary.attempts.filter((item) => item.stageId === stage.id);
    return { stage, attempts, elapsed: attempts.reduce((total, item) => total + item.durationMs, 0), failed: attempts.filter((item) => item.outcome === 'failed').length };
  }).filter((item) => item.attempts.length > 0);
  return <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" tone="context" label="Delivery observability" summary={`${formatElapsed(summary.handoffDurationMs)} end-to-end · ${summary.implementationRuns ? `${formatElapsed(summary.implementationDurationMs)} across ${summary.implementationRuns} code-generation run${summary.implementationRuns === 1 ? '' : 's'}` : 'code-generation timing unavailable'}`} defaultOpen={defaultOpen}>
    <section className="p-3 text-xs"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><Metric label="End-to-end elapsed" value={formatElapsed(summary.handoffDurationMs)} /><Metric label="Code-generation runs" value={summary.implementationRuns ? formatElapsed(summary.implementationDurationMs) : 'Not recorded'} detail={summary.implementationRuns ? `${summary.implementationRuns} reviewed agent run${summary.implementationRuns === 1 ? '' : 's'}` : undefined} /><Metric label="Studio workflow actions" value={formatElapsed(summary.recordedJourneyDurationMs)} /><Metric label="Unattributed elapsed" value={formatElapsed(summary.unmeasuredDurationMs)} detail="Review, reading, waiting, or work outside Studio" /></div><p className="mt-3 text-[11px] leading-5 text-zinc-400">End-to-end elapsed is the clock time since this Journey began. It equals retained code-generation time + recorded Studio workflow actions + unattributed elapsed. Unattributed elapsed is a remainder, not a claim that all of that time was human work. {summary.implementationRunsWithoutTiming ? `${summary.implementationRunsWithoutTiming} earlier implementation receipt${summary.implementationRunsWithoutTiming === 1 ? '' : 's'} lack agent timestamps, so that code-generation time is intentionally excluded rather than guessed.` : 'Every retained implementation receipt has agent timing evidence.'}</p>{timedImplementationRuns.length > 0 && <section className="mt-3 rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-3" aria-label="Retained code-generation timing"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="font-bold text-cyan-100">Retained code-generation runs</p><p className="text-cyan-200">{formatElapsed(summary.implementationDurationMs)} across {timedImplementationRuns.length} reviewed task{timedImplementationRuns.length === 1 ? '' : 's'}</p></div><div className="mt-2 divide-y divide-cyan-500/15">{timedImplementationRuns.map((receipt) => <div key={receipt.taskId} className="flex flex-wrap items-center justify-between gap-2 py-2"><span className="font-mono font-semibold text-zinc-100">{receipt.taskId}</span><span className="text-zinc-300">Agent ran {formatElapsed(Date.parse(receipt.finishedAt!) - Date.parse(receipt.startedAt!))} · reviewed receipt retained</span></div>)}</div></section>}{stages.length > 0 ? <section className="mt-3" aria-label="Studio workflow action timing"><p className="mb-2 font-bold text-zinc-200">Studio workflow actions</p><div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950/50">{stages.map(({ stage, attempts, elapsed, failed }) => <div key={stage.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"><span className="font-semibold text-zinc-100">{stage.id}. {stage.shortLabel}</span><span className="text-zinc-400">{attempts.length} recorded action{attempts.length === 1 ? '' : 's'} · {formatElapsed(elapsed)}{failed ? ` · ${failed} retry` : ''}</span></div>)}</div></section> : <p className="mt-3 text-zinc-400">Studio workflow actions appear here as you work through the Journey.</p>}{showAttemptLog && <div className="mt-4"><p className="font-bold text-zinc-100">Retained workflow action log</p>{summary.attempts.map((attempt) => <article key={attempt.id} className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-semibold text-zinc-100">Stage {attempt.stageId} · {attempt.operation} · {attempt.outcome}</p><p className="mt-1 break-all font-mono text-zinc-400">{attempt.id}</p><p className="mt-1 text-zinc-400">{attempt.startedAt} → {attempt.finishedAt} · {formatElapsed(attempt.durationMs)} ({attempt.durationMs} ms)</p></article>)}</div>}</section>
  </ProgressiveDisclosure>;
}

/** A deliberately small, always-visible status line for the Journey header. */
export function JourneyObservabilitySnapshot({ journey, implementationReceipts = [] }: { journey: FeatureJourney; implementationReceipts?: FeatureImplementationReceipt[] }) {
  const summary = journeyObservabilitySummary(journey, implementationReceipts);
  return <div aria-label="Delivery telemetry" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-300">
    <span className="font-bold uppercase tracking-wide text-cyan-200">Delivery telemetry</span>
    <span><strong className="text-zinc-100">{formatElapsed(summary.handoffDurationMs)}</strong> elapsed</span>
    <span><strong className="text-zinc-100">{summary.implementationRuns ? formatElapsed(summary.implementationDurationMs) : '—'}</strong> agent implementation</span>
    <span><strong className="text-zinc-100">{summary.attempts.length}</strong> attempt{summary.attempts.length === 1 ? '' : 's'}</span>
    <span><strong className={summary.failed ? 'text-amber-200' : 'text-emerald-200'}>{summary.failed}</strong> retr{summary.failed === 1 ? 'y' : 'ies'}</span>
  </div>;
}
function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) { return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-1 text-base font-bold text-cyan-200">{value}</p>{detail && <p className="mt-1 text-[10px] leading-4 text-zinc-400">{detail}</p>}</div>; }
