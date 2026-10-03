import type { PersonaId, TechnicalRole } from '../types/speckit';

/**
 * Outcome Refinery permissions describe what someone may do with a visible
 * outcome gap. They are deliberately capability-based so a future persona can
 * be added here without changing the repair flow itself.
 *
 * Final handoff approval is intentionally excluded: that remains a separate,
 * explicit Feature Journey decision and is never granted by this screen.
 */
export type OutcomeRefineryCapability = 'report-outcome-gap' | 'design-repair' | 'execute-repair';

export interface OutcomeRefineryAccess {
  actorLabel: string;
  capabilities: readonly OutcomeRefineryCapability[];
  canReportGap: boolean;
  canDesignRepair: boolean;
  canExecuteRepair: boolean;
  executionGuidance: string;
}

const technicalCapabilities: readonly OutcomeRefineryCapability[] = [
  'report-outcome-gap',
  'design-repair',
];

const executionCapabilities: readonly OutcomeRefineryCapability[] = [
  ...technicalCapabilities,
  'execute-repair',
];

export function outcomeRefineryAccess(actorPersona?: PersonaId, technicalRole?: TechnicalRole): OutcomeRefineryAccess {
  const isTechnicalRoute = actorPersona === 'developer';
  const effectiveTechnicalRole = technicalRole || 'combined';
  const canExecuteRepair = isTechnicalRoute && effectiveTechnicalRole !== 'architect';
  const capabilities = canExecuteRepair
    ? executionCapabilities
    : isTechnicalRoute
      ? technicalCapabilities
      : ['report-outcome-gap'] as const;

  const actorLabel = !actorPersona
    ? 'Unassigned role'
    : actorPersona === 'product-manager'
      ? 'Product Manager'
      : actorPersona === 'business-analyst'
        ? 'Business Analyst'
        : actorPersona === 'security-researcher'
          ? 'Security Researcher'
          : effectiveTechnicalRole === 'architect'
            ? 'Architect / Tech Lead'
            : effectiveTechnicalRole === 'developer'
              ? 'Developer'
              : 'Architect + Developer';

  const executionGuidance = canExecuteRepair
    ? 'You can start a bounded worktree repair after reviewing the contract.'
    : isTechnicalRoute
      ? 'You can diagnose and define the repair contract. A Developer executes any worktree repair.'
      : 'You can report and review the gap. A Developer executes any worktree repair.';

  return {
    actorLabel,
    capabilities,
    canReportGap: true,
    canDesignRepair: capabilities.includes('design-repair'),
    canExecuteRepair,
    executionGuidance,
  };
}
