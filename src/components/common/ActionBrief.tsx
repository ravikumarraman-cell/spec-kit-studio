import { CheckCircle2, FileInput, ShieldCheck, Waypoints } from 'lucide-react';
import { ProgressiveDisclosure } from './ProgressiveDisclosure';

export interface ActionBriefContent {
  summary: string;
  creates?: string[];
  uses?: string[];
  doesNot?: string[];
  next?: string;
}

interface Props {
  brief: ActionBriefContent;
  className?: string;
}

function BriefColumn({ icon: Icon, label, items }: { icon: typeof FileInput; label: string; items?: string[] }) {
  if (!items?.length) return null;
  return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400"><Icon className="h-3.5 w-3.5 text-cyan-300" />{label}</p><ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-zinc-300">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}

/** Shared click/tap/keyboard explanation for consequential workflow actions.
 * The one-line summary remains visible; supporting detail is disclosed only
 * when the user asks for it, avoiding hover-only instructions and clutter. */
export function ActionBrief({ brief, className = '' }: Props) {
  return <ProgressiveDisclosure className={`action-brief rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-1 ${className}`} tone="context" label="What will happen?" summary={brief.summary}>
    <div className="grid gap-2 p-3 sm:grid-cols-2">
      <BriefColumn icon={FileInput} label="Creates" items={brief.creates} />
      <BriefColumn icon={ShieldCheck} label="Does not" items={brief.doesNot} />
      <BriefColumn icon={Waypoints} label="Uses" items={brief.uses} />
      {brief.next && <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />Next</p><p className="mt-2 text-[11px] leading-relaxed text-zinc-300">{brief.next}</p></div>}
    </div>
  </ProgressiveDisclosure>;
}
