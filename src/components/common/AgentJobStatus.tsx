import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, FileCheck2, FileWarning, LoaderCircle, Sparkles, OctagonX } from 'lucide-react';
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
  const isCancelled = job.status === 'cancelled';
  const title = isRunning ? preparingLabel : isSuccess ? 'Agent finished — review the result before approving the stage' : isCancelled ? 'Run stopped safely — inspect any partial changes' : 'The agent stopped before completing';
  const phase = !job.output.trim() ? 'Starting the local process' : 'Receiving live work updates';
  const changedFiles = job.evidence?.changedFiles || [];
  const diagnostic = job.output.trim().slice(-1_200);
  const recovery = /connector token is required/i.test(job.output) ? 'Enter the connector pairing token, then retry.' : /not logged in|login required|authentication required/i.test(job.output) ? 'Sign in to the selected local agent, then retry.' : 'Review the diagnostic and any changed files before deciding whether to retry or revise the work.';
  const tone = isRunning ? 'running' : isSuccess ? 'success' : isCancelled ? 'cancelled' : 'failed';
  const statusSurface = <section className={`agent-job-status agent-job-status--${tone} rounded-2xl border p-4 text-xs`} aria-live="polite">
    <div className="flex items-start gap-3"><div className={`agent-job-status-icon agent-job-status-icon--${tone} relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl`}>{isRunning && <span className="agent-job-status-pulse absolute inset-0 animate-ping rounded-xl" />}{isRunning ? <LoaderCircle className="relative h-5 w-5 animate-spin" /> : isSuccess ? <CheckCircle2 className="h-5 w-5" /> : isCancelled ? <OctagonX className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="agent-job-status-title font-bold">{title}</p>{isRunning && <span className="agent-job-status-live inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"><Sparkles className="h-3 w-3 animate-pulse" />Live</span>}</div>{isRunning && <><div className="mt-3 grid grid-cols-3 gap-1 text-[10px] font-semibold"><span className="agent-job-status-stage agent-job-status-stage--complete rounded-md px-2 py-1">Started</span><span className="agent-job-status-stage agent-job-status-stage--active rounded-md px-2 py-1">{phase}</span><span className="agent-job-status-stage agent-job-status-stage--pending rounded-md px-2 py-1">Review result</span></div><div className="agent-job-status-progress mt-3 h-2 overflow-hidden rounded-full"><div className="agent-job-status-progress-value h-full w-2/5 animate-pulse rounded-full" /></div><div className="agent-job-status-muted mt-3 flex items-center justify-between gap-3 text-[11px]"><span>Working for {elapsedLabel(job.startedAt, now)}</span><span>Usually 1–3 min · large runs up to 10 min</span></div><p className="agent-job-status-help mt-2 text-[11px]">You may safely scroll or leave this page. Studio will keep this status visible and prevents another conflicting run until this one finishes.</p></>}{isCancelled && <p className="agent-job-status-help mt-2 text-[11px]">Cancellation stops the process but does not roll back its file changes. Review the captured evidence before beginning another run.</p>}{!isRunning && job.finishedAt && <p className="agent-job-status-muted mt-1 text-[11px]">Finished after {elapsedLabel(job.startedAt, Date.parse(job.finishedAt))}.</p>}</div></div>
    {!isRunning && <div className="agent-job-status-result mt-4 rounded-xl border p-3"><div className="flex gap-2"><div className="agent-job-status-result-icon">{isSuccess ? <FileCheck2 className="h-4 w-4" /> : <FileWarning className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="agent-job-status-title font-bold">{isSuccess ? 'Result ready for your decision' : 'No approval is available yet'}</p>{isSuccess ? <p className="agent-job-status-muted mt-1 text-[11px] leading-relaxed">Review the generated artifact, changed files, and verification evidence. Only then use the workflow’s review-and-continue action.</p> : <p className="agent-job-status-muted mt-1 text-[11px] leading-relaxed">{recovery}</p>}</div></div>{isSuccess && <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="agent-job-status-inset rounded-lg p-2"><p className="agent-job-status-muted text-[10px] font-bold uppercase tracking-wide">Repository changes</p><p className="agent-job-status-title mt-1 text-[11px]">{job.evidence?.diffStat || (changedFiles.length ? `${changedFiles.length} changed file${changedFiles.length === 1 ? '' : 's'} captured` : 'No Git change summary was reported.')}</p></div><div className="agent-job-status-inset rounded-lg p-2"><p className="agent-job-status-muted text-[10px] font-bold uppercase tracking-wide">Execution</p><p className="agent-job-status-title mt-1 truncate font-mono text-[11px]" title={job.command}>{job.command || job.label}</p></div></div>}{changedFiles.length > 0 && <details className="agent-job-status-details mt-3 text-[11px]"><summary className="cursor-pointer font-semibold">Review changed files ({changedFiles.length})</summary><pre className="agent-job-status-code mt-2 max-h-36 overflow-auto whitespace-pre-wrap rounded-md p-2 text-[10px]">{changedFiles.join('\n')}</pre></details>}<details className="agent-job-status-details mt-3 text-[11px]"><summary className="cursor-pointer font-semibold">{isSuccess ? 'Read agent summary and output' : 'Read diagnostic output'}</summary><pre className="agent-job-status-code mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-md p-2 text-[10px]">{diagnostic || 'The local agent did not return diagnostic output.'}</pre></details></div>}
  </section>;
  // Keep one status surface beside the workflow action that created it. A
  // duplicate floating copy competes with the page, repeats live announcements
  // for assistive technology, and made the same run look like two operations.
  return <div className="agent-job-status-anchor mt-3">{statusSurface}</div>;
}
