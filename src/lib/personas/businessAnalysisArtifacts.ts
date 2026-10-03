import { BusinessAnalysisPackage } from '../../types/speckit';
import { BusinessAnalysisArtifactAdapter } from './schema';

type Draft = Omit<BusinessAnalysisPackage, 'schemaVersion' | 'path' | 'preparedAt' | 'acceptedAt' | 'markdown' | 'specKitProjection'>;
const list = (items: string[]) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
export function renderBusinessAnalysisMarkdown(artifact: Draft): string {
  return `# Business analysis: ${artifact.title}\n\n## Problem\n${artifact.problem}\n\n## Stakeholders\n${list(artifact.stakeholders)}\n\n## In scope\n${list(artifact.inScope)}\n\n## Out of scope\n${list(artifact.outOfScope)}\n\n## Acceptance evidence\n${list(artifact.acceptanceEvidence)}\n\n## Assumptions\n${list(artifact.assumptions)}\n\n## Open questions\n${list(artifact.openQuestions)}`;
}
/** Engine-shaped projection; the business-analysis markdown stays a richer
 * companion artifact and is never substituted for the official spec.md. */
export function renderBusinessAnalysisSpecKitProjection(artifact: Draft): string {
  const criteria = artifact.acceptanceEvidence.length ? artifact.acceptanceEvidence.map((item) => `- ${item}`).join('\n') : '- Review the recorded business evidence.';
  return `# Feature Specification: ${artifact.title}\n\n## Summary\n${artifact.problem}\n\n## User Scenarios & Testing\n### User Story 1 - ${artifact.title} (Priority: P1)\nAs a ${artifact.stakeholders[0] || 'stakeholder'}, I want the in-scope outcome, so that the business problem is resolved.\n\n**Acceptance Scenarios**:\n${criteria}\n\n## Requirements\n### Functional Requirements\n${artifact.inScope.map((item, index) => `- **FR-${String(index + 1).padStart(3, '0')}**: The feature MUST ${item}`).join('\n')}\n\n## Success Criteria\n### Measurable Outcomes\n${criteria}\n\n## Assumptions and Open Questions\n${list([...artifact.assumptions, ...artifact.openQuestions])}${artifact.outOfScope.length ? `\n\n## Out of Scope\n${list(artifact.outOfScope)}` : ''}`;
}
export function businessAnalysisIssue(artifact: Draft): string | undefined {
  if (!artifact.problem.trim()) return 'Describe the business problem before preparing the handoff.';
  if (!artifact.inScope.some(Boolean)) return 'Record at least one in-scope outcome.';
  if (!artifact.acceptanceEvidence.some(Boolean)) return 'State at least one piece of acceptance evidence.';
  return undefined;
}
export function createBusinessAnalysisDraft(title: string, summary: string, scope: 'feature' | 'user-story', path: string, now: string): BusinessAnalysisPackage {
  const base: Draft = { title, scope, problem: summary.trim() || `Clarify the business problem for ${title}.`, stakeholders: [], inScope: [`Deliver the reviewed outcome for ${title}.`], outOfScope: [], acceptanceEvidence: ['A reviewer can trace the delivery plan to the in-scope outcome and acceptance evidence.'], assumptions: ['Existing requirements accurately represent the requested outcome.'], openQuestions: [] };
  const markdown = renderBusinessAnalysisMarkdown(base);
  return { schemaVersion: 1, path, ...base, preparedAt: now, markdown, specKitProjection: { kind: 'spec', path: `specs/${path.split('/')[1] || 'feature'}/spec.md`, content: renderBusinessAnalysisSpecKitProjection(base) } };
}
export const businessAnalysisArtifactAdapter: BusinessAnalysisArtifactAdapter = { personaId: 'business-analyst', artifactLabel: 'Business analysis package', parse: () => undefined, render: (artifact) => artifact.markdown, toEngineArtifact: (artifact) => artifact.specKitProjection };
