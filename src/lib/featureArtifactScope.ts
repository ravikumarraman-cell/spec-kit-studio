import { FeatureInboxItem } from '../types/speckit';

/**
 * Stops a repository-wide plan/tasks file being presented as feature evidence.
 * We deliberately require two meaningful words from the feature title so a
 * generic workspace artifact cannot advance a feature journey by accident.
 */
export function isFeatureArtifactScoped(content: string | undefined, feature: FeatureInboxItem | undefined, artifactPath?: string) {
  if (!content || !feature) return false;
  // The official Spec-Kit namespace is part of the artifact's identity:
  // specs/<feature-slug>/tasks.md is feature-scoped even if individual task
  // lines use only requirement IDs. Evaluate both the durable path and text.
  const haystack = `${artifactPath || ''}\n${content}`.toLowerCase();
  const terms = feature.title.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  return terms.filter((term) => haystack.includes(term)).length >= Math.min(2, terms.length);
}
