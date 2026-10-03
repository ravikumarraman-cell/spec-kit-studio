import { ArrowRight, Compass } from 'lucide-react';
import { PersonaId, ViewTab } from '../../types/speckit';
import { personaContext } from '../../lib/personas/context';

interface Props { personaId?: PersonaId; currentTab: ViewTab; onResume: () => void; }

/** Reusable continuity cue for every workspace screen. It replaces implicit
 * routing with an explicit active role and one safe way back to its workflow. */
export function PersonaContextBanner({ personaId, currentTab, onResume }: Props) {
  const context = personaContext(personaId);
  if (!context || currentTab === 'personas') return null;
  return <section className="mx-auto mb-4 flex max-w-6xl flex-col gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Active delivery role">
    <div className="flex items-start gap-3"><Compass className="mt-0.5 h-5 w-5 shrink-0 text-violet-200" /><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Active delivery role</p><p className="mt-1 text-sm font-bold text-zinc-100">{context.label} · {context.summary}</p></div></div>
    <button type="button" onClick={onResume} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-violet-300/45 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/10">{context.nextAction}<ArrowRight className="h-3.5 w-3.5" /></button>
  </section>;
}
