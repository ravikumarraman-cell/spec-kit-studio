import { FeatureInboxItem, FunctionalRequirement, UserStory } from '../types/speckit';

export interface FeatureStoryGroup {
  id: string;
  label: string;
  description: string;
  imported: boolean;
  stories: UserStory[];
}

/** Groups shared-spec stories by their durable import receipt without changing story data. */
export function groupStoriesByFeature(stories: UserStory[], inbox: FeatureInboxItem[] = []): FeatureStoryGroup[] {
  const claimed = new Set<string>();
  const imported = inbox.map((item) => {
    const ids = new Set(item.userStoryIds);
    const groupedStories = stories.filter((story) => ids.has(story.id));
    groupedStories.forEach((story) => claimed.add(story.id));
    return { id: item.id, label: item.title, description: item.summary, imported: true, stories: groupedStories };
  }).filter((group) => group.stories.length > 0);
  const workspaceStories = stories.filter((story) => !claimed.has(story.id));
  return workspaceStories.length ? [{ id: 'workspace-stories', label: 'Existing workspace stories', description: 'Stories that predate a tracked import or were created directly in Studio.', imported: false, stories: workspaceStories }, ...imported] : imported;
}

export interface FeatureRequirementGroup {
  id: string;
  label: string;
  description: string;
  imported: boolean;
  requirements: FunctionalRequirement[];
}

export function groupRequirementsByFeature(requirements: FunctionalRequirement[], inbox: FeatureInboxItem[] = []): FeatureRequirementGroup[] {
  const claimed = new Set<string>();
  const imported = inbox.map((item) => {
    const ids = new Set(item.requirementIds);
    const groupedRequirements = requirements.filter((requirement) => ids.has(requirement.id));
    groupedRequirements.forEach((requirement) => claimed.add(requirement.id));
    return { id: item.id, label: item.title, description: item.summary, imported: true, requirements: groupedRequirements };
  }).filter((group) => group.requirements.length > 0);
  const workspaceRequirements = requirements.filter((requirement) => !claimed.has(requirement.id));
  return workspaceRequirements.length ? [{ id: 'workspace-requirements', label: 'Existing workspace requirements', description: 'Requirements that predate a tracked import or were created directly in Studio.', imported: false, requirements: workspaceRequirements }, ...imported] : imported;
}
