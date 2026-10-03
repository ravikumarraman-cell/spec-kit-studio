import { PersonaId } from '../../types/speckit';
import { productManagerArtifactAdapter } from './productManagerArtifacts';
import { developerArchitectureArtifactAdapter } from './developerArchitectureArtifacts';
import { businessAnalysisArtifactAdapter } from './businessAnalysisArtifacts';
import { securityResearchArtifactAdapter } from './securityResearchArtifacts';
import { PersonaArtifactAdapter } from './schema';
import { personaCatalog } from './catalog';
import { personaConsumptionRules } from './consumption';
import { PersonaWorkflowRule, personaWorkflowRule, personaWorkflowRuleIssues } from './workflowPolicy';

/**
 * The one registration point for persona capabilities. A persona is not
 * complete merely because it has a screen: it must declare its display
 * metadata, durable workflow, artifact boundary, and a place in the
 * cross-persona consumption model. This makes adding a persona a deliberate,
 * testable extension instead of a collection of unrelated conditionals.
 */
export type PersonaDefinition = import('./catalog').PersonaCatalogEntry;
export interface PersonaModule {
  definition: PersonaDefinition;
  workflow: PersonaWorkflowRule;
  artifactAdapter: PersonaArtifactAdapter<unknown>;
}

const artifactAdapters: Readonly<Record<PersonaId, PersonaArtifactAdapter<unknown>>> = {
  'product-manager': productManagerArtifactAdapter as PersonaArtifactAdapter<unknown>,
  'developer': developerArchitectureArtifactAdapter as PersonaArtifactAdapter<unknown>,
  'business-analyst': businessAnalysisArtifactAdapter as PersonaArtifactAdapter<unknown>,
  'security-researcher': securityResearchArtifactAdapter as PersonaArtifactAdapter<unknown>,
};

/** Ordered for navigation and menus; use `personaModule(id)` for a direct
 * lookup. A new persona declares its catalog entry, workflow, adapter,
 * consumption rules, and panel; this assembly makes omissions visible through
 * one validation surface before the persona reaches navigation or handoffs. */
export const personaModules: readonly PersonaModule[] = personaCatalog.map((definition) => ({
  definition,
  workflow: personaWorkflowRule(definition.id),
  artifactAdapter: artifactAdapters[definition.id],
}));

/** Backwards-compatible ordered projection for menus and existing callers. */
export const personaDefinitions: readonly PersonaDefinition[] = personaModules.map((module) => module.definition);

export function personaModule(id: PersonaId): PersonaModule {
  const module = personaModules.find((candidate) => candidate.definition.id === id);
  if (!module) throw new Error(`Unknown Studio persona module: ${id}`);
  return module;
}

export function personaDefinition(id: PersonaId): PersonaDefinition {
  return personaModule(id).definition;
}

export function personaArtifactAdapter(id: PersonaId): PersonaArtifactAdapter<unknown> {
  return personaModule(id).artifactAdapter;
}

/**
 * Returns configuration errors instead of throwing so tests, startup checks,
 * and future plugin loaders can report every missing extension seam together.
 */
export function personaModuleIssues(module: PersonaModule): string[] {
  const { definition, workflow, artifactAdapter } = module;
  const issues = personaWorkflowRuleIssues(workflow).map((issue) => `workflow: ${issue}`);
  if (!definition.label || !definition.summary || !definition.nextAction) issues.push('catalog: must declare label, summary, and next action');
  if (workflow.personaId !== definition.id) issues.push('workflow: persona ID does not match catalog definition');
  if (artifactAdapter.personaId !== definition.id) issues.push('artifact adapter: persona ID does not match catalog definition');
  if (!artifactAdapter.artifactLabel || typeof artifactAdapter.parse !== 'function' || typeof artifactAdapter.render !== 'function' || typeof artifactAdapter.toEngineArtifact !== 'function') issues.push('artifact adapter: must declare label, parse, render, and engine projection');
  if (!personaConsumptionRules.some((rule) => rule.source === definition.id || rule.consumer === definition.id)) issues.push('consumption: must participate as a source or consumer');
  return issues;
}

export function personaRegistryIssues(): string[] {
  const ids = personaModules.map((module) => module.definition.id);
  const issues = ids.length === personaCatalog.length ? [] : ['catalog: every persona must resolve to one module'];
  if (new Set(ids).size !== ids.length) issues.push('catalog: persona IDs must be unique');
  for (const module of personaModules) {
    for (const issue of personaModuleIssues(module)) issues.push(`${module.definition.id}: ${issue}`);
  }
  return issues;
}
