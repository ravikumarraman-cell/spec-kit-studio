import { Check, ChevronDown, CircleDot } from 'lucide-react';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { personaCatalogEntry } from '../../lib/personas/catalog';
import { personaHandoffPolicy, personaWorkflowCurrentStep, personaWorkflowRule } from '../../lib/personas/workflowPolicy';
import { PersonaId, SpecKitProject } from '../../types/speckit';

/**
 * Role-neutral orientation for the current workspace. It uses only the shared
 * workflow registry, so users see the same role contract regardless of which
 * specialist panel happens to be open.
 */
export function PersonaWorkflowProgress({ project, personaId }: { project: SpecKitProject; personaId: PersonaId }) {
  const rule = personaWorkflowRule(personaId);
  const feature = activeFeatureForProject(project);
  const handoff = personaHandoffPolicy(feature, personaId);
  const complete = Boolean(handoff);
  const currentIndex = personaWorkflowCurrentStep(feature, personaId);
  const current = rule.mandatoryStages[currentIndex];
  const persona = personaCatalogEntry(personaId);
  return <section className="rounded-xl border border-violet-400/25 bg-violet-500/5 px-4 py-3" aria-label={`${persona.label} workflow progress`}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-300">{persona.label} · {complete ? 'Review complete' : `Step ${currentIndex + 1} of ${rule.mandatoryStages.length}`}</p>
        <p className="mt-1 text-sm font-bold text-zinc-100">{complete ? 'Your handoff is ready' : `Now: ${current.label}`}</p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-zinc-300">{complete ? `Your ${rule.artifactLabel.toLowerCase()} is accepted and available to the receiving role. No further review is required from you.` : current.description}</p>
      </div>
      <span className="rounded-full border border-violet-300/30 px-2.5 py-1 text-[11px] font-semibold text-violet-100">{complete ? `Optional: ${rule.primaryLabel}` : `Then: ${rule.primaryLabel}`}</span>
    </div>
    <details className="mt-3 border-t border-violet-300/15 pt-2">
      <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-violet-100"><ChevronDown className="h-3.5 w-3.5" />View the full role path</summary>
      <ol className="mt-3 grid gap-2 md:grid-cols-3">
        {rule.mandatoryStages.map((stage, index) => <li key={stage.id} className={`rounded-lg border p-2.5 text-xs ${complete || index < currentIndex ? 'border-emerald-400/25 bg-emerald-500/5 text-emerald-100' : index === currentIndex ? 'border-violet-300/45 bg-violet-500/10 text-violet-50' : 'border-zinc-700 bg-zinc-950/30 text-zinc-300'}`}>
          <p className="flex items-center gap-1.5 font-bold">{complete || index < currentIndex ? <Check className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}{index + 1}. {stage.label}</p>
          <p className="mt-1 leading-5">Complete when: {stage.completionEvidence}</p>
        </li>)}
      </ol>
      <p className="mt-3 text-xs leading-5 text-zinc-400">Optional: {rule.exploration.label}. This is available after the role’s review boundary and never replaces the primary handoff.</p>
    </details>
  </section>;
}
