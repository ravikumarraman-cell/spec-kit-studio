import React from 'react';
import { ConnectorJob } from '../../lib/connector';

interface EngineWorkPacketPanelProps {
  prompt: string;
  agentLabel: string;
  connectorToken: string;
  repositoryConnected: boolean;
  isRunning: boolean;
  job: ConnectorJob | null;
  onCopy: () => void;
  onTokenChange: (token: string) => void;
  onRun: () => void;
  onOpenWorkspace?: () => void;
  onReviewStories: () => void;
  isReviewingStories?: boolean;
  reviewError?: string | null;
}

/**
 * The reviewable Engine handoff surface. Execution and polling are intentionally
 * delegated to the parent so this component never gains repository authority.
 */
export function EngineWorkPacketPanel({
  prompt,
  agentLabel,
  connectorToken,
  repositoryConnected,
  isRunning,
  job,
  onCopy,
  onTokenChange,
  onRun,
  onOpenWorkspace,
  onReviewStories,
  isReviewingStories = false,
  reviewError,
}: EngineWorkPacketPanelProps) {
  const hasIsolatedSpecReceipt = Boolean(job?.ok && job.evidence?.sandboxed && job.evidence.promotedFiles?.some((path) => /^specs\/[^/]+\/spec\.md$/i.test(path)));
  const reviewReady = hasIsolatedSpecReceipt;
  const jobClass = job?.status === 'failed'
    ? 'border-rose-500/30 bg-rose-500/10'
    : job?.status === 'succeeded'
      ? 'border-emerald-400/30 bg-emerald-500/10'
      : 'border-cyan-400/30 bg-zinc-950/60';

  return (
    <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] font-black text-emerald-300">Feature workflow · step 2 of 3</p>
          <h3 className="mt-1 font-bold text-emerald-100">Run the work packet, then review it here</h3>
          <p className="mt-1 text-xs text-emerald-200/80">Studio runs {agentLabel} in a disposable isolated worktree and shows its live output here. Only a validated feature spec can be promoted; application-code changes are always discarded.</p>
        </div>
        {!reviewReady && <button type="button" onClick={onCopy} className="shrink-0 px-3 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-zinc-950 text-xs font-bold">Copy packet</button>}
      </div>

      {reviewReady ? (
        <section aria-labelledby="review-stories-next-step" aria-live="polite" className="rounded-xl border border-cyan-300/50 bg-cyan-400/15 p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">Next required action · step 3 of 3</p>
          <h4 id="review-stories-next-step" className="mt-1 text-base font-bold text-white">Review the generated user stories</h4>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-cyan-50/90">The agent completed a validated isolated run. Review the generated feature specification before continuing. No agent rerun is needed.</p>
          <button type="button" onClick={onReviewStories} disabled={isReviewingStories} className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-4 py-2 text-sm font-bold text-zinc-950 shadow-sm transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-100 disabled:cursor-wait disabled:opacity-60">
            {isReviewingStories ? 'Opening generated stories…' : 'Review generated user stories →'}
          </button>
          {reviewError && <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-2 text-[11px] leading-5 text-rose-50">{reviewError}</p>}
        </section>
      ) : (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="text-[11px] text-emerald-100/80">
            Pairing token <span className="text-emerald-200/50">(only if your connector requires one)</span>
            <input value={connectorToken} onChange={(event) => onTokenChange(event.target.value)} type="password" placeholder="Enter it once in Connected Workspace, or paste it here" className="mt-1 w-full rounded-lg border border-emerald-500/25 bg-zinc-950/70 px-3 py-2 text-xs text-zinc-100" />
          </label>
          <button type="button" onClick={onRun} disabled={isRunning || !repositoryConnected} className="self-end rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">
            {isRunning ? 'Running agent…' : `Run ${agentLabel} in Studio`}
          </button>
        </div>
      )}

      {!repositoryConnected && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-400/10 p-2 text-[11px] text-amber-100">
          Step 1 is incomplete: open Connected Workspace, scan the repository once, then return here.
          {onOpenWorkspace && <button type="button" onClick={onOpenWorkspace} className="ml-1 font-bold underline">Open Connected Workspace</button>}
        </div>
      )}

      {job && (
        <div className={`rounded-xl border p-3 text-xs ${jobClass}`}>
          <div className="font-bold text-zinc-100">{job.status === 'running' ? 'Agent is preparing the Spec-Kit artifacts…' : hasIsolatedSpecReceipt ? 'Step 2 complete · stories are ready to review' : job.ok ? 'Previous run cannot be reviewed safely' : 'The agent stopped before completing'}</div>
          {reviewReady ? (
            <details className="mt-2 rounded-md border border-emerald-400/20 bg-zinc-950/35 p-2 text-[11px] text-emerald-50">
              <summary className="cursor-pointer font-semibold">View agent output</summary>
              <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950/80 p-2 text-[10px] text-zinc-300">{job.output || 'Agent started; waiting for output…'}</pre>
            </details>
          ) : <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950/80 p-2 text-[10px] text-zinc-300">{job.output || 'Agent started; waiting for output…'}</pre>}
          {job.ok && !hasIsolatedSpecReceipt && <div role="alert" className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-[11px] leading-5 text-amber-100"><p>This run cannot be attested as an isolated execution. If it already produced an official spec, you can safely load that read-only artifact for review; this does not rerun an agent or modify the repository.</p><button type="button" onClick={onReviewStories} disabled={isReviewingStories} className="mt-2 rounded-md border border-amber-300/40 bg-amber-100 px-2 py-1.5 text-[11px] font-bold text-amber-950 disabled:cursor-wait disabled:opacity-60">{isReviewingStories ? 'Loading existing specification…' : 'Load existing official specification'}</button>{reviewError && <p className="mt-2 rounded-md border border-rose-400/30 bg-rose-500/10 p-2 text-rose-100">{reviewError}</p>}</div>}
        </div>
      )}

      {!reviewReady && <details className="text-xs text-emerald-100"><summary className="cursor-pointer font-semibold">Preview work packet</summary><pre className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-950/70 p-3 text-[11px] text-zinc-300 max-h-48 overflow-auto">{prompt}</pre></details>}
    </section>
  );
}
