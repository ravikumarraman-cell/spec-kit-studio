import { Boxes, Code2, Compass } from 'lucide-react';
import { TechnicalRole } from '../../types/speckit';
import { technicalRoleDefinitions } from '../../lib/personas/technicalRoles';

interface Props { value: TechnicalRole; onChange: (role: TechnicalRole) => void; }

const icons = { architect: Compass, developer: Code2, combined: Boxes } as const;

/** Compact, reusable ownership chooser. It explains where responsibility
 * ends before work starts, rather than asking users to infer it from stages. */
export function TechnicalRoleSelector({ value, onChange }: Props) {
  return <section className="rounded-2xl border border-violet-400/25 bg-violet-500/5 p-4" aria-label="Technical role and handoff boundary">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Technical ownership</p><h2 className="mt-1 text-base font-bold text-zinc-100">Who carries the technical work?</h2></div><p className="text-xs text-zinc-400">This only sets ownership; it never changes repository permissions.</p></div>
    <div className="mt-3 grid gap-3 lg:grid-cols-3">{(Object.keys(technicalRoleDefinitions) as TechnicalRole[]).map((role) => {
      const definition = technicalRoleDefinitions[role]; const Icon = icons[role]; const selected = value === role;
      return <button type="button" key={role} onClick={() => onChange(role)} aria-pressed={selected} className={`min-w-0 rounded-xl border p-3 text-left transition ${selected ? 'border-violet-300 bg-violet-400/15 ring-1 ring-violet-300/50' : 'border-zinc-800 bg-zinc-950/45 hover:border-violet-400/45'}`}>
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-100"><Icon className="h-4 w-4 text-violet-300" />{definition.label}</span>
        <span className="mt-2 block text-xs leading-5 text-zinc-300">{definition.summary}</span>
        <span className="mt-2 block text-[11px] leading-4 text-violet-100">{definition.responsibility}</span>
      </button>;
    })}</div>
  </section>;
}
