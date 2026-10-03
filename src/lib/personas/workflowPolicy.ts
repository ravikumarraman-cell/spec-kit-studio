import { FeatureInboxItem, FeatureJourney, PersonaId } from '../../types/speckit';
import { acceptedPersonaArtifact } from './consumption';

/**
 * The single lifecycle policy for every persona route. Screens render this
 * state; they do not decide independently whether a role can hand work off or
 * which role receives it. Add a new persona workflow here before adding UI.
 */
export type PersonaHandoffKind = 'accepted-artifact' | 'reviewed-delivery';
export type PersonaWorkflowStageKind = 'intake' | 'review' | 'handoff' | 'shared-journey';
export type PersonaContinuationBehavior = 'preview-recipient' | 'open-recipient';
export type PersonaTechnicalDesignAccess = 'handoff-only' | 'owner';
export type PersonaRecipientEntry = 'recipient-workspace' | 'shared-journey';

/** A durable unit of a persona workflow. Labels are display copy; IDs and
 * completion evidence are the testable contract used to prevent regressions. */
export interface PersonaWorkflowStage {
  id: string;
  label: string;
  kind: PersonaWorkflowStageKind;
  required: boolean;
  description: string;
  completionEvidence: string;
}

export interface PersonaWorkflowRule {
  personaId: PersonaId;
  /** Ordered default path. Every persona must end this path at a handoff. */
  mandatoryStages: readonly PersonaWorkflowStage[];
  /** Explicit, non-blocking alternatives. They never replace the default path. */
  optionalStages: readonly PersonaWorkflowStage[];
  primaryRecipient: PersonaId;
  /** Where the receiving role begins after this handoff. */
  recipientEntry: PersonaRecipientEntry;
  primaryLabel: string;
  /** Explains the visible context switch before a user chooses it. */
  primaryActionDescription: string;
  /** The role's own terminal action; it never starts the recipient's work. */
  completionLabel: string;
  /** Defines the post-completion action without embedding role checks in UI. */
  continuationBehavior: PersonaContinuationBehavior;
  /** Shown after completion; keeps every role's boundary explicit. */
  completionGuidance: string;
  /** Explains how retained persona context relates to the shared Journey. */
  journeyContext: string;
  /** Technical planning is a role boundary, not a generic PM screen. */
  technicalDesignAccess: PersonaTechnicalDesignAccess;
  exploration: { label: string; destination: 'journey' };
  artifactLabel: string;
  title: string;
  handoffContents: readonly string[];
  repositoryNote: string;
  downloadSuffix: string;
}

const stage = (id: string, label: string, kind: PersonaWorkflowStageKind, description: string, completionEvidence: string, required = true): PersonaWorkflowStage => ({ id, label, kind, required, description, completionEvidence });
const exploreJourney = (description: string) => stage('explore-feature-journey', 'Explore Feature Journey', 'shared-journey', description, 'The user explicitly chooses the shared Journey; the persona handoff remains retained as context.', false);

export interface PersonaHandoffPolicy {
  kind: PersonaHandoffKind;
  nextPersona: PersonaId;
  recipientEntry: PersonaRecipientEntry;
  artifactLabel: string;
  title: string;
  continueLabel: string;
  primaryActionDescription: string;
  completionLabel: string;
  continuationBehavior: PersonaContinuationBehavior;
  completionGuidance: string;
  explorationLabel: string;
  repositoryNote: string;
}

/** The terminal action for every shared Feature Journey, regardless of which
 * persona initiated it. Persona-specific workflow completion remains in each
 * rule above; this governs the common delivery handoff after Stage 8. */
export const finalDeliveryHandoffRule = {
  completionLabel: 'Done with this handoff',
  completionSummary: 'Records your final handoff approval. The reviewed package remains available; Studio does not commit, push, merge, or deploy code.',
} as const;

/**
 * Shared Feature Journey ownership is deliberately separate from the persona
 * that supplied a handoff.  A completed Product Manager, Business Analyst,
 * Security, or Architecture handoff is durable provenance; it must never be
 * rendered as the person currently doing the implementation journey.
 *
 * An explicitly selected role always wins. When a shared journey is restored
 * without an in-memory selection (refresh, import, or a deep link), the
 * delivery role is Developer / Architect. This is the one fallback used by
 * navigation, banners, and journey content.
 */
export const sharedFeatureJourneyRule = {
  defaultWorkingPersona: 'developer' as const,
} as const;

export function isSharedFeatureJourneyActive(journey: FeatureJourney | undefined): boolean {
  // `completedStages` was absent on a few early persisted records. Treat it
  // as an empty list so the policy safely upgrades those workspaces too.
  return Boolean(journey?.featureId && (journey.activeStage > 1 || (journey.completedStages?.length || 0) > 0));
}

export function resolveWorkingPersona(activePersona: PersonaId | undefined, journey: FeatureJourney | undefined): PersonaId | undefined {
  return activePersona || journey?.activePersona || (isSharedFeatureJourneyActive(journey) ? sharedFeatureJourneyRule.defaultWorkingPersona : undefined);
}

/** The compact persona-handoff navigation is valid only at the handoff
 * boundary. Once shared work begins, rendering it would present provenance as
 * the current workflow and compete with the active Journey navigation. */
export function shouldShowPersonaHandoffNavigation(hasCompletedHandoff: boolean, journey: FeatureJourney | undefined): boolean {
  return hasCompletedHandoff && !isSharedFeatureJourneyActive(journey);
}

/**
 * Configurable persona workflow registry. This is the only place that sets a
 * persona's default receiving role or optional exploration route. Product
 * teams can change the object (or later load an approved deployment config)
 * without editing individual screens.
 */
export const personaWorkflowRules: Readonly<Record<PersonaId, PersonaWorkflowRule>> = {
  'product-manager': {
    personaId: 'product-manager', primaryRecipient: 'developer', recipientEntry: 'shared-journey', primaryLabel: 'Preview developer next step', primaryActionDescription: 'Shows what the Developer / Architect receives and the decisions that happen next. It does not change a repository or start implementation.', completionLabel: 'Done with product review', continuationBehavior: 'preview-recipient', completionGuidance: 'Your Product Manager review is complete. Preview the developer’s next step whenever you want context; it does not begin technical work.', journeyContext: 'Product Manager initiated this delivery. The Journey now owns the active delivery stage.', technicalDesignAccess: 'handoff-only', exploration: { label: 'Explore Feature Journey instead', destination: 'journey' }, artifactLabel: 'Product Brief', title: 'Your product handoff is ready',
    mandatoryStages: [
      stage('select-product-input', 'Select or import product input', 'intake', 'Start an outcome or retain an imported feature source and scope.', 'Feature-owned source, title, and problem or imported delivery context are retained.'),
      stage('review-product-outcome', 'Review the product outcome', 'review', 'Accept a Product Brief, or explicitly accept a complete imported delivery.', 'Accepted Product Brief or recorded PM review decision with source, stories, and requirements.'),
      stage('handoff-product-context', 'Hand off reviewed product context', 'handoff', 'Confirm what the receiving technical role will receive.', 'Shared handoff screen reviewed and explicit Developer / Architect handoff.'),
    ],
    optionalStages: [exploreJourney('Explore delivery stages only after product review; this does not replace the technical handoff.')],
    handoffContents: ['Problem, desired outcome, and scope boundaries', 'Success measures, acceptance anchors, assumptions, and open decisions'],
    repositoryNote: 'The receiving Developer / Architect reviews this product context before connecting a repository or beginning technical planning.', downloadSuffix: 'product-manager-handoff',
  },
  'business-analyst': {
    personaId: 'business-analyst', primaryRecipient: 'developer', recipientEntry: 'recipient-workspace', primaryLabel: 'Open technical planning', primaryActionDescription: 'Opens the Developer / Architect workspace with this accepted analysis attached. It does not change a repository or start implementation.', completionLabel: 'Done with analysis', continuationBehavior: 'open-recipient', completionGuidance: 'Your analysis is complete. Technical planning remains available to the receiving role with this accepted context.', journeyContext: 'Business Analyst initiated this delivery. The Journey now owns the active delivery stage.', technicalDesignAccess: 'handoff-only', exploration: { label: 'Explore Feature Journey instead', destination: 'journey' }, artifactLabel: 'Business Analysis', title: 'Your analysis handoff is ready',
    mandatoryStages: [
      stage('select-analysis-input', 'Select analysis input', 'intake', 'Choose a feature and retain the source material that needs clarification.', 'Feature-owned source and current scope are available for review.'),
      stage('review-scope-and-acceptance', 'Clarify scope and acceptance evidence', 'review', 'Produce and accept the Business Analysis package.', 'Accepted Business Analysis with scope, acceptance evidence, assumptions, and open questions.'),
      stage('handoff-business-analysis', 'Hand off reviewed analysis', 'handoff', 'Confirm the analysis package for technical planning.', 'Shared handoff screen reviewed and explicit Developer / Architect handoff.'),
    ],
    optionalStages: [exploreJourney('Explore the shared Journey after analysis; the accepted analysis remains read-only context.')],
    handoffContents: ['Clarified scope, acceptance evidence, assumptions, and open questions', 'A bounded input for design, security, and delivery planning'],
    repositoryNote: 'The receiving Developer / Architect reviews this analysis before technical planning.', downloadSuffix: 'business-analysis-handoff',
  },
  developer: {
    personaId: 'developer', primaryRecipient: 'security-researcher', recipientEntry: 'recipient-workspace', primaryLabel: 'Open security review', primaryActionDescription: 'Opens the Security Researcher workspace with the accepted technical decision attached. It does not change a repository or start implementation.', completionLabel: 'Done with technical design', continuationBehavior: 'open-recipient', completionGuidance: 'Your technical design is complete. Security review remains available to the receiving role with this accepted context.', journeyContext: 'Developer / Architect initiated this delivery. The Journey now owns the active delivery stage.', technicalDesignAccess: 'owner', exploration: { label: 'Explore Feature Journey instead', destination: 'journey' }, artifactLabel: 'Technical Decision', title: 'Your technical handoff is ready',
    mandatoryStages: [
      stage('choose-technical-ownership', 'Choose technical ownership', 'intake', 'Declare Architect, Developer, or combined ownership so the stop point is unambiguous.', 'Technical ownership is retained with the feature.'),
      stage('ground-repository-context', 'Ground repository context', 'review', 'Connect and scan the intended repository before technical decisions rely on code evidence.', 'Reviewed repository baseline and accepted impact map when repository planning is needed (Journey stages 1 and 3).'),
      stage('approve-technical-design', 'Approve technical design', 'review', 'Review technical decision and architecture plan before delivery work.', 'Accepted technical decision and feature-scoped architecture plan (Journey stage 4).'),
      stage('handoff-technical-context', 'Hand off technical context', 'handoff', 'Architects stop here; combined ownership retains the same review boundary before continuing.', 'Shared architecture handoff reviewed. Receiving Developer starts at the earliest unfinished stage, normally stage 5.'),
    ],
    optionalStages: [exploreJourney('Continue through shared stages 5–8 only after the technical design boundary is accepted.')],
    handoffContents: ['Technical approach, change surface, guardrails, and verification evidence', 'A reviewable input for security review and the Feature Journey'],
    repositoryNote: 'The receiving reviewer uses this technical decision as read-only context.', downloadSuffix: 'technical-decision-handoff',
  },
  'security-researcher': {
    personaId: 'security-researcher', primaryRecipient: 'developer', recipientEntry: 'recipient-workspace', primaryLabel: 'Return to technical planning', primaryActionDescription: 'Opens the Developer / Architect workspace with the accepted security review attached. It does not change a repository or start implementation.', completionLabel: 'Done with security review', continuationBehavior: 'open-recipient', completionGuidance: 'Your security review is complete. Technical planning remains available to the receiving role with these required controls.', journeyContext: 'Security Researcher initiated this delivery. The Journey now owns the active delivery stage.', technicalDesignAccess: 'handoff-only', exploration: { label: 'Explore Feature Journey instead', destination: 'journey' }, artifactLabel: 'Security Review', title: 'Your security handoff is ready',
    mandatoryStages: [
      stage('select-security-context', 'Select security context', 'intake', 'Choose the feature and its accepted product, analysis, or technical inputs.', 'Feature-scoped source context and declared consumer inputs are visible.'),
      stage('review-security-boundary', 'Review risks and controls', 'review', 'Produce and accept the Security Review with required controls and verification evidence.', 'Accepted Security Review scoped to the selected feature.'),
      stage('handoff-security-controls', 'Hand off required controls', 'handoff', 'Confirm the security package for the technical receiver.', 'Shared handoff screen reviewed and explicit Developer / Architect handoff.'),
    ],
    optionalStages: [exploreJourney('Explore the shared Journey after security review; required controls remain read-only context.')],
    handoffContents: ['Security boundary, required controls, and verification evidence', 'A bounded input for product review, technical planning, and delivery'],
    repositoryNote: 'The receiving Developer / Architect reviews required controls before technical planning.', downloadSuffix: 'security-review-handoff',
  },
};

export function personaWorkflowRule(personaId: PersonaId): PersonaWorkflowRule { return personaWorkflowRules[personaId]; }

/**
 * The one identity resolver for a shared delivery route. A feature-owned
 * route is durable and wins after refresh/import; the currently selected role
 * is a safe fallback while an older record is being resumed. UI surfaces must
 * use this rather than independently guessing which persona to display.
 */
export function resolveDeliveryPersona(feature?: FeatureInboxItem, activePersona?: PersonaId): PersonaId | undefined {
  if (feature?.personaRoute) return feature.personaRoute;
  // Legacy delivery records predate personaRoute. Infer only from accepted
  // feature-owned evidence—never from a screen name or an agent selection.
  // This makes the migration deterministic for every existing persona.
  if (feature?.developerArchitecture?.acceptedAt) return 'developer';
  if (feature?.securityResearch?.acceptedAt) return 'security-researcher';
  if (feature?.businessAnalysis?.acceptedAt) return 'business-analyst';
  if (feature?.productOutcome?.acceptedAt || feature?.productManagerDecision?.status === 'accepted') return 'product-manager';
  return activePersona;
}

/**
 * Returns the one mandatory persona step the user should see next. A feature
 * establishes intake; an accepted handoff state establishes the final review
 * boundary. Specialist screens can remain focused without recreating a second
 * progress model.
 */
export function personaWorkflowCurrentStep(feature: FeatureInboxItem | undefined, personaId: PersonaId): number {
  const rule = personaWorkflowRule(personaId);
  if (!feature) return 0;
  if (personaHandoffPolicy(feature, personaId)) return rule.mandatoryStages.length - 1;
  return Math.min(1, rule.mandatoryStages.length - 1);
}

/** Validate registry entries independently of UI code. This keeps a new
 * persona from compiling with an incomplete or bypassable lifecycle. */
export function personaWorkflowRuleIssues(rule: PersonaWorkflowRule): string[] {
  const issues: string[] = [];
  if (!rule.mandatoryStages.length) issues.push('must declare at least one mandatory stage');
  if (rule.mandatoryStages.at(-1)?.kind !== 'handoff') issues.push('must end the mandatory path with a handoff stage');
  if (!rule.primaryRecipient || rule.primaryRecipient === rule.personaId) issues.push('must declare a different primary recipient');
  if (rule.recipientEntry !== 'recipient-workspace' && rule.recipientEntry !== 'shared-journey') issues.push('must declare a supported receiving entry');
  if (!rule.artifactLabel || !rule.handoffContents.length || !rule.downloadSuffix) issues.push('must declare an exportable handoff package');
  if (!rule.primaryLabel || !rule.primaryActionDescription || !rule.completionLabel || !rule.completionGuidance || !rule.journeyContext) issues.push('must declare clear completion and continuation copy');
  if (rule.continuationBehavior !== 'preview-recipient' && rule.continuationBehavior !== 'open-recipient') issues.push('must declare a supported continuation behavior');
  if (rule.technicalDesignAccess !== 'handoff-only' && rule.technicalDesignAccess !== 'owner') issues.push('must declare technical-design access');
  if (rule.exploration.destination !== 'journey') issues.push('must declare a supported optional exploration destination');
  if (!rule.optionalStages.some((candidate) => candidate.kind === 'shared-journey' && !candidate.required)) issues.push('must expose optional shared-Journey exploration');
  const ids = [...rule.mandatoryStages, ...rule.optionalStages].map((candidate) => candidate.id);
  if (new Set(ids).size !== ids.length) issues.push('must use unique stage identifiers');
  for (const candidate of rule.mandatoryStages) {
    if (!candidate.required) issues.push(`mandatory stage "${candidate.id}" must be required`);
    if (!candidate.label || !candidate.description || !candidate.completionEvidence) issues.push(`stage "${candidate.id}" must declare label, description, and completion evidence`);
  }
  return issues;
}

/** Central permission used wherever Stage 4 technical design is offered. */
export function personaMayOwnTechnicalDesign(personaId: PersonaId): boolean {
  return personaWorkflowRule(personaId).technicalDesignAccess === 'owner';
}

export function personaHandoffPolicy(feature: FeatureInboxItem | undefined, personaId: PersonaId): PersonaHandoffPolicy | undefined {
  if (!feature) return undefined;
  const rule = personaWorkflowRule(personaId);
  const policy = { nextPersona: rule.primaryRecipient, recipientEntry: rule.recipientEntry, artifactLabel: rule.artifactLabel, title: rule.title, continueLabel: rule.primaryLabel, primaryActionDescription: rule.primaryActionDescription, completionLabel: rule.completionLabel, continuationBehavior: rule.continuationBehavior, completionGuidance: rule.completionGuidance, explorationLabel: rule.exploration.label, repositoryNote: rule.repositoryNote };
  if (acceptedPersonaArtifact(feature, personaId)) return { ...policy, kind: 'accepted-artifact' };
  // Imported stories can be a complete product input even when a separate
  // Product Brief would add no value. A recorded PM acceptance still deserves
  // the same transparent, reviewable handoff screen.
  if (personaId === 'product-manager' && feature.productManagerDecision?.status === 'accepted') {
    return { ...policy, kind: 'reviewed-delivery', artifactLabel: 'Reviewed delivery package', title: 'Your reviewed-delivery handoff is ready' };
  }
  return undefined;
}
