import { FeatureInboxItem, PersonaId, SddEngineArtifactKind } from '../../types/speckit';
import { personaCatalogEntry } from './catalog';

export type PersonaConsumer = PersonaId | 'engine';
export type PersonaArtifactKind = 'product-outcome' | 'business-analysis' | 'technical-decision' | 'security-research';

export interface PersonaConsumptionRule {
  consumer: PersonaConsumer;
  source: PersonaId;
  artifactKind: PersonaArtifactKind;
  purpose: string;
}

export interface AvailablePersonaInput extends PersonaConsumptionRule {
  title: string;
  path: string;
  markdown: string;
  acceptedAt: string;
}

export interface AcceptedPersonaArtifact extends Omit<AvailablePersonaInput, keyof PersonaConsumptionRule> {
  specKitProjection: { kind: SddEngineArtifactKind; path: string; content: string };
}

/** The sole policy table for persona-to-persona handoffs. Rules grant context
 * only; they never grant an approval, repository permission, or release. */
export const personaConsumptionRules: readonly PersonaConsumptionRule[] = [
  { consumer: 'business-analyst', source: 'product-manager', artifactKind: 'product-outcome', purpose: 'Refine the approved outcome into scope and acceptance evidence.' },
  { consumer: 'security-researcher', source: 'product-manager', artifactKind: 'product-outcome', purpose: 'Assess risk against the intended user outcome and boundaries.' },
  { consumer: 'security-researcher', source: 'business-analyst', artifactKind: 'business-analysis', purpose: 'Assess the clarified scope, assumptions, and open questions.' },
  { consumer: 'security-researcher', source: 'developer', artifactKind: 'technical-decision', purpose: 'Review proposed technical boundaries and controls.' },
  { consumer: 'developer', source: 'product-manager', artifactKind: 'product-outcome', purpose: 'Plan against approved outcome, non-goals, and success measures.' },
  { consumer: 'developer', source: 'business-analyst', artifactKind: 'business-analysis', purpose: 'Plan against reviewed scope and acceptance evidence.' },
  { consumer: 'developer', source: 'security-researcher', artifactKind: 'security-research', purpose: 'Carry required controls into design, tasks, and verification.' },
  { consumer: 'product-manager', source: 'business-analyst', artifactKind: 'business-analysis', purpose: 'Revisit outcome boundaries with reviewed analysis evidence.' },
  { consumer: 'product-manager', source: 'security-researcher', artifactKind: 'security-research', purpose: 'Revisit outcome boundaries with reviewed security evidence.' },
  { consumer: 'product-manager', source: 'developer', artifactKind: 'technical-decision', purpose: 'Revisit outcome trade-offs without changing technical approval.' },
  { consumer: 'engine', source: 'product-manager', artifactKind: 'product-outcome', purpose: 'Ground engine stages in approved product intent.' },
  { consumer: 'engine', source: 'business-analyst', artifactKind: 'business-analysis', purpose: 'Ground engine stages in reviewed scope and acceptance evidence.' },
  { consumer: 'engine', source: 'developer', artifactKind: 'technical-decision', purpose: 'Ground engine stages in reviewed technical guardrails.' },
  { consumer: 'engine', source: 'security-researcher', artifactKind: 'security-research', purpose: 'Ground engine stages in reviewed required controls.' },
];

export function acceptedPersonaArtifact(feature: FeatureInboxItem, source: PersonaId): AcceptedPersonaArtifact | undefined {
  if (source === 'product-manager' && feature.productOutcome?.acceptedAt) return { title: feature.productOutcome.title, path: feature.productOutcome.path, markdown: feature.productOutcome.markdown, acceptedAt: feature.productOutcome.acceptedAt, specKitProjection: feature.productOutcome.specKitProjection };
  if (source === 'business-analyst' && feature.businessAnalysis?.acceptedAt) return { title: feature.businessAnalysis.title, path: feature.businessAnalysis.path, markdown: feature.businessAnalysis.markdown, acceptedAt: feature.businessAnalysis.acceptedAt, specKitProjection: feature.businessAnalysis.specKitProjection };
  if (source === 'developer' && feature.developerArchitecture?.acceptedAt) return { title: feature.developerArchitecture.title, path: feature.developerArchitecture.path, markdown: feature.developerArchitecture.markdown, acceptedAt: feature.developerArchitecture.acceptedAt, specKitProjection: feature.developerArchitecture.specKitProjection };
  if (source === 'security-researcher' && feature.securityResearch?.acceptedAt) return { title: feature.securityResearch.title, path: feature.securityResearch.path, markdown: feature.securityResearch.markdown, acceptedAt: feature.securityResearch.acceptedAt, specKitProjection: feature.securityResearch.specKitProjection };
  return undefined;
}

/** People or systems allowed to consume an accepted artifact. Derived from the
 * same policy table used to assemble downstream context, so completion UI can
 * never promise a handoff that the workflow will not actually provide. */
export function personaHandoffRecipients(source: PersonaId): PersonaConsumer[] {
  return [...new Set(personaConsumptionRules.filter((rule) => rule.source === source).map((rule) => rule.consumer))];
}

export function availablePersonaInputs(feature: FeatureInboxItem, consumer: PersonaConsumer): AvailablePersonaInput[] {
  return personaConsumptionRules
    .filter((rule) => rule.consumer === consumer)
    .flatMap((rule) => {
      const artifact = acceptedPersonaArtifact(feature, rule.source);
      return artifact ? [{ ...rule, title: artifact.title, path: artifact.path, markdown: artifact.markdown, acceptedAt: artifact.acceptedAt }] : [];
    });
}

/** A bounded, source-labelled packet for a downstream persona or engine. */
export function personaConsumptionPacket(feature: FeatureInboxItem, consumer: PersonaConsumer, maxCharacters = 18_000): string {
  const entries = availablePersonaInputs(feature, consumer);
  if (!entries.length) return '';
  let remaining = maxCharacters;
  return entries.map((entry) => {
    const label = personaCatalogEntry(entry.source).label;
    const content = entry.markdown.slice(0, Math.max(0, remaining));
    remaining -= content.length;
    return `## Reviewed ${label} input — ${entry.artifactKind}\nPurpose: ${entry.purpose}\nSource: ${entry.path}\n\n${content}`;
  }).filter(Boolean).join('\n\n');
}
