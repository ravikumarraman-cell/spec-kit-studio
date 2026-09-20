import { FeatureInboxItem } from '../types/speckit';

/**
 * Stops a repository-wide plan/tasks file being presented as feature evidence.
 * We deliberately require two meaningful words from the feature title so a
 * generic workspace artifact cannot advance a feature journey by accident.
 */
export function isFeatureArtifactScoped(content: string | undefined, feature: FeatureInboxItem | undefined) {
  if (!content || !feature) return false;
  const haystack = content.toLowerCase();
  const terms = feature.title.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  return terms.filter((term) => haystack.includes(term)).length >= Math.min(2, terms.length);
}
