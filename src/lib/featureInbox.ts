import { FeatureExtractionPackage } from './api/imports';
import { FeatureImportSource, FeatureInboxItem, FunctionalRequirement, ReferenceImage, UserStory } from '../types/speckit';
import { specKitFeatureSlug } from './specKitCompliance';

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
    scope: 'feature',
    title,
    featureKey,
    // Every delivery item owns an official Spec-Kit directory from creation.
    // Keep the human-facing FEAT key separately; it is not a filesystem slug.
    slug: specKitFeatureSlug(title, existingCount + 1),
    summary: extraction.summary?.trim() || 'Imported feature artifacts awaiting review.',
    sourceContent: extraction.sourceContent?.slice(0, 80_000),
    source,
    importedAt: now,
    userStoryIds: (extraction.userStories || []).map((story) => story.id).filter(Boolean),
    requirementIds: (extraction.functionalRequirements || []).map((requirement) => requirement.id).filter(Boolean),
    taskIds: (extraction.tasks || []).map((task) => task.id).filter((id): id is string => Boolean(id)),
  };
}

export function createStoryInboxItem(
  story: UserStory,
  requirements: FunctionalRequirement[],
  source: FeatureImportSource,
  existingCount: number,
  parentFeatureId?: string,
  now = new Date().toISOString(),
  referenceImages: ReferenceImage[] = [],
): FeatureInboxItem {
  const timestamp = Date.parse(now) || Date.now();
  const ordinal = existingCount + 1;
  const deliveryKey = story.id || `US-${String(ordinal).padStart(3, '0')}`;
  const title = story.title.trim() || `${story.id} user story`;
  return {
    id: `story-${timestamp}-${ordinal}`,
    scope: 'user-story',
    primaryStoryId: story.id,
    parentFeatureId,
    title,
    featureKey: deliveryKey,
    slug: specKitFeatureSlug(title, ordinal),
    summary: `As a ${story.asA}, I want to ${story.iWantTo}, so that ${story.soThat}.`,
    source,
    importedAt: now,
    userStoryIds: [story.id],
    requirementIds: requirements.map((requirement) => requirement.id).filter(Boolean),
    taskIds: [],
    referenceImages,
  };
}
