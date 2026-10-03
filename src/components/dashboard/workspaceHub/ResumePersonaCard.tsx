import { ArrowRight, RotateCcw } from 'lucide-react';
import type { PersonaCatalogEntry } from '../../../lib/personas/catalog';

interface Props {
  persona: PersonaCatalogEntry;
  onContinue: () => void;
  onChooseAnother: () => void;
}

/** One dominant continuation action for a retained persona draft. */
export function ResumePersonaCard({ persona, onContinue, onChooseAnother }: Props) {
  return <section aria-labelledby="resume-persona-title" className="workspace-hub-next-action rounded-2xl border p-5 shadow-xs sm:p-6">
    <p className="workspace-hub-eyebrow text-[10px] font-black uppercase tracking-[0.16em]">{persona.label} IN PROGRESS</p>
    <h2 id="resume-persona-title" className="workspace-hub-title mt-2 text-xl font-bold">Continue the outcome you started</h2>
    <p className="workspace-hub-muted mt-2 max-w-2xl text-sm leading-6">{persona.summary} Your saved draft and delivery context remain available.</p>
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button type="button" onClick={onContinue} className="workspace-hub-button workspace-hub-button--primary inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold">{persona.nextAction}<ArrowRight className="h-4 w-4" /></button>
      <button type="button" onClick={onChooseAnother} className="workspace-hub-button workspace-hub-button--secondary inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold"><RotateCcw className="h-4 w-4" />Choose another outcome</button>
    </div>
    <p className="workspace-hub-muted mt-3 text-[11px]">Changing the route does not delete saved drafts or retained evidence.</p>
  </section>;
}
