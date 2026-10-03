import { FeatureInboxItem, SpecKitProject } from '../types/speckit';

/**
 * Implementation is intentionally more restrictive than read-only planning:
 * a feature may only write inside the linked worktree registered for it.
 */
export function featureImplementationWorkspace(feature: FeatureInboxItem | undefined): string | null {
  const path = feature?.worktreePath?.trim();
  return path || null;
}

export function featureImplementationBlocker(project: SpecKitProject, feature: FeatureInboxItem | undefined): string | null {
  if (!feature) return 'Choose an imported feature before implementation.';
  if (!project.importedRepo?.repoUrl) return 'Connect and scan the repository before implementation.';
  if (!featureImplementationWorkspace(feature)) return 'Create this feature’s isolated Git worktree before running an implementation task. Studio will never run Codex in the shared checkout.';
  return null;
}
