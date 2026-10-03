import { UserRound } from 'lucide-react';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { personaCatalogEntry } from '../../lib/personas/catalog';
import { PersonaId, SpecKitProject } from '../../types/speckit';
import { resolveDeliveryPersona, resolveWorkingPersona } from '../../lib/personas/workflowPolicy';

/** A quiet, screen-independent reminder that separates the human's current
 * role from the accepted handoff that supplied the feature context. */
export function DeliveryPersonaMarker({ project, activePersona, onOpenPersona }: { project: SpecKitProject; activePersona?: PersonaId; onOpenPersona?: (personaId: PersonaId) => void }) {
  const handoffPersonaId = resolveDeliveryPersona(activeFeatureForProject(project), project.journey?.personaRoute);
  const personaId = resolveWorkingPersona(activePersona, project.journey) || handoffPersonaId;
  if (!personaId) return null;
  const persona = personaCatalogEntry(personaId);
  const handoffPersona = handoffPersonaId && handoffPersonaId !== personaId ? personaCatalogEntry(handoffPersonaId) : undefined;
  return <div className="mx-auto mb-3 flex max-w-5xl flex-wrap items-center gap-2 px-1 text-[11px] text-slate-600 dark:text-zinc-400" aria-label="Delivery role and handoff context">
    <UserRound className="h-3.5 w-3.5 text-violet-600 dark:text-violet-300" />
    <span>Working as: <strong className="text-slate-800 dark:text-zinc-200">{persona.label}</strong></span>
    {handoffPersona && <span className="text-slate-500 dark:text-zinc-500">· Handoff context from {handoffPersona.label}</span>}
    {onOpenPersona && <button type="button" onClick={() => onOpenPersona(personaId)} className="font-semibold text-violet-700 underline underline-offset-2 hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-100">Open {persona.label} workspace</button>}
  </div>;
}
