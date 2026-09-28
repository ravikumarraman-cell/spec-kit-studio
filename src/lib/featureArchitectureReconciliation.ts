import { SpecKitArtifact } from './connector';
import { isFeatureArtifactScoped } from './featureArtifactScope';
import { FeatureInboxItem } from '../types/speckit';

/** Select the official plan for a feature; a registered worktree is authoritative. */
export function currentFeatureArchitectureArtifact(feature: FeatureInboxItem | undefined, artifacts: SpecKitArtifact[]): SpecKitArtifact | undefined {
  if (!feature) return undefined;
  const candidates = artifacts.filter((artifact) => artifact.kind === 'plan' && isFeatureArtifactScoped(artifact.content, feature, artifact.path));
  if (!candidates.length) return undefined;
  const savedPath = feature.architecturePlan?.path;
  return (savedPath && candidates.find((artifact) => artifact.path === savedPath)) || candidates.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
}

export function needsFeatureArchitectureReconciliation(feature: FeatureInboxItem | undefined, artifact: SpecKitArtifact | undefined): artifact is SpecKitArtifact {
  return Boolean(artifact && (feature?.architecturePlan?.path !== artifact.path || feature.architecturePlan.content !== artifact.content));
}
