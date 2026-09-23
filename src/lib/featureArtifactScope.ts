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
  const normalizedPath = artifactPath?.replace(/\\/g, '/').toLowerCase() || '';
  const haystack = `${normalizedPath}\n${content}`.toLowerCase();

  // Imported repositories frequently retain an official directory such as
  // specs/001-enhance-tenant-details-ui/ while Studio's display title has
  // later been edited. The durable feature slug is therefore a valid path
  // identity, provided it matches a directory under specs/ rather than a
  // workspace-wide artifact with a similar name.
  const slugTerms = (feature.slug || '')
    .toLowerCase()
    .match(/[a-z0-9]{4,}/g) || [];
  const featureDirectory = normalizedPath.match(/(?:^|\/)specs\/([^/]+)\//)?.[1] || '';
  if (featureDirectory && slugTerms.length > 0) {
    const matchedSlugTerms = slugTerms.filter((term) => featureDirectory.includes(term));
    if (matchedSlugTerms.length >= Math.min(2, slugTerms.length)) return true;
  }

  const terms = feature.title.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  return terms.filter((term) => haystack.includes(term)).length >= Math.min(2, terms.length);
}
