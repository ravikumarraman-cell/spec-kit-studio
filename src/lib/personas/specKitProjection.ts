import { FeatureInboxItem, SpecKitProject } from '../../types/speckit';
import { SpecKitConformanceArtifact, SpecKitCoreArtifactKind } from '../specKitCompliance';
import { validateSddEngineArtifacts } from '../sddEngineWorkflow';
import { sddEngineDeliverableProfile } from '../sddEngineDeliverables';

/** Persona packages remain Studio companion evidence. Only a validated engine
 * projection may occupy an engine-owned artifact slot. The active adapter is
 * GitHub Spec Kit today; this boundary is intentionally engine-agnostic. */
export function engineProjectionIssue(project: SpecKitProject, feature: FeatureInboxItem, projection: SpecKitConformanceArtifact): string | undefined {
  const profile = sddEngineDeliverableProfile(project.sddEngine);
  const declared = profile.deliverables.some((artifact) => artifact.kind === projection.kind && projection.path === artifact.pathTemplate.replace('<feature>', feature.slug || ''));
  if (!declared) return 'This deliverable does not map to the selected engine artifact contract.';
  if (projection.kind === 'research') return undefined;
  return validateSddEngineArtifacts(project, feature, [projection], [projection.kind as SpecKitCoreArtifactKind])[0]?.message;
}
