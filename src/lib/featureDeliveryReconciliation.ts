import { SpecKitArtifact } from './connector';
import { isFeatureArtifactScoped } from './featureArtifactScope';
import { parseFeatureDeliveryTasks } from './featureDeliveryTasks';
import { FeatureInboxItem } from '../types/speckit';

/**
 * Select the authoritative delivery artifact for one feature from a connector
 * scan. The saved Studio copy is a cache for offline review, never a reason to
 * ignore a newer `tasks.md` in the feature's registered repository/worktree.
 */
export function currentFeatureDeliveryArtifact(
  feature: FeatureInboxItem | undefined,
  artifacts: SpecKitArtifact[],
): SpecKitArtifact | undefined {
  if (!feature) return undefined;
  const candidates = artifacts.filter((artifact) => (
    artifact.kind === 'tasks'
    && isFeatureArtifactScoped(artifact.content, feature, artifact.path)
    && parseFeatureDeliveryTasks(artifact.content).length > 0
  ));
  if (!candidates.length) return undefined;

  // A known path wins if it is still present. This prevents a newer artifact
  // for a similarly named feature from silently replacing the reviewed plan.
  const savedPath = feature.deliveryPlan?.path;
  const atSavedPath = savedPath && candidates.find((artifact) => artifact.path === savedPath);
  if (atSavedPath) return atSavedPath;
  return candidates.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
}

export function needsFeatureDeliveryReconciliation(
  feature: FeatureInboxItem | undefined,
  artifact: SpecKitArtifact | undefined,
): artifact is SpecKitArtifact {
  if (!artifact) return false;
  return feature?.deliveryPlan?.path !== artifact.path || feature.deliveryPlan.content !== artifact.content;
}
