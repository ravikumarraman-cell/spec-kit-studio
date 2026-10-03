import { ProductOutcomePackage } from '../../types/speckit';
import { ProductManagerArtifactAdapter } from './schema';

type UnknownRecord = Record<string, unknown>;
const text = (value: unknown, fallback = '') => typeof value === 'string' ? value.trim() : fallback;
const strings = (value: unknown) => Array.isArray(value) ? value.map((item) => text(item)).filter(Boolean).slice(0, 12) : [];
const records = (value: unknown) => Array.isArray(value) ? value.filter((item): item is UnknownRecord => Boolean(item) && typeof item === 'object').slice(0, 12) : [];

function jsonObject(output: string): UnknownRecord | undefined {
  const input = String(output || '');
  for (let start = 0; start < input.length; start += 1) {
    if (input[start] !== '{') continue;
    let depth = 0; let quoted = false; let escaped = false;
    for (let end = start; end < input.length; end += 1) {
      const char = input[end];
      if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; continue; }
      if (char === '"') { quoted = true; continue; }
      if (char === '{') depth += 1;
      if (char === '}') { depth -= 1; if (depth === 0) { try { const candidate = JSON.parse(input.slice(start, end + 1)); if (candidate && typeof candidate === 'object') return candidate as UnknownRecord; } catch { /* try the next object */ } } }
    }
  }
  return undefined;
}

export function renderProductOutcomeMarkdown(artifact: Omit<ProductOutcomePackage, 'markdown' | 'specKitProjection'>): string {
  const list = (items: string[]) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded.';
  return `# Product brief: ${artifact.title}\n\n## Target users\n${list(artifact.targetUsers)}\n\n## Problem\n${artifact.problem}\n\n## Desired outcome\n${artifact.desiredOutcome}\n\n## Non-goals\n${list(artifact.nonGoals)}\n\n## Success measures\n${artifact.successMeasures.length ? artifact.successMeasures.map((item) => `- ${item.id}: ${item.metric} → ${item.target}; source of truth: ${item.sourceOfTruth}${item.cadence ? `; review: ${item.cadence}` : ''}`).join('\n') : '- None recorded.'}\n\n## Assumptions\n${artifact.assumptions.length ? artifact.assumptions.map((item) => `- ${item.id}: ${item.statement}${item.owner ? ` (owner: ${item.owner})` : ''}`).join('\n') : '- None recorded.'}\n\n## Decisions\n${artifact.decisions.length ? artifact.decisions.map((item) => `- ${item.id} [${item.status}]: ${item.statement}${item.owner ? ` (owner: ${item.owner})` : ''}`).join('\n') : '- None recorded.'}\n\n## Acceptance anchors\n${artifact.acceptanceAnchors.length ? artifact.acceptanceAnchors.map((item) => `- ${item.id}: ${item.statement}`).join('\n') : '- None recorded.'}`;
}

/** Canonical GitHub Spec Kit spec.md projection. The richer product brief is
 * retained separately; this document deliberately follows the engine's core
 * headings so it can be consumed by `/speckit.plan` without translation. */
export function renderProductOutcomeSpecKitProjection(artifact: Omit<ProductOutcomePackage, 'markdown' | 'specKitProjection'>): string {
  const criteria = artifact.acceptanceAnchors.length ? artifact.acceptanceAnchors.map((item) => `- ${item.statement}`).join('\n') : '- Review the recorded product outcome with the feature owner.';
  const measures = artifact.successMeasures.length ? artifact.successMeasures.map((item) => `- ${item.metric}: ${item.target} (source: ${item.sourceOfTruth})`).join('\n') : '- Success measures to be confirmed during feature review.';
  return `# Feature Specification: ${artifact.title}\n\n## Summary\n${artifact.desiredOutcome}\n\n## User Scenarios & Testing\n### User Story 1 - ${artifact.title} (Priority: P1)\nAs a ${artifact.targetUsers[0] || 'feature user'}, I want the stated outcome, so that the recorded problem is resolved.\n\n**Acceptance Scenarios**:\n${criteria}\n\n## Requirements\n### Functional Requirements\n- **FR-001**: The feature MUST deliver the approved product outcome: ${artifact.desiredOutcome}\n\n### Key Entities\n- Product outcome: the approved user-facing result for this feature.\n\n## Success Criteria\n### Measurable Outcomes\n${measures}\n\n## Assumptions and Open Decisions\n${[...artifact.assumptions.map((item) => `- Assumption: ${item.statement}`), ...artifact.decisions.filter((item) => item.status === 'open').map((item) => `- Open decision: ${item.statement}`)].join('\n') || '- None recorded.'}${artifact.nonGoals.length ? `\n\n## Out of Scope\n${artifact.nonGoals.map((item) => `- ${item}`).join('\n')}` : ''}`;
}

export const productManagerArtifactAdapter: ProductManagerArtifactAdapter = {
  personaId: 'product-manager', artifactLabel: 'Product brief',
  parse(output, context) {
    const value = jsonObject(output); if (!value) return undefined;
    const desiredOutcome = text(value.desiredOutcome || value.outcome);
    const problem = text(value.problem);
    if (!desiredOutcome || !problem) return undefined;
    const base = {
      schemaVersion: 1 as const, path: context.path, title: text(value.title, context.title),
      targetUsers: strings(value.targetUsers), problem, desiredOutcome, nonGoals: strings(value.nonGoals),
      successMeasures: records(value.successMeasures).map((item, index) => ({ id: text(item.id, `SM-${index + 1}`), metric: text(item.metric), target: text(item.target), sourceOfTruth: text(item.sourceOfTruth, 'To be confirmed'), cadence: text(item.cadence) })).filter((item) => item.metric && item.target),
      assumptions: records(value.assumptions).map((item, index) => ({ id: text(item.id, `A-${index + 1}`), statement: text(item.statement), owner: text(item.owner) })).filter((item) => item.statement),
      decisions: records(value.decisions).map((item, index) => ({ id: text(item.id, `D-${index + 1}`), statement: text(item.statement), status: item.status === 'open' ? 'open' as const : 'decided' as const, owner: text(item.owner) })).filter((item) => item.statement),
      acceptanceAnchors: records(value.acceptanceAnchors).map((item, index) => ({ id: text(item.id, `AC-${index + 1}`), statement: text(item.statement) })).filter((item) => item.statement),
      preparedAt: context.now,
    };
    const projection = { kind: 'spec' as const, path: `specs/${context.path.split('/')[1] || 'feature'}/spec.md`, content: renderProductOutcomeSpecKitProjection(base) };
    return { ...base, markdown: renderProductOutcomeMarkdown(base), specKitProjection: projection };
  },
  render: (artifact) => artifact.markdown,
  toEngineArtifact: (artifact) => artifact.specKitProjection,
};

/** A repository-independent starting point. It is intentionally labelled as
 * a draft and requires human acceptance before it becomes downstream context. */
export function createProductOutcomeDraft(title: string, summary: string, path: string, now: string): ProductOutcomePackage {
  const problem = summary.trim() || `Clarify the problem and expected outcome for ${title}.`;
  const base = {
    schemaVersion: 1 as const, path, title, targetUsers: [], problem,
    desiredOutcome: `Deliver a clear, reviewable outcome for ${title}.`,
    nonGoals: [], successMeasures: [], assumptions: [], decisions: [],
    acceptanceAnchors: [{ id: 'AC-1', statement: `A reviewer can confirm that ${title} addresses the recorded problem within the agreed scope.` }],
    preparedAt: now,
  };
  const projection = { kind: 'spec' as const, path: `specs/${path.split('/')[1] || 'feature'}/spec.md`, content: renderProductOutcomeSpecKitProjection(base) };
  return { ...base, markdown: renderProductOutcomeMarkdown(base), specKitProjection: projection };
}

export function productManagerPrompt(title: string, summary: string): string {
  return `You are preparing a Product Manager outcome package for one feature. This is read-only: do not create, edit, commit, or delete any repository files. Do not run implementation commands.\n\nFeature: ${title}\nSummary: ${summary}\n\nReturn ONLY one valid JSON object with this exact shape: {"title":"...","targetUsers":["..."],"problem":"...","desiredOutcome":"...","nonGoals":["..."],"successMeasures":[{"id":"SM-1","metric":"...","target":"...","sourceOfTruth":"...","cadence":"..."}],"assumptions":[{"id":"A-1","statement":"...","owner":"..."}],"decisions":[{"id":"D-1","statement":"...","status":"decided|open","owner":"..."}],"acceptanceAnchors":[{"id":"AC-1","statement":"..."}]}. Use only the feature information provided. Mark uncertainty as an open decision or assumption; never invent customer data, metrics, or repository behavior.`;
}
