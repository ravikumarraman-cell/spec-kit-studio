import { FileText, ListChecks } from 'lucide-react';

interface Props {
  personaLabel: string;
  title: string;
  description: string;
  onChoose: (scope: 'feature' | 'user-story') => void;
}

/** Shared scope entry for advisory personas. It keeps wording, scope safety,
 * and the feature/story handoff consistent without granting repository access. */
export function PersonaScopeChooser({ personaLabel, title, description, onChoose }: Props) {
  return <section className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-zinc-900 to-zinc-900 p-6">
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">{personaLabel} · Step 1 · Choose delivery scope</p>
    <h2 className="mt-1 text-xl font-bold text-zinc-100">{title}</h2>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">{description}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <button type="button" onClick={() => onChoose('feature')} className="group rounded-xl border border-violet-300/40 bg-zinc-950/45 p-4 text-left hover:bg-violet-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">
        <FileText className="h-4 w-4 text-violet-200" /><p className="mt-2 text-sm font-bold text-zinc-100">Start with a feature</p><p className="mt-1 text-xs leading-relaxed text-zinc-400">Create, import, or select a feature with related stories and requirements.</p>
      </button>
      <button type="button" onClick={() => onChoose('user-story')} className="group rounded-xl border border-violet-300/40 bg-zinc-950/45 p-4 text-left hover:bg-violet-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">
        <ListChecks className="h-4 w-4 text-violet-200" /><p className="mt-2 text-sm font-bold text-zinc-100">Start with one user story</p><p className="mt-1 text-xs leading-relaxed text-zinc-400">Create, import, or select one outcome and keep delivery strictly scoped to it.</p>
      </button>
    </div>
    <p className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-xs text-cyan-100">Persona work remains advisory. Choosing scope does not connect a repository, change source code, or approve delivery.</p>
  </section>;
}
