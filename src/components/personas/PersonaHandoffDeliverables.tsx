import { PackageCheck } from 'lucide-react';

export interface HandoffDeliverable {
  label: string;
  items: string[];
  path?: string;
}

interface Props {
  deliverables: readonly HandoffDeliverable[];
}

/** The visible package contract shared by every current and future persona. */
export function PersonaHandoffDeliverables({ deliverables }: Props) {
  return <section className="mt-5" aria-labelledby="handoff-deliverables-title">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-emerald-200"><PackageCheck className="h-4 w-4" />Handoff package</p>
        <h3 id="handoff-deliverables-title" className="mt-1 text-base font-bold text-zinc-100">What will be delivered</h3>
      </div>
      <span className="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">{deliverables.length} artifact {deliverables.length === 1 ? 'group' : 'groups'}</span>
    </div>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      {deliverables.map((deliverable) => <article key={deliverable.label} className="rounded-xl border border-emerald-300/25 bg-zinc-950/40 p-4">
        <p className="text-sm font-bold text-zinc-100">{deliverable.label}</p>
        {deliverable.path && <p className="mt-1 break-all font-mono text-[11px] text-emerald-200">{deliverable.path}</p>}
        <ul className="mt-2 space-y-1 text-xs leading-5 text-zinc-300">{deliverable.items.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true" className="text-emerald-300">•</span><span>{item}</span></li>)}</ul>
      </article>)}
    </div>
  </section>;
}