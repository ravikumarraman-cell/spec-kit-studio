import { ProductOutcomePackage } from '../../types/speckit';

export function developerHandoffMarkdown(outcome: ProductOutcomePackage): string {
  return `## Approved product handoff\n\n### Product outcome\n${outcome.desiredOutcome}\n\n### In scope / explicitly out of scope\nIn scope: ${outcome.problem}\nOut of scope:\n${outcome.nonGoals.length ? outcome.nonGoals.map((item) => `- ${item}`).join('\n') : '- None recorded.'}\n\n### Acceptance anchors\n${outcome.acceptanceAnchors.length ? outcome.acceptanceAnchors.map((item) => `- ${item.id}: ${item.statement}`).join('\n') : '- None recorded.'}\n\n### Success measures\n${outcome.successMeasures.length ? outcome.successMeasures.map((item) => `- ${item.id}: ${item.metric} → ${item.target}; source: ${item.sourceOfTruth}`).join('\n') : '- None recorded.'}\n\n### Decisions and open constraints\n${outcome.decisions.length ? outcome.decisions.map((item) => `- ${item.id} [${item.status}]: ${item.statement}${item.owner ? ` (owner: ${item.owner})` : ''}`).join('\n') : '- None recorded.'}`;
}

/** Portable record for a Product Manager to share outside Studio. The richer
 * product brief stays intact and the concise developer-facing handoff follows. */
export function productManagerHandoffPackage(outcome: ProductOutcomePackage): string {
  return `# Product Manager handoff: ${outcome.title}\n\nStatus: accepted ${outcome.acceptedAt || outcome.preparedAt}\n\n${outcome.markdown}\n\n---\n\n${developerHandoffMarkdown(outcome)}\n`;
}
