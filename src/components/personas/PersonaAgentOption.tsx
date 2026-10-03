import { Bot, ShieldCheck } from 'lucide-react';
import { ActionBrief } from '../common/ActionBrief';

interface Props {
  agentLabel?: string;
  description: string;
  unavailableHint: string;
  isRunning?: boolean;
  onRun: () => void;
  compact?: boolean;
}

/** A reusable, explicit opt-in for read-only persona drafting assistance.
 * Personas retain a complete manual route; agent availability never blocks it. */
export function PersonaAgentOption({ agentLabel, description, unavailableHint, isRunning = false, onRun, compact = false }: Props) {
  const available = Boolean(agentLabel);
  const body = <>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-xs leading-relaxed text-zinc-300">{description}</p></div>
      {available && <button type="button" onClick={onRun} disabled={isRunning} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-violet-300/45 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"><Bot className="h-3.5 w-3.5" />{isRunning ? 'Agent is preparing…' : `Draft with ${agentLabel}`}</button>}
    </div>
    <p className="mt-3 flex gap-2 border-t border-violet-300/15 pt-3 text-xs leading-relaxed text-zinc-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />{available ? 'The agent runs read-only. It cannot change code, create a branch, commit, or approve work. You review every draft before accepting it.' : unavailableHint}</p>
    {!compact && <ActionBrief className="mt-3" brief={{ summary: available ? 'Prepares a read-only draft for your review.' : 'Explains what the optional agent path will do when ready.', creates: ['A review candidate; no evidence is accepted yet'], uses: available ? [`The selected local planning agent: ${agentLabel}`] : ['A connected workspace and selected planning agent'], doesNot: ['Change code or repository files', 'Create a branch or commit', 'Approve work on your behalf'], next: 'Review, edit, accept, or discard the returned draft.' }} />}
  </>;
  if (compact) return <details className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3" aria-label="Optional agent assistance"><summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-violet-100"><Bot className="h-4 w-4" />Make the first draft faster with {agentLabel || 'an agent'} <span className="font-normal text-zinc-400">· optional</span></summary><div className="mt-3">{body}</div></details>;
  return <section className="rounded-xl border border-violet-400/25 bg-violet-500/5 p-4" aria-label="Optional agent assistance"><p className="mb-2 inline-flex items-center gap-2 text-xs font-bold text-violet-100"><Bot className="h-4 w-4" />Use an agent from Studio <span className="font-normal text-zinc-400">Optional</span></p>{body}</section>;
}
