import { FeatureImplementationReceipt, SpecKitProject } from '../types/speckit';

/**
 * Retain a receipt on the feature that produced it. Never use inbox order as
 * an identity: users can import more than one feature into a workspace.
 */
export function recordFeatureImplementationReceipt(
  project: SpecKitProject,
  featureId: string,
  receipt: FeatureImplementationReceipt,
): SpecKitProject {
  let foundFeature = false;
  const featureInbox = (project.featureInbox || []).map((feature) => {
    if (feature.id !== featureId) return feature;
    foundFeature = true;
    return {
      ...feature,
      implementationReceipts: [
        ...(feature.implementationReceipts || []).filter((existing) => existing.taskId !== receipt.taskId),
        receipt,
      ],
    };
  });
  return foundFeature ? { ...project, featureInbox } : project;
}
