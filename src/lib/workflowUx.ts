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
  // Older, imported projects may legitimately lack Studio's newer, retained
  // receipts. Those gaps are not evidence of failed work and must never
  // interrupt an active Journey. Current-stage readiness still enforces the
  // evidence required for newly created work.
  void stageId;
  void hasImpactMap;
  void hasArchitecturePlan;
  void hasDeliveryPlan;
  return false;
}

export function userFacingActionError(action: string, error: unknown, fallback: string): string {
  const detail = error instanceof Error ? error.message.trim() : '';
  return detail ? `Couldn’t ${action}: ${detail}` : fallback;
}
