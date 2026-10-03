import { FeatureInboxItem } from '../types/speckit';
import { deliveryScope } from './deliveryItems';

const isCanonicalSpecKitFeatureSlug = (value: string | undefined) => /^\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value || '');

function normalizedArtifactPath(artifactPath?: string) {
  return artifactPath?.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase() || '';
}

/** Exact canonical path ownership used before an artifact can be reviewed. */
export function isExpectedFeatureArtifactPath(feature: FeatureInboxItem | undefined, artifactPath: string | undefined, kind: 'spec' | 'plan' | 'tasks') {
  if (!feature || !isCanonicalSpecKitFeatureSlug(feature.slug)) return false;
  return normalizedArtifactPath(artifactPath) === `specs/${feature.slug!.toLowerCase()}/${kind}.md`;
}

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
  const normalizedPath = normalizedArtifactPath(artifactPath);
  const haystack = `${normalizedPath}\n${content}`.toLowerCase();
  const pathDirectory = featureDirectoryFromPath(normalizedPath);
  // A canonical identity plus a repository path is conclusive. Never use a
  // title match from another feature directory as delivery evidence.
  if (normalizedPath && isCanonicalSpecKitFeatureSlug(feature.slug)) {
    return pathDirectory === feature.slug!.toLowerCase();
  }
  if (deliveryScope(feature) === 'user-story' && feature.primaryStoryId) {
    const expectedRoot = feature.slug?.toLowerCase();
    if (expectedRoot && featureDirectoryFromPath(normalizedPath) === expectedRoot) return true;
    if (!haystack.includes(feature.primaryStoryId.toLowerCase())) return false;
  }

  // Imported repositories frequently retain an official directory such as
  // specs/001-enhance-tenant-details-ui/ while Studio's display title has
  // later been edited. The durable feature slug is therefore a valid path
  // identity, provided it matches a directory under specs/ rather than a
  // workspace-wide artifact with a similar name.
  const slugTerms = (feature.slug || '')
    .toLowerCase()
    .match(/[a-z0-9]{4,}/g) || [];
  if (pathDirectory && slugTerms.length > 0) {
    const matchedSlugTerms = slugTerms.filter((term) => pathDirectory.includes(term));
    if (matchedSlugTerms.length >= Math.min(2, slugTerms.length)) return true;
  }

  const terms = feature.title.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
  if (!terms.length) return false;
  return terms.filter((term) => haystack.includes(term)).length >= Math.min(2, terms.length);
}

function featureDirectoryFromPath(normalizedPath: string) {
  return normalizedPath.match(/(?:^|\/)specs\/([^/]+)\//)?.[1] || '';
}
