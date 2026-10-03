import type { SddEngineId, SpecKitProject } from '../types/speckit';
import { SDD_ENGINES } from './sddEngines';

export const SDD_ENGINE_SELECTION_SCHEMA_VERSION = 1 as const;
const KNOWN_ENGINE_IDS = new Set<SddEngineId>(SDD_ENGINES.map((engine) => engine.id));

/** Old workspaces never need an interactive migration: their historical
 * behavior was GitHub Spec Kit, so that is the only safe default. Unknown
 * values also fail closed to that established, verified adapter. */
export function normalizeSddEngineSelection(value: unknown): SddEngineId {
  return typeof value === 'string' && KNOWN_ENGINE_IDS.has(value as SddEngineId)
    ? value as SddEngineId
    : 'github-spec-kit';
}

export function migrateSddEngineProject(project: SpecKitProject): { project: SpecKitProject; migrated: boolean } {
  const sddEngine = normalizeSddEngineSelection(project.sddEngine);
  const migrated = project.sddEngine !== sddEngine || project.sddEngineSchemaVersion !== SDD_ENGINE_SELECTION_SCHEMA_VERSION;
  return { project: migrated ? { ...project, sddEngine, sddEngineSchemaVersion: SDD_ENGINE_SELECTION_SCHEMA_VERSION } : project, migrated };
}
