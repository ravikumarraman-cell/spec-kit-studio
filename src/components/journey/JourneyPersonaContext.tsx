import { Layers3 } from 'lucide-react';
import { FeatureInboxItem } from '../../types/speckit';
import { technicalRoleForFeature } from '../../lib/personas/technicalRoles';
import { isStageContextRelevant } from '../../lib/stageContentPolicy';
import { personaCatalogEntry } from '../../lib/personas/catalog';
import { personaWorkflowRule, resolveDeliveryPersona } from '../../lib/personas/workflowPolicy';

interface Props { feature?: FeatureInboxItem; activeStageId: number; actorPersona?: FeatureInboxItem['personaRoute']; }

/**
 * Persona work is durable context, not a competing action. The Journey owns
 * the active task, so prior role artifacts are deliberately collapsed and are
 * shown only while they can inform impact, design, or delivery planning.
 */
export function JourneyPersonaContext({ feature, activeStageId, actorPersona }: Props) {
  if (!feature) return null;
  // A Journey can be opened by a role before older/imported feature records
  // have persisted personaRoute.  The active role remains useful context and
  // must not disappear at handoff merely because that optional historic field
  // is absent.
  const handoffPersonaId = resolveDeliveryPersona(feature);
  const personaId = actorPersona || handoffPersonaId;
  const route = personaId ? personaCatalogEntry(personaId) : undefined;
  const routeRule = personaId ? personaWorkflowRule(personaId) : undefined;
  const handoffRoute = handoffPersonaId && handoffPersonaId !== personaId ? personaCatalogEntry(handoffPersonaId) : undefined;
  const inputs = isStageContextRelevant('persona-inputs', activeStageId) ? [
    feature.productOutcome?.acceptedAt && { label: 'Product Brief', detail: 'Outcome, scope boundaries, success measures, and acceptance anchors' },
    feature.businessAnalysis?.acceptedAt && { label: 'Business Analysis', detail: 'Reviewed scope, stakeholders, and acceptance evidence' },
    feature.securityResearch?.acceptedAt && { label: 'Security Review', detail: 'Required controls and security verification evidence' },
    feature.developerArchitecture?.acceptedAt && { label: technicalRoleForFeature(feature) === 'architect' ? 'Architecture Handoff' : 'Technical Decision', detail: 'Change surface, guardrails, verification, rollout, and rollback' },
  ].filter(Boolean) as Array<{ label: string; detail: string }> : [];
  if (!route && !inputs.length) return null;
  return <section className="rounded-xl border border-violet-400/25 bg-violet-500/5 p-3" aria-label="Persona context">
    {route && <div><p className="flex items-center gap-2 text-xs font-bold text-violet-100"><Layers3 className="h-4 w-4 text-violet-300" />Working role · {route.label}</p><p className="mt-1 text-[11px] leading-5 text-zinc-300">{routeRule?.journeyContext}</p>{handoffRoute && <p className="mt-1 text-[11px] leading-5 text-zinc-400">Accepted handoff context from {handoffRoute.label}; it remains read-only evidence for this delivery.</p>}</div>}
    {inputs.length > 0 && <details className={route ? 'mt-3 border-t border-violet-400/15 pt-3' : ''}>
      <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-violet-100">Accepted inputs informing this stage <span className="font-normal text-zinc-400">· {inputs.length} retained artifact{inputs.length === 1 ? '' : 's'}</span></summary>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">{inputs.map((input) => <article key={input.label} className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3"><p className="text-xs font-bold text-zinc-100">{input.label}</p><p className="mt-1 text-[11px] leading-5 text-zinc-300">{input.detail}</p></article>)}</div>
      <p className="mt-3 text-[11px] leading-5 text-zinc-400">These inputs are read-only context. Editing them reopens only their owning review stage; it does not alter the current stage automatically.</p>
    </details>}
  </section>;
}
