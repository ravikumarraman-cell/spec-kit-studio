import { FeatureExtractionPackage } from './api/imports';
import { FunctionalRequirement, UserStory } from '../types/speckit';

/** Converts the stable, human-readable parts of an official Spec-Kit spec into
 * Studio's editable feature model. The original Markdown remains in the repo. */
export function parseSpecKitArtifact(markdown: string): FeatureExtractionPackage {
  const title = markdown.match(/^#\s+(?:Feature Specification:\s*)?(.+)$/m)?.[1]?.trim() || 'Imported Spec-Kit feature';
  const summary = markdown.match(/##\s+Problem Statement\s*\n+([\s\S]*?)(?=\n##\s|$)/i)?.[1]?.trim() || '';
  const storyBlocks = [...markdown.matchAll(/^###\s+User Story\s+(\d+)\s*-\s*(.+?)(?=\n###\s+User Story|\n###\s+(?!User Story)|\n##\s|(?![\s\S]))/gims)];
  const userStories: UserStory[] = storyBlocks.map((match, index) => {
    const body = match[0];
    const statement = body.match(/As\s+(?:an?\s+)?(.+?),\s*I want\s+to\s+(.+?),\s*so that\s+(.+?)(?:\.|\n)/is);
    const acceptance = body.match(/\*\*Acceptance Scenarios\*\*:\s*\n([\s\S]*?)(?=\n\*\*|$)/i)?.[1] || '';
    const criteria = [...acceptance.matchAll(/^\s*\d+\.\s+(.+)$/gm)].map((item) => item[1].trim());
    return {
      id: `US-${String(index + 1).padStart(3, '0')}`,
      title: match[2].trim(), priority: /Priority:\s*P1/i.test(body) ? 'High' : /Priority:\s*P2/i.test(body) ? 'Medium' : 'Low',
      asA: statement?.[1]?.trim() || 'a user', iWantTo: statement?.[2]?.trim() || match[2].trim(),
      soThat: statement?.[3]?.trim() || 'the feature delivers its intended outcome', acceptanceCriteria: criteria,
    };
  });
  const requirementSection = markdown.match(/###\s+Functional Requirements\s*\n([\s\S]*?)(?=\n###\s|\n##\s|(?![\s\S]))/i)?.[1] || '';
  const functionalRequirements: FunctionalRequirement[] = [...requirementSection.matchAll(/^\s*-\s*\*\*(FR-\d+)\*\*:\s*(.+)$/gm)].map((match) => ({
    id: match[1], title: match[2].replace(/\b(MUST|SHOULD|MAY)\b.*$/i, '').trim() || match[1], description: match[2].trim(), category: 'Core', priority: 'High',
  }));
  return { title, summary, userStories, functionalRequirements };
}
