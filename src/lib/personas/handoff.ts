import { PersonaId } from '../../types/speckit';
import { personaCatalogEntry } from './catalog';
import { PersonaConsumer, personaHandoffRecipients } from './consumption';
import { personaWorkflowRules } from './workflowPolicy';

export interface PersonaHandoffDefinition {
  artifactLabel: string;
  title: string;
  contents: string[];
  repositoryNote: string;
  continueLabel: string;
  downloadSuffix: string;
}

/** Presentation policy for an accepted persona artifact. Delivery permissions
 * remain in the connector and engine layers; this only explains the next safe
 * handoff to the person using Studio. */
/**
 * Compatibility projection for portable-handoff callers. Workflow behavior is
 * defined in workflowPolicy; this module only exposes the legacy artifact view.
 */
export const personaHandoffDefinitions: Readonly<Record<PersonaId, PersonaHandoffDefinition>> = Object.fromEntries(
  Object.entries(personaWorkflowRules).map(([personaId, rule]) => [personaId, {
    artifactLabel: rule.artifactLabel,
    title: rule.title,
    contents: [...rule.handoffContents],
    repositoryNote: rule.repositoryNote,
    continueLabel: rule.primaryLabel,
    downloadSuffix: rule.downloadSuffix,
  }]),
) as Readonly<Record<PersonaId, PersonaHandoffDefinition>>;

export function personaHandoffDefinition(personaId: PersonaId): PersonaHandoffDefinition {
  return personaHandoffDefinitions[personaId];
}

export function personaHandoffRecipientText(personaId: PersonaId): string {
  const labels = personaHandoffRecipients(personaId).map((recipient: PersonaConsumer) => recipient === 'engine' ? 'the configured Spec-Driven Development engine' : personaCatalogEntry(recipient).label);
  return labels.length ? `${labels.join(', ')} can consume this accepted input when the declared handoff rules apply.` : 'This accepted input is retained with the feature for later review.';
}
