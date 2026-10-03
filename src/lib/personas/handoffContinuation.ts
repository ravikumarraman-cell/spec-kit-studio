import { BusinessAnalysisPackage, FeatureInboxItem, FeatureJourney, FunctionalRequirement, PersonaId, ProductOutcomePackage, UserStory } from '../../types/speckit';
import { PortableArchitectureContinuation, PortablePersonaArtifact } from './portableHandoff';

export interface PersonaHandoffContinuation {
  creditedStages: number[];
  nextEngineeringStage: number;
  summary: string;
}

export interface PersonaHandoffIntake {
  userStories: UserStory[];
  functionalRequirements: FunctionalRequirement[];
}

export interface FeatureHandoffContinuation extends PersonaHandoffContinuation {
  personaId: PersonaId;
  title: string;
}

type HandoffContinuationPolicy = {
  personaId: PersonaId;
  projectionKind: PortablePersonaArtifact['specKitProjection']['kind'];
  creditedStages: number[];
  nextEngineeringStage: number;
  summary: string;
};

/** A handoff may be represented by an accepted persona artifact or by a
 * structured review record. Register the latter here; receivers never need
 * to know which screen or ZIP format produced the evidence. */
type FeatureHandoffEvidenceRule = {
  personaId: PersonaId;
  isAccepted: (feature: FeatureInboxItem) => boolean;
  title: (feature: FeatureInboxItem) => string;
  continuation: PersonaHandoffContinuation;
};

/**
 * The only place where a portable artifact is allowed to earn Journey credit.
 * Adding a new persona or an engine adapter means adding an explicit policy,
 * rather than sprinkling persona checks through import screens and journeys.
 *
 * A Spec-Kit shaped product/discovery definition can prove Stage 2. It cannot
 * prove repository evidence, impact analysis, architecture, or delivery work.
 * Plan-shaped artifacts remain durable context unless an architecture ZIP
 * also carries the accepted feature, impact, and Stage 4 plan evidence.
 */
const handoffContinuationPolicies: readonly HandoffContinuationPolicy[] = [
  {
    personaId: 'product-manager', projectionKind: 'spec', creditedStages: [2], nextEngineeringStage: 3,
    summary: 'Feature definition is accepted from this reviewed handoff. After the target repository is connected and baselined, continue at Stage 3: Ground the impact map.',
  },
  {
    personaId: 'business-analyst', projectionKind: 'spec', creditedStages: [2], nextEngineeringStage: 3,
    summary: 'Reviewed scope and acceptance evidence satisfy feature definition. After the target repository is connected and baselined, continue at Stage 3: Ground the impact map.',
  },
];

const featureHandoffEvidenceRules: readonly FeatureHandoffEvidenceRule[] = [
  {
    personaId: 'product-manager',
    isAccepted: (feature) => Boolean(feature.productManagerDecision?.status === 'accepted' && feature.specification?.acceptedAt && feature.specification.path && feature.specification.content),
    title: (feature) => feature.title,
    continuation: {
      creditedStages: [2], nextEngineeringStage: 3,
      summary: 'Accepted Product Manager review and canonical specification are retained from this Studio handoff. After Connect safely records the target repository baseline, continue at Stage 3: Ground the impact map.',
    },
  },
];

function nextIdentifier(prefix: 'US' | 'FR', existing: Set<string>): string {
  let ordinal = 1;
  while (existing.has(`${prefix}-${String(ordinal).padStart(3, '0')}`)) ordinal += 1;
  return `${prefix}-${String(ordinal).padStart(3, '0')}`;
}

/**
 * The continuation policy is intentionally separate from UI and archive code.
 * A persona handoff can credit only work that its accepted, engine-compatible
 * artifact actually proves. Repository-grounded stages remain uncredited.
 */
export function personaHandoffContinuation(personaId: PersonaId, artifact: Pick<PortablePersonaArtifact, 'specKitProjection'>, architecture?: PortableArchitectureContinuation): PersonaHandoffContinuation {
  if (personaId === 'developer' && artifact.specKitProjection.kind === 'plan' && architecture?.kind === 'accepted-architecture') return {
    creditedStages: [2, 3, 4], nextEngineeringStage: 5,
    summary: 'Accepted feature, impact, and architecture evidence restored. Connect and baseline the target repository if needed, then continue directly at Stage 5: Plan delivery.',
  };
  const policy = handoffContinuationPolicies.find((candidate) => candidate.personaId === personaId && candidate.projectionKind === artifact.specKitProjection.kind);
  return policy || {
    creditedStages: [],
    nextEngineeringStage: 2,
    summary: 'This accepted handoff is retained as planning context. Complete the feature definition and repository grounding that it does not prove before technical planning.',
  };
}

/** Find the most advanced trustworthy continuation represented by a feature.
 * This gives every screen the same explanation of what imported work changes
 * and never relies on the page that happened to import the handoff. */
export function featureHandoffContinuation(feature: FeatureInboxItem): FeatureHandoffContinuation | undefined {
  const candidates: Array<{ personaId: PersonaId; artifact?: PortablePersonaArtifact }> = [
    { personaId: 'product-manager', artifact: feature.productOutcome },
    { personaId: 'business-analyst', artifact: feature.businessAnalysis },
    { personaId: 'developer', artifact: feature.developerArchitecture },
    { personaId: 'security-researcher', artifact: feature.securityResearch },
  ];
  const accepted = candidates
    .filter((candidate): candidate is { personaId: PersonaId; artifact: PortablePersonaArtifact } => Boolean(candidate.artifact?.acceptedAt))
    .map(({ personaId, artifact }) => ({ personaId, title: artifact.title, ...personaHandoffContinuation(personaId, artifact) }))
    .sort((left, right) => Math.max(...right.creditedStages, 0) - Math.max(...left.creditedStages, 0));
  const structuredEvidence = featureHandoffEvidenceRules
    .filter((rule) => rule.isAccepted(feature))
    .map((rule) => ({ personaId: rule.personaId, title: rule.title(feature), ...rule.continuation }));
  return [...accepted, ...structuredEvidence]
    .sort((left, right) => Math.max(...right.creditedStages, 0) - Math.max(...left.creditedStages, 0))[0];
}

/** Apply trusted handoff credit without letting an import rewind an in-flight
 * Journey. The caller supplies its stage catalogue, keeping this adapter
 * reusable for any engine-defined Journey rather than coupling it to eight
 * hard-coded Studio stages. */
export function continueJourneyFromHandoff(journey: FeatureJourney, continuation: PersonaHandoffContinuation, stageIds: readonly number[], now: string): FeatureJourney {
  const completedStages = [...new Set([...journey.completedStages, ...continuation.creditedStages])].sort((left, right) => left - right);
  const firstIncomplete = stageIds.find((stageId) => !completedStages.includes(stageId));
  const activeStage = completedStages.includes(1)
    ? firstIncomplete || stageIds[stageIds.length - 1] || journey.activeStage
    : 1;
  return { ...journey, completedStages, activeStage, updatedAt: now };
}

/** Convert accepted product/discovery evidence into the minimum structured
 * Studio intake required to make the credited feature definition inspectable,
 * editable, and consumable by every downstream persona. */
export function personaHandoffIntake(personaId: PersonaId, artifact: PortablePersonaArtifact, existingStoryIds: Iterable<string>, existingRequirementIds: Iterable<string>): PersonaHandoffIntake {
  const stories: UserStory[] = [];
  const requirements: FunctionalRequirement[] = [];
  const storyIds = new Set(existingStoryIds);
  const requirementIds = new Set(existingRequirementIds);
  if (personaId === 'product-manager') {
    const product = artifact as ProductOutcomePackage;
    const storyId = nextIdentifier('US', storyIds); const requirementId = nextIdentifier('FR', requirementIds);
    stories.push({ id: storyId, title: product.title, priority: 'High', asA: product.targetUsers[0] || 'feature user', iWantTo: product.desiredOutcome, soThat: product.problem, acceptanceCriteria: product.acceptanceAnchors.map((item) => item.statement), requirementIds: [requirementId] });
    requirements.push({ id: requirementId, title: 'Approved product outcome', description: product.desiredOutcome, category: 'Core', priority: 'High' });
  }
  if (personaId === 'business-analyst') {
    const analysis = artifact as BusinessAnalysisPackage;
    const scoped = analysis.inScope.filter(Boolean).slice(0, 12);
    const ids = scoped.map(() => { const id = nextIdentifier('FR', requirementIds); requirementIds.add(id); return id; });
    const storyId = nextIdentifier('US', storyIds);
    stories.push({ id: storyId, title: analysis.title, priority: 'High', asA: analysis.stakeholders[0] || 'feature user', iWantTo: scoped.join('; ') || 'achieve the reviewed scope', soThat: analysis.problem, acceptanceCriteria: analysis.acceptanceEvidence, requirementIds: ids });
    requirements.push(...scoped.map((item, index) => ({ id: ids[index], title: `Reviewed scope: ${item}`, description: item, category: 'Core' as const, priority: 'High' as const })));
  }
  return { userStories: stories, functionalRequirements: requirements };
}
