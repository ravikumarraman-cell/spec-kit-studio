import { DeveloperArchitecturePackage } from '../../types/speckit';
import { DeveloperArchitectureArtifactAdapter } from './schema';

type DraftInput = Pick<DeveloperArchitecturePackage, 'title' | 'outcome' | 'scope' | 'selectedRequirementIds' | 'changeSurface' | 'options' | 'selectedOptionId' | 'rationale' | 'guardrails' | 'risks' | 'verification' | 'rollout' | 'rollback' | 'openQuestions'>;

const list = (items: string[]) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';

/** Pure rendering keeps the persona portable: UI, export, and Journey all use
 * the same bounded decision package rather than reconstructing it separately. */
export function renderDeveloperArchitectureMarkdown(artifact: DraftInput): string {
  const selected = artifact.options.find((option) => option.id === artifact.selectedOptionId);
  return `# Technical decision: ${artifact.title}\n\n## Outcome\n${artifact.outcome}\n\n## Scope\n${artifact.scope === 'user-story' ? 'Single user story' : 'Feature'}\n\n## Change surface\n${artifact.changeSurface.length ? artifact.changeSurface.map((item) => `- ${item.id} [${item.confidence}]: ${item.area} — ${item.change}`).join('\n') : '- None recorded.'}\n\n## Options considered\n${artifact.options.map((option) => `- ${option.id}: ${option.title} — ${option.summary} Trade-offs: ${option.tradeoffs}`).join('\n') || '- None recorded.'}\n\n## Selected approach\n${selected ? `${selected.id}: ${selected.title}` : 'Not selected'}\n\n## Rationale\n${artifact.rationale}\n\n## Developer guardrails\n${list(artifact.guardrails)}\n\n## Risks and mitigations\n${artifact.risks.length ? artifact.risks.map((risk) => `- ${risk.id}: ${risk.risk} → ${risk.mitigation}`).join('\n') : '- None recorded.'}\n\n## Verification\n${list(artifact.verification)}\n\n## Rollout\n${artifact.rollout}\n\n## Rollback\n${artifact.rollback}\n\n## Open questions\n${list(artifact.openQuestions)}`;
}

/** Canonical GitHub Spec Kit plan.md projection. The decision package remains
 * available as a Studio companion, while the engine receives its template
 * headings and planning gates. */
export function renderDeveloperArchitectureSpecKitProjection(artifact: DraftInput): string {
  const selected = artifact.options.find((option) => option.id === artifact.selectedOptionId);
  return `# Implementation Plan: ${artifact.title}\n\n## Summary\n${artifact.outcome}\n\n## Technical Context\n- Selected approach: ${selected ? `${selected.id} — ${selected.title}` : 'Not selected'}\n- Requirements in scope: ${artifact.selectedRequirementIds.join(', ') || 'To be confirmed'}\n- Verification: ${artifact.verification.join('; ') || 'To be defined'}\n\n## Constitution Check\n${list(artifact.guardrails)}\n\n## Project Structure\n- Affected areas: ${artifact.changeSurface.map((item) => item.area).filter(Boolean).join(', ') || 'To be confirmed from repository evidence'}\n\n## Detailed Design Decisions\n${renderDeveloperArchitectureMarkdown(artifact)}\n\n## Risks, Rollout, and Rollback\n- Risks: ${artifact.risks.map((risk) => `${risk.risk} (${risk.mitigation})`).join('; ') || 'None recorded.'}\n- Rollout: ${artifact.rollout}\n- Rollback: ${artifact.rollback}`;
}

export function developerArchitectureIssue(artifact: DraftInput): string | undefined {
  if (!artifact.outcome.trim()) return 'Describe the intended technical outcome.';
  if (!artifact.changeSurface.some((item) => item.area.trim() && item.change.trim())) return 'Record at least one affected area and expected change.';
  if (!artifact.options.some((option) => option.id === artifact.selectedOptionId)) return 'Choose one technical approach.';
  if (!artifact.rationale.trim()) return 'Explain why the selected approach fits the constraints.';
  if (!artifact.guardrails.some(Boolean)) return 'Add at least one developer guardrail.';
  if (!artifact.verification.some(Boolean)) return 'State how developers will verify the decision.';
  return undefined;
}

export function createDeveloperArchitectureDraft(title: string, summary: string, scope: 'feature' | 'user-story', selectedRequirementIds: string[], path: string, now: string): DeveloperArchitecturePackage {
  const base: DraftInput = {
    title,
    outcome: summary.trim() || `Deliver ${title} safely within the reviewed scope.`,
    scope,
    selectedRequirementIds,
    changeSurface: [{ id: 'CS-1', area: 'Application boundary', change: 'Confirm the smallest affected component, contract, or workflow.', confidence: 'assumption' }],
    options: [{ id: 'OPT-1', title: 'Smallest compatible change', summary: 'Extend the existing design before introducing a new subsystem.', tradeoffs: 'May expose an existing limitation that needs explicit review.' }],
    selectedOptionId: 'OPT-1',
    rationale: 'Start with the smallest compatible change until repository evidence shows a broader design is needed.',
    guardrails: ['Preserve existing public behavior unless the reviewed scope explicitly changes it.'],
    risks: [{ id: 'R-1', risk: 'Repository assumptions may be incomplete.', mitigation: 'Validate the affected files and contracts before implementation.' }],
    verification: ['Map each delivery task to an in-scope requirement and run the relevant focused checks.'],
    rollout: 'Use the existing release process; confirm operational impact during delivery planning.',
    rollback: 'Revert the bounded change through the normal reviewed repository workflow if verification or rollout signals fail.',
    openQuestions: [],
  };
  const markdown = renderDeveloperArchitectureMarkdown(base);
  return { schemaVersion: 1, path, ...base, preparedAt: now, markdown, specKitProjection: { kind: 'plan', path: `specs/${path.split('/')[1] || 'feature'}/plan.md`, content: renderDeveloperArchitectureSpecKitProjection(base) } };
}

/** The adapter intentionally accepts only complete, bounded JSON. Agent use is
 * not currently surfaced by this persona, but the contract is ready for a
 * future policy-gated read-only enrichment path. */
export const developerArchitectureArtifactAdapter: DeveloperArchitectureArtifactAdapter = {
  personaId: 'developer', artifactLabel: 'Technical decision package',
  parse: () => undefined,
  render: (artifact) => artifact.markdown,
  toEngineArtifact: (artifact) => artifact.specKitProjection,
};
