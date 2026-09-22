import { FeatureExtractionPackage } from './api/imports';
import { FeatureImportSource, FeatureInboxItem } from '../types/speckit';
import { slugify } from './projectIdentity';

/** Creates a compact, durable receipt without duplicating full specification artifacts. */
export function createFeatureInboxItem(
  extraction: FeatureExtractionPackage,
  source: FeatureImportSource,
  existingCount: number,
  now = new Date().toISOString(),
): FeatureInboxItem {
  const timestamp = Date.parse(now) || Date.now();
  const title = extraction.title?.trim() || 'Untitled imported feature';
  const featureKey = `FEAT-${new Date(now).getUTCFullYear()}-${existingCount + 1}`;
  return {
    id: `feature-${timestamp}-${existingCount + 1}`,
    title,
    featureKey,
    slug: `${featureKey.toLowerCase()}-${slugify(title)}`,
    summary: extraction.summary?.trim() || 'Imported feature artifacts awaiting review.',
    source,
    importedAt: now,
    userStoryIds: (extraction.userStories || []).map((story) => story.id).filter(Boolean),
    requirementIds: (extraction.functionalRequirements || []).map((requirement) => requirement.id).filter(Boolean),
    taskIds: (extraction.tasks || []).map((task) => task.id).filter((id): id is string => Boolean(id)),
  };
}
