export type DashboardDominantRegion = 'onboarding' | 'next-action' | 'completion';

/** The Hub deliberately has one dominant decision. Supplementary content never competes with it. */
export function dashboardPriority(input: { hasRepository: boolean; hasDelivery: boolean; isComplete: boolean }): DashboardDominantRegion {
  if (!input.hasRepository || !input.hasDelivery) return 'onboarding';
  return input.isComplete ? 'completion' : 'next-action';
}
