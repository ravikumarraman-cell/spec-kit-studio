import { PersonaId, SpecKitProject } from '../../types/speckit';
import { PersonaCatalogEntry, personaCatalog, personaCatalogEntry } from './catalog';
import { activeDeliveryItemForProject } from '../deliveryItems';
import { isSharedFeatureJourneyActive } from './workflowPolicy';

/** Single source for persona-aware navigation and copy. Screens consume this
 * context instead of duplicating persona-specific route logic. */
export const personaContextDefinitions = personaCatalog;
export type PersonaContextDefinition = PersonaCatalogEntry;
export function personaContext(id: PersonaId | undefined): PersonaContextDefinition | undefined { return id ? personaCatalogEntry(id) : undefined; }

/** Restore a role route from the active delivery item after reload, project
 * selection, or storage hydration. This deliberately applies to every
 * registered persona and has no persona-specific branching. */
export function resumablePersonaRoute(project: SpecKitProject): PersonaId | undefined {
  // A shared journey owns active delivery after the handoff. Do not resurrect
  // the sending persona on refresh merely because its provenance is retained.
  if (isSharedFeatureJourneyActive(project.journey)) return undefined;
  const route = activeDeliveryItemForProject(project)?.personaRoute || project.journey?.personaRoute;
  return route && personaCatalog.some((persona) => persona.id === route) ? route : undefined;
}
