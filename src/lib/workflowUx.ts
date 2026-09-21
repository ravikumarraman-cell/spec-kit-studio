/** Small, pure UX policies shared by workflow screens and covered by Node tests. */
export function canStartFeatureIntake(stageId: number): boolean {
  return stageId > 1;
}

export interface JourneyEvidenceState {
  stageId: number;
  hasImpactMap: boolean;
  hasArchitecturePlan: boolean;
  hasDeliveryPlan: boolean;
}

export function needsLegacyJourneyRepair({ stageId, hasImpactMap, hasArchitecturePlan, hasDeliveryPlan }: JourneyEvidenceState): boolean {
  return (stageId > 3 && !hasImpactMap)
    || (stageId > 4 && !hasArchitecturePlan)
    || (stageId > 5 && !hasDeliveryPlan);
}

export function userFacingActionError(action: string, error: unknown, fallback: string): string {
  const detail = error instanceof Error ? error.message.trim() : '';
  return detail ? `Couldn’t ${action}: ${detail}` : fallback;
}
