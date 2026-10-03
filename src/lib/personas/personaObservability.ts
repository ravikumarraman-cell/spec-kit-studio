import type { FeatureInboxItem, PersonaId } from '../../types/speckit';

function timestamp(value: string | undefined): number | undefined {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function personaWorkflowStartedAt(feature: FeatureInboxItem, personaId: PersonaId): string {
  const preparedAt = personaId === 'product-manager' ? feature.productOutcome?.preparedAt
    : personaId === 'developer' ? feature.developerArchitecture?.preparedAt
      : personaId === 'business-analyst' ? feature.businessAnalysis?.preparedAt
        : feature.securityResearch?.preparedAt;
  return preparedAt || feature.importedAt;
}

export function personaWorkflowAcceptedAt(feature: FeatureInboxItem, personaId: PersonaId): string | undefined {
  if (personaId === 'product-manager') return feature.productOutcome?.acceptedAt || feature.productManagerDecision?.recordedAt;
  if (personaId === 'developer') return feature.developerArchitecture?.acceptedAt;
  if (personaId === 'business-analyst') return feature.businessAnalysis?.acceptedAt;
  return feature.securityResearch?.acceptedAt;
}

export function personaWorkflowObservabilitySummary(feature: FeatureInboxItem, personaId: PersonaId, now = Date.now()) {
  const startedAt = personaWorkflowStartedAt(feature, personaId);
  const acceptedAt = personaWorkflowAcceptedAt(feature, personaId);
  const completedAt = feature.personaWorkflowCompletions?.find((item) => item.personaId === personaId)?.completedAt;
  const end = timestamp(completedAt) || now;
  const elapsedMs = Math.max(0, end - (timestamp(startedAt) || end));
  const automationAttempts = feature.journey?.observability?.attempts || [];
  const retries = automationAttempts.filter((attempt) => attempt.outcome === 'failed').length;
  return { startedAt, acceptedAt, completedAt, elapsedMs, automationAttempts, retries, completed: Boolean(completedAt) };
}
