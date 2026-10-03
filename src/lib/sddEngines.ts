import type { SddEngineId } from '../types/speckit';

export interface SddEngineDefinition {
  id: SddEngineId;
  label: string;
  description: string;
  artifactModel: string;
  strictConformance: boolean;
  availability: 'available' | 'coming-soon';
}

/** Studio owns the review workflow, not a vendor CLI. These definitions are
 * the stable contract for connector adapters and project state. */
export const SDD_ENGINES: readonly SddEngineDefinition[] = [
  { id: 'github-spec-kit', label: 'GitHub Spec Kit', description: 'Strict numbered spec, plan, and task artifacts with local CLI verification.', artifactModel: 'specs/NNN-feature/{spec,plan,tasks}.md', strictConformance: true, availability: 'available' },
  { id: 'openspec', label: 'OpenSpec', description: 'A future adapter for OpenSpec change proposals and specifications.', artifactModel: 'OpenSpec change artifacts', strictConformance: false, availability: 'coming-soon' },
  { id: 'bmad-method', label: 'BMAD Method', description: 'A future adapter for BMAD planning and implementation workflows.', artifactModel: 'BMAD workflow artifacts', strictConformance: false, availability: 'coming-soon' },
  { id: 'tessl', label: 'Tessl', description: 'A future adapter for Tessl specifications and implementation context.', artifactModel: 'Tessl specification artifacts', strictConformance: false, availability: 'coming-soon' },
  { id: 'kiro', label: 'AWS Kiro', description: 'A future adapter for Kiro specs, design, and task files.', artifactModel: 'Kiro steering and spec artifacts', strictConformance: false, availability: 'coming-soon' },
];

export function sddEngine(id: SddEngineId | undefined): SddEngineDefinition {
  return SDD_ENGINES.find((engine) => engine.id === id) || SDD_ENGINES[0];
}
