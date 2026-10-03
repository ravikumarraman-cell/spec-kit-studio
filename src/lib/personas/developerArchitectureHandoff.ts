import { DeveloperArchitecturePackage } from '../../types/speckit';

export function developerArchitectureHandoffMarkdown(artifact: DeveloperArchitecturePackage): string {
  return `## Architect / Tech Lead handoff\n\n**Decision:** ${artifact.title}\n\n**Selected approach:** ${artifact.options.find((option) => option.id === artifact.selectedOptionId)?.title || 'Not recorded'}\n\n**Developer guardrails**\n${artifact.guardrails.map((item) => `- ${item}`).join('\n') || '- None recorded.'}\n\n**Required verification**\n${artifact.verification.map((item) => `- ${item}`).join('\n') || '- None recorded.'}\n\nThis is advisory decision evidence. Developers must raise a clarification or deviation when implementation evidence conflicts with it.`;
}
