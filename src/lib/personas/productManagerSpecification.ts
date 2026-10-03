import { FeatureInboxItem, FunctionalRequirement, PersonaDecisionReceipt, ProductOutcomePackage, SpecKitProject, UserStory } from '../../types/speckit';
import { requirementsForDeliveryItem } from '../deliveryItems';
import { renderProductOutcomeSpecKitProjection } from './productManagerArtifacts';

export interface AcceptedProductSpecification { path: string; content: string; acceptedAt: string; }

/** Recover durable requirement records from the canonical Spec-Kit artifact.
 * This is deliberately narrow: only explicit `FR-*` lines are recovered, so
 * prose or recommendations can never become silently invented requirements. */
export function requirementsFromCanonicalSpecification(content: string): FunctionalRequirement[] {
  const requirements: FunctionalRequirement[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(/^\s*-\s+\*\*(FR-[A-Za-z0-9-]+)\*\*\s*:\s*(.+?)\s*$/gm)) {
    const id = match[1].toUpperCase();
    const description = match[2].trim();
    if (!id || !description || seen.has(id)) continue;
    seen.add(id);
    requirements.push({ id, title: description.replace(/^(System\s+MUST|The feature\s+MUST)\s+/i, '').slice(0, 96) || id, description, category: 'Core', priority: 'High' });
  }
  return requirements;
}

/** Recover only explicitly declared Spec-Kit user stories from a canonical
 * specification. Legacy archives can be made whole without turning narrative
 * text into fabricated delivery scope. */
export function storiesFromCanonicalSpecification(content: string): UserStory[] {
  const stories: UserStory[] = [];
  const seen = new Set<string>();
  for (const match of content.matchAll(/^### User Story (\d+) - (.+?) \(Priority: (P[123])\)\s*\n+As a (.+?), I want to (.+?), so that (.+?)\.(?:[\s\S]*?)(?=^### |^## |(?![\s\S]))/gm)) {
    const [, ordinal, title, priorityCode, asA, iWantTo, soThat] = match;
    const id = `US-${ordinal.padStart(3, '0')}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const independentTest = match[0].match(/\*\*Independent Test\*\*:\s*(.+)/)?.[1]?.trim();
    stories.push({
      id,
      title: title.trim(),
      priority: priorityCode === 'P1' ? 'High' : priorityCode === 'P2' ? 'Medium' : 'Low',
      asA: asA.trim(),
      iWantTo: iWantTo.trim(),
      soThat: soThat.trim(),
      acceptanceCriteria: independentTest ? [independentTest] : [],
    });
  }
  return stories;
}

function canonicalSpecPath(feature: FeatureInboxItem): string {
  if (!feature.slug) throw new Error('A Product Manager specification requires a feature slug.');
  return `specs/${feature.slug}/spec.md`;
}

/** Bind the accepted PM outcome to the feature-owned, canonical Spec Kit path.
 * The product brief remains valuable context, but `spec.md` is the engine input. */
export function specificationFromProductOutcome(feature: FeatureInboxItem, outcome: ProductOutcomePackage, acceptedAt: string): AcceptedProductSpecification {
  return { path: canonicalSpecPath(feature), content: renderProductOutcomeSpecKitProjection(outcome), acceptedAt };
}

/** Structured imports do not have a separate Product Brief. On acceptance, turn
 * their reviewed stories and requirements into the same canonical Spec Kit input. */
export function specificationFromReviewedDelivery(project: SpecKitProject, feature: FeatureInboxItem, decision: PersonaDecisionReceipt): AcceptedProductSpecification {
  const stories = project.spec.userStories.filter((story) => feature.userStoryIds.includes(story.id));
  const requirements = requirementsForDeliveryItem(project, feature);
  const userScenarios = stories.length
    ? stories.map((story, index) => {
      const priority = story.priority === 'High' ? 'P1' : story.priority === 'Medium' ? 'P2' : 'P3';
      const scenarios = story.acceptanceCriteria.length
        ? story.acceptanceCriteria.map((criterion, criterionIndex) => `${criterionIndex + 1}. **Given** the relevant user can access the feature, **When** they ${story.iWantTo}, **Then** ${criterion.replace(/[.]$/, '')}.`).join('\n')
        : `1. **Given** the relevant user can access the feature, **When** they complete this story, **Then** the stated outcome is verifiable.`;
      return `### User Story ${index + 1} - ${story.title} (Priority: ${priority})\n\nAs a ${story.asA}, I want to ${story.iWantTo}, so that ${story.soThat}.\n\n**Why this priority**: This story is included in the reviewed delivery scope.\n\n**Independent Test**: ${story.acceptanceCriteria[0] || `Verify ${story.title} independently.`}\n\n**Acceptance Scenarios**:\n\n${scenarios}`;
    }).join('\n\n')
    : `### User Story 1 - ${feature.title} (Priority: P1)\n\nAs a delivery stakeholder, I want ${feature.summary || 'the reviewed outcome'}, so that the imported delivery can be verified.\n\n**Acceptance Scenarios**:\n\n1. **Given** the reviewed scope is available, **When** the feature is completed, **Then** the recorded outcome is independently verifiable.`;
  const functionalRequirements = requirements.length
    ? requirements.map((requirement) => `- **${requirement.id}**: System MUST ${requirement.description.replace(/[.]$/, '')}.`).join('\n')
    : '- **FR-001**: System MUST deliver the reviewed feature outcome.';
  const successCriteria = stories.flatMap((story) => story.acceptanceCriteria).length
    ? stories.flatMap((story) => story.acceptanceCriteria).map((criterion, index) => `- **SC-${String(index + 1).padStart(3, '0')}**: ${criterion}`).join('\n')
    : '- **SC-001**: The reviewed feature outcome is independently verifiable.';
  return {
    path: canonicalSpecPath(feature), acceptedAt: decision.recordedAt,
    content: `# Feature Specification: ${feature.title}\n\n**Feature Branch**: \`${feature.slug}\`\n**Created**: ${feature.importedAt.slice(0, 10)}\n**Status**: Accepted\n**Input**: Reviewed imported delivery${feature.sourceContent ? ' with retained source context' : ''}.\n\n## Summary\n${feature.summary || 'Reviewed delivery scope.'}\n\n## User Scenarios & Testing\n\n${userScenarios}\n\n### Edge Cases\n\n- Unavailable dependencies must not produce a partial result.\n- Behavior outside the reviewed scope remains unchanged.\n\n## Requirements\n\n### Functional Requirements\n\n${functionalRequirements}\n\n## Success Criteria\n\n### Measurable Outcomes\n\n${successCriteria}\n\n## Review Record\n\n- Product Manager decision: accepted on ${decision.recordedAt}${decision.reason ? ` — ${decision.reason}` : ''}.\n`,
  };
}
