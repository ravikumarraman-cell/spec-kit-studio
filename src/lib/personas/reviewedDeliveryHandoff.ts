import { FeatureInboxItem, FunctionalRequirement, SpecKitProject, UserStory } from '../../types/speckit';
import { requirementsForDeliveryItem } from '../deliveryItems';

export const REVIEWED_DELIVERY_MANIFEST = 'studio-reviewed-delivery-handoff.json';
export const REVIEWED_DELIVERY_PATH = 'handoff/reviewed-delivery.md';
export const REVIEWED_DELIVERY_SOURCE_PATH = 'source/imported-source.md';
export const REVIEWED_DELIVERY_STORIES_PATH = 'evidence/user-stories.md';
export const REVIEWED_DELIVERY_REQUIREMENTS_PATH = 'evidence/functional-requirements.md';

export interface ReviewedDeliveryHandoffPackage {
  path: string;
  markdown: string;
  sourcePath?: string;
  sourceContent?: string;
  storiesPath: string;
  storiesMarkdown: string;
  requirementsPath: string;
  requirementsMarkdown: string;
  specificationPath?: string;
  specificationContent?: string;
  /** Structured scope is retained alongside the human-readable Markdown so a
   * receiving workspace can restore traceability, not merely display it. */
  userStories: UserStory[];
  functionalRequirements: FunctionalRequirement[];
  archivePaths: string[];
}

function userStoriesMarkdown(stories: readonly UserStory[]): string {
  return `# Reviewed user stories\n\n${stories.length ? stories.map((story) => `## ${story.id}: ${story.title}\n\nAs a ${story.asA}\n\nI want to ${story.iWantTo}\n\nSo that ${story.soThat}\n\n### Acceptance criteria\n${story.acceptanceCriteria.length ? story.acceptanceCriteria.map((criterion) => `- ${criterion}`).join('\n') : '- No acceptance criteria recorded.'}`).join('\n\n') : 'No user stories are attached to this delivery.'}\n`;
}

function requirementsMarkdown(requirements: readonly FunctionalRequirement[]): string {
  return `# Reviewed functional requirements\n\n${requirements.length ? requirements.map((requirement) => `- **${requirement.id}: ${requirement.title}** (${requirement.category}, ${requirement.priority}) — ${requirement.description}`).join('\n') : 'No functional requirements are attached to this delivery.'}\n`;
}

/** Build the inspectable package for a PM-reviewed imported delivery. It is
 * intentionally not presented as a fabricated Product Brief: it preserves the
 * source and the PM's explicit decision exactly as reviewed. */
export function reviewedDeliveryHandoffPackage(project: SpecKitProject, feature: FeatureInboxItem): ReviewedDeliveryHandoffPackage {
  const stories = project.spec.userStories.filter((story) => feature.userStoryIds.includes(story.id));
  const requirements = requirementsForDeliveryItem(project, feature);
  const decision = feature.productManagerDecision;
  const sourceContent = feature.sourceContent?.trim();
  const markdown = `# Reviewed delivery handoff: ${feature.title}\n\n## Product Manager decision\n\nStatus: ${decision?.status || 'accepted'}\nRecorded: ${decision?.recordedAt || feature.importedAt}\n${decision?.reason ? `Reason: ${decision.reason}\n` : ''}\n## Delivery scope\n\n${feature.summary}\n\n- Source: ${feature.source}\n- User stories: ${stories.length}\n- Functional requirements: ${requirements.length}\n\n## Included evidence\n\n- [User stories](${REVIEWED_DELIVERY_STORIES_PATH})\n- [Functional requirements](${REVIEWED_DELIVERY_REQUIREMENTS_PATH})${sourceContent ? `\n- [Imported source](${REVIEWED_DELIVERY_SOURCE_PATH})` : ''}\n\nThis package records a Product Manager review of an already-structured delivery. It is reviewable context for the receiving Developer / Architect; it does not start repository work or authorize implementation.\n`;
  const specification: { path: string; content: string; acceptedAt?: string } | undefined = feature.specification?.acceptedAt && feature.specification.path && feature.specification.content
    ? { path: feature.specification.path, content: feature.specification.content, acceptedAt: feature.specification.acceptedAt }
    : undefined;
  const packageFiles = [REVIEWED_DELIVERY_MANIFEST, 'README.md', REVIEWED_DELIVERY_PATH, REVIEWED_DELIVERY_STORIES_PATH, REVIEWED_DELIVERY_REQUIREMENTS_PATH, ...(specification ? [specification.path] : [])];
  if (sourceContent) packageFiles.push(REVIEWED_DELIVERY_SOURCE_PATH);
  return {
    path: REVIEWED_DELIVERY_PATH,
    markdown,
    sourcePath: sourceContent ? REVIEWED_DELIVERY_SOURCE_PATH : undefined,
    sourceContent,
    storiesPath: REVIEWED_DELIVERY_STORIES_PATH,
    storiesMarkdown: userStoriesMarkdown(stories),
    requirementsPath: REVIEWED_DELIVERY_REQUIREMENTS_PATH,
    requirementsMarkdown: requirementsMarkdown(requirements),
    specificationPath: specification?.path,
    specificationContent: specification?.content,
    userStories: stories,
    functionalRequirements: requirements,
    archivePaths: packageFiles,
  };
}
