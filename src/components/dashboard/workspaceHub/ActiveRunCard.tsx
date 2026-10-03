import { CircleAlert, CircleCheck, LoaderCircle, Square } from 'lucide-react';
import type { ConnectorJob } from '../../../lib/connector';

interface Props { job: ConnectorJob; stale?: boolean; onOpen: () => void; onStop: () => void; }

function elapsed(startedAt: string, finishedAt: string | null) {
  const duration = Math.max(0, (new Date(finishedAt || Date.now()).getTime() - new Date(startedAt).getTime()) / 1000);
  return duration < 60 ? `${Math.floor(duration)}s` : `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`;
}

export function ActiveRunCard({ job, stale = false, onOpen, onStop }: Props) {
  const running = job.status === 'running';
  const succeeded = job.status === 'succeeded';
  const Icon = running ? LoaderCircle : succeeded ? CircleCheck : CircleAlert;
  const statusLabel = running ? `Running · ${elapsed(job.startedAt, null)}` : succeeded ? 'Completed — review results' : job.status === 'cancelled' ? 'Stopped safely' : 'Needs review';
  return <section aria-labelledby="active-run-title" aria-live="polite" className="workspace-hub-surface rounded-2xl border p-4 shadow-xs"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><Icon className={`mt-0.5 h-5 w-5 shrink-0 ${running ? 'workspace-hub-running' : succeeded ? 'workspace-hub-success' : 'workspace-hub-warning'}`} aria-hidden="true" /><div><p className="workspace-hub-eyebrow text-[10px] font-black tracking-[0.16em]">LOCAL CONNECTOR RUN</p><h2 id="active-run-title" className="workspace-hub-title mt-1 truncate text-sm font-bold">{job.label}</h2><p className="workspace-hub-muted mt-1 text-xs">{statusLabel}{stale ? ' · status may be stale' : ''}</p></div></div><div className="flex gap-2"><button type="button" onClick={onOpen} className="workspace-hub-button workspace-hub-button--secondary min-h-9 rounded-lg border px-3 text-xs font-semibold">View details</button>{running && <button type="button" onClick={onStop} className="workspace-hub-button workspace-hub-button--danger inline-flex min-h-9 items-center gap-1 rounded-lg border px-3 text-xs font-semibold"><Square className="h-3 w-3" />Stop safely</button>}</div></div></section>;
}
