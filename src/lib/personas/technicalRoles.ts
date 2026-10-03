import { FeatureInboxItem, TechnicalRole } from '../../types/speckit';

export interface TechnicalRoleDefinition {
  id: TechnicalRole;
  label: string;
  title: string;
  summary: string;
  responsibility: string;
  handoffTitle: string;
  handoffContents: string[];
}

/** A reusable technical-ownership policy. It deliberately does not alter the
 * persisted `developer` PersonaId, keeping all existing workspaces and ZIPs
 * compatible while allowing the experience to name a clear handoff boundary. */
export const technicalRoleDefinitions: Readonly<Record<TechnicalRole, TechnicalRoleDefinition>> = {
  architect: {
    id: 'architect', label: 'Architect / Tech Lead', title: 'Define the technical shape',
    summary: 'Turn approved product and repository evidence into an intentional architecture, then hand it to development.',
    responsibility: 'Stop after the approved architecture plan at Stage 4. Developers own task planning, implementation, and delivery approval.',
    handoffTitle: 'Your architecture handoff is ready',
    handoffContents: ['Approved impact map and architecture plan', 'Technical decision, change surface, guardrails, and trade-offs', 'Verification, rollout, rollback, risks, and open decisions'],
  },
  developer: {
    id: 'developer', label: 'Developer', title: 'Turn an approved design into delivery',
    summary: 'Consume the reviewed architecture, make delivery tasks actionable, and implement only after the quality gate.',
    responsibility: 'Begin with the earliest unmet engineering stage—normally Stage 5 after an architecture handoff.',
    handoffTitle: 'Development delivery is ready',
    handoffContents: ['Reviewed technical context', 'Delivery tasks, implementation receipts, and final verification evidence'],
  },
  combined: {
    id: 'combined', label: 'Architect + Developer', title: 'Own the technical path end to end',
    summary: 'One person may complete architecture and delivery in the same workspace without creating an artificial handoff.',
    responsibility: 'Pause at the same review boundaries: Stage 4 architecture approval, Stage 6 quality gate, and Stage 8 final handoff.',
    handoffTitle: 'Technical handoff is ready',
    handoffContents: ['Approved technical decision and architecture plan', 'Verification, rollout, rollback, and open decisions'],
  },
};

export function technicalRoleForFeature(feature?: FeatureInboxItem): TechnicalRole {
  return feature?.technicalRole || 'combined';
}

export function technicalRoleDefinition(role: TechnicalRole): TechnicalRoleDefinition {
  return technicalRoleDefinitions[role];
}
