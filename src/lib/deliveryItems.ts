import { DeliveryScope, FeatureInboxItem, FunctionalRequirement, SpecKitProject, UserStory } from '../types/speckit';

export function deliveryScope(item: FeatureInboxItem): DeliveryScope {
  return item.scope === 'user-story' ? 'user-story' : 'feature';
}

export function activeDeliveryItemForProject(project: SpecKitProject): FeatureInboxItem | undefined {
  const items = project.featureInbox || [];
  const selectedId = project.journey?.featureId;
  return items.find((item) => item.id === selectedId) || items.at(-1);
}

export function primaryStoryForItem(project: SpecKitProject, item: FeatureInboxItem): UserStory | undefined {
  if (deliveryScope(item) !== 'user-story' || !item.primaryStoryId) return undefined;
  return project.spec.userStories.find((story) => story.id === item.primaryStoryId);
}

export function requirementsForDeliveryItem(project: SpecKitProject, item: FeatureInboxItem): FunctionalRequirement[] {
  const ids = new Set(item.requirementIds);
  return project.spec.functionalRequirements.filter((requirement) => ids.has(requirement.id));
}

export function deliveryItemLabel(item: FeatureInboxItem): string {
  return deliveryScope(item) === 'user-story' ? 'User story' : 'Feature';
}

export function validateDeliveryItem(project: SpecKitProject, item: FeatureInboxItem): string[] {
  if (deliveryScope(item) === 'feature') return [];
  const issues: string[] = [];
  if (!item.primaryStoryId) issues.push('The story journey has no primary story.');
  if (item.userStoryIds.length !== 1 || item.userStoryIds[0] !== item.primaryStoryId) issues.push('The story journey must own exactly its primary story.');
  if (!primaryStoryForItem(project, item)) issues.push('The primary story is not present in the workspace specification.');
  const knownRequirements = new Set(project.spec.functionalRequirements.map((requirement) => requirement.id));
  if (item.requirementIds.some((id) => !knownRequirements.has(id))) issues.push('One or more story requirements are missing from the workspace specification.');
  return issues;
}