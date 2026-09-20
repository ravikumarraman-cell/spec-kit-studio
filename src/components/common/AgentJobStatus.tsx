import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, LoaderCircle, Sparkles } from 'lucide-react';
import { ConnectorJob } from '../../lib/connector';

interface Props { job: ConnectorJob; preparingLabel?: string; }

function elapsedLabel(startedAt: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}

/** A consistent, non-silent progress surface for every local-agent operation. */
export function AgentJobStatus({ job, preparingLabel = 'Agent is preparing the Spec-Kit artifacts…' }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (job.status !== 'running') return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [job.status, job.startedAt]);

  const isRunning = job.status === 'running';
  const isSuccess = job.status === 'succeeded' && job.ok;
  const title = isRunning ? preparingLabel : isSuccess ? 'Agent finished — review the result before approving the stage' : 'The agent stopped before completing';
  const phase = !job.output.trim() ? 'Starting the local process' : 'Receiving live work updates';
  const statusSurface = <section className={`rounded-2xl border p-4 text-xs shadow-2xl ${isRunning ? 'border-cyan-400/40 bg-zinc-950/95' : isSuccess ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`} aria-live="polite">
    <div className="flex items-start gap-3"><div className={`relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isRunning ? 'bg-cyan-500/15 text-cyan-300' : isSuccess ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{isRunning && <span className="absolute inset-0 animate-ping rounded-xl bg-cyan-400/15" />}{isRunning ? <LoaderCircle className="relative h-5 w-5 animate-spin" /> : isSuccess ? <CheckCircle2 className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-bold text-zinc-100">{title}</p>{isRunning && <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-0.5 text-[10px] font-bold text-cyan-200"><Sparkles className="h-3 w-3 animate-pulse" />Live</span>}</div>{isRunning && <><div className="mt-3 grid grid-cols-3 gap-1 text-[10px] font-semibold"><span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-300">Started</span><span className="rounded-md bg-cyan-500/15 px-2 py-1 text-cyan-100">{phase}</span><span className="rounded-md bg-zinc-800 px-2 py-1 text-zinc-500">Review result</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full w-2/5 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-cyan-400" /></div><div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-zinc-400"><span>Working for {elapsedLabel(job.startedAt, now)}</span><span>Usually 1–3 min · large runs up to 10 min</span></div><p className="mt-2 text-[11px] text-cyan-100">You may safely scroll or leave this page. Studio will keep this status visible and prevents another conflicting run until this one finishes.</p></>}{!isRunning && job.finishedAt && <p className="mt-1 text-[11px] text-zinc-400">Finished after {elapsedLabel(job.startedAt, Date.parse(job.finishedAt))}.</p>}</div></div>
    <details className="mt-3 text-[11px] text-zinc-300"><summary className="cursor-pointer font-semibold text-zinc-400">View live agent output</summary><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950/80 p-2 text-[10px] text-zinc-300">{job.output || 'The agent has started. Waiting for its first update…'}</pre></details>
  </section>;
  return isRunning ? <><div className="mt-3">{statusSurface}</div><div className="fixed bottom-5 right-5 z-50 w-[min(28rem,calc(100vw-2.5rem))]">{statusSurface}</div></> : <div className="mt-3">{statusSurface}</div>;
}
