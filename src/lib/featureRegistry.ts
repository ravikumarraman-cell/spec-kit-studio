import { FeatureInboxItem, SpecKitProject } from '../types/speckit';
import { featureArtifactRoot } from './projectIdentity';

export type FeatureLifecycle = 'draft' | 'planned' | 'implementing' | 'verifying' | 'handed-off';
export interface FeatureRegistryEntry { feature: FeatureInboxItem; lifecycle: FeatureLifecycle; artifactRoot: string; conflicts: string[]; }

export function featureLifecycle(feature: FeatureInboxItem): FeatureLifecycle {
  if (feature.implementationReceipts?.length) return 'implementing';
  if (feature.deliveryPlan?.acceptedAt) return 'planned';
  return 'draft';
}

function overlaps(left: string, right: string): boolean {
  const a = left.replace(/^\.\//, '').replace(/\/$/, '');
  const b = right.replace(/^\.\//, '').replace(/\/$/, '');
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

/** Reports only declared path overlap—never guesses from LLM prose. */
export function buildFeatureRegistry(project: SpecKitProject): FeatureRegistryEntry[] {
  const features = project.featureInbox || [];
  return features.map((feature) => {
    const conflicts: string[] = [];
    for (const other of features) {
      if (other.id === feature.id) continue;
      for (const ownPath of feature.allowedSourceRoots || []) for (const otherPath of other.allowedSourceRoots || []) {
        if (overlaps(ownPath, otherPath)) conflicts.push(`${other.featureKey || other.title}: overlapping declared path ${ownPath} ↔ ${otherPath}`);
      }
    }
    return { feature, lifecycle: featureLifecycle(feature), artifactRoot: featureArtifactRoot(feature), conflicts: [...new Set(conflicts)] };
  });
}
