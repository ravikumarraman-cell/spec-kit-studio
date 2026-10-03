import type { PersonaId, SddEngineId } from '../types/speckit';

/** Engine-neutral artifact contract. Personas own decisions; engines own the
 * artifact names, paths, and gates that make those decisions executable. */
export interface SddEngineDeliverable {
  id: string;
  label: string;
  kind: string;
  pathTemplate: string;
  requiredForCompletePackage: boolean;
  purpose: string;
}

export type SddWorkflowOwner = PersonaId | 'architect' | 'developer-delivery';

export interface SddEngineRoleHandoff {
  owner: SddWorkflowOwner;
  deliverableId: string;
  purpose: string;
}

export interface SddEngineDeliverableProfile {
  engineId: SddEngineId;
  supported: boolean;
  deliverables: readonly SddEngineDeliverable[];
  roleHandoffs: readonly SddEngineRoleHandoff[];
  completePackageDeliverableIds: readonly string[];
}

const githubSpecKit: SddEngineDeliverableProfile = {
  engineId: 'github-spec-kit', supported: true,
  deliverables: [
    { id: 'feature-specification', label: 'Feature specification', kind: 'spec', pathTemplate: 'specs/<feature>/spec.md', requiredForCompletePackage: true, purpose: 'User outcomes, requirements, and success criteria.' },
    { id: 'implementation-plan', label: 'Implementation plan', kind: 'plan', pathTemplate: 'specs/<feature>/plan.md', requiredForCompletePackage: true, purpose: 'Technical context and implementation approach.' },
    { id: 'implementation-tasks', label: 'Implementation tasks', kind: 'tasks', pathTemplate: 'specs/<feature>/tasks.md', requiredForCompletePackage: true, purpose: 'Traceable implementation and verification tasks.' },
    { id: 'security-research', label: 'Security research', kind: 'research', pathTemplate: 'specs/<feature>/research.md', requiredForCompletePackage: false, purpose: 'Controls used to produce the implementation plan.' },
  ],
  roleHandoffs: [
    { owner: 'product-manager', deliverableId: 'feature-specification', purpose: 'Approved product scope.' },
    { owner: 'business-analyst', deliverableId: 'feature-specification', purpose: 'Clarified scope and acceptance.' },
    { owner: 'architect', deliverableId: 'implementation-plan', purpose: 'Approved technical design.' },
    { owner: 'developer', deliverableId: 'implementation-plan', purpose: 'Approved technical plan.' },
    { owner: 'developer-delivery', deliverableId: 'implementation-tasks', purpose: 'Executable delivery plan and verification.' },
    { owner: 'security-researcher', deliverableId: 'security-research', purpose: 'Reviewed controls for planning.' },
  ],
  completePackageDeliverableIds: ['feature-specification', 'implementation-plan', 'implementation-tasks'],
};

const unsupportedProfile = (engineId: Exclude<SddEngineId, 'github-spec-kit'>): SddEngineDeliverableProfile => ({ engineId, supported: false, deliverables: [], roleHandoffs: [], completePackageDeliverableIds: [] });

/** Add a verified engine profile here. No persona screen needs to know its
 * filenames or workflow vocabulary. Unsupported engines intentionally fail
 * closed instead of receiving GitHub Spec Kit files under a false label. */
export const sddEngineDeliverableProfiles: Readonly<Record<SddEngineId, SddEngineDeliverableProfile>> = {
  'github-spec-kit': githubSpecKit,
  openspec: unsupportedProfile('openspec'),
  'bmad-method': unsupportedProfile('bmad-method'),
  tessl: unsupportedProfile('tessl'),
  kiro: unsupportedProfile('kiro'),
};

export function sddEngineDeliverableProfile(engineId: SddEngineId | undefined): SddEngineDeliverableProfile {
  return sddEngineDeliverableProfiles[engineId || 'github-spec-kit'];
}

export function sddEngineRoleHandoff(engineId: SddEngineId | undefined, owner: SddWorkflowOwner): { handoff: SddEngineRoleHandoff; deliverable: SddEngineDeliverable } | undefined {
  const profile = sddEngineDeliverableProfile(engineId);
  const handoff = profile.roleHandoffs.find((candidate) => candidate.owner === owner);
  const deliverable = handoff && profile.deliverables.find((candidate) => candidate.id === handoff.deliverableId);
  return handoff && deliverable ? { handoff, deliverable } : undefined;
}
