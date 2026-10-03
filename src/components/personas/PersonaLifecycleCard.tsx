import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { ActionBrief, ActionBriefContent } from '../common/ActionBrief';

interface Props {
  label: string;
  title: string;
  description: string;
  creates: string[];
  primaryAction?: ReactNode;
  actionBrief?: ActionBriefContent;
  children?: ReactNode;
}

/** Shared, role-neutral prepare → review → accept → handoff surface.
 * Persona-specific components own only their evidence and policy. */
export function PersonaLifecycleCard({ label, title, description, creates, primaryAction, actionBrief, children }: Props) {
  return <section className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-zinc-900 to-zinc-900 p-5" aria-label={label}>
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-violet-300"><Sparkles className="h-4 w-4" />{label}</p>
        <h2 className="mt-1 text-lg font-bold text-zinc-100">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-300">{description}</p>
        <p className="mt-2 text-xs text-zinc-400">Creates: {creates.join(', ') || 'No additional artifacts'} · Changes code: never</p>
      </div>
      {primaryAction && <div className="shrink-0">{primaryAction}</div>}
    </div>
    {actionBrief && <ActionBrief className="mt-4" brief={actionBrief} />}
    {children}
  </section>;
}
