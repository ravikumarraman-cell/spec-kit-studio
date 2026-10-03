import { type ReactNode } from 'react';
import { BusinessAnalysisPackage, DeveloperArchitecturePackage, DeliveryScope, FeatureInboxItem, PersonaDecisionReceipt, PersonaId, ProductOutcomePackage, SecurityResearchPackage, SpecKitProject, TechnicalRole, ViewTab } from '../../types/speckit';
import { acceptedPersonaArtifact } from '../../lib/personas/consumption';
import { BusinessAnalystPanel } from './BusinessAnalystPanel';
import { DeveloperArchitectPanel } from './DeveloperArchitectPanel';
import { ProductManagerPanel } from './ProductManagerPanel';
import { ProductManagerStart } from './ProductManagerStart';
import { SecurityResearcherPanel } from './SecurityResearcherPanel';

export interface PersonaPanelProps {
  project: SpecKitProject;
  personaId: PersonaId;
  feature?: FeatureInboxItem;
  technicalRole: TechnicalRole;
  onCreateFeature: (personaId: PersonaId, title: string, summary: string) => boolean;
  onSaveProductOutcome: (featureId: string, outcome: ProductOutcomePackage) => void;
  onSaveProductManagerDecision: (featureId: string, decision: PersonaDecisionReceipt) => void;
  onSaveDeveloperArchitecture: (featureId: string, artifact: DeveloperArchitecturePackage) => void;
  onSaveTechnicalRole: (featureId: string, role: TechnicalRole) => void;
  onSaveBusinessAnalysis: (featureId: string, artifact: BusinessAnalysisPackage) => void;
  onSaveSecurityResearch: (featureId: string, artifact: SecurityResearchPackage) => void;
  onNavigate: (tab: ViewTab) => void;
  onImportFeature: (personaId: PersonaId, scope?: DeliveryScope) => void;
}

export interface PersonaPanelDefinition {
  render: (props: PersonaPanelProps) => ReactNode;
  /** A technical Architect stops at the common handoff; all other panels use
   * the regular shared handoff behavior. */
  shouldShowHandoff?: (props: PersonaPanelProps) => boolean;
}

const developerHandoffReady = ({ project, feature, technicalRole }: PersonaPanelProps) => technicalRole === 'architect' && Boolean(feature?.developerArchitecture?.acceptedAt) && Boolean(project.journey?.completedStages.includes(4));

/**
 * UI extension point for specialist work. The common PersonaWorkspace does
 * not branch on persona identity: it asks this registry for the focused panel
 * and keeps lifecycle, handoff, imports, and shared-Journey navigation common.
 */
export const personaPanelRegistry: Readonly<Record<PersonaId, PersonaPanelDefinition>> = {
  'product-manager': {
    render: ({ project, personaId, feature, onCreateFeature, onSaveProductOutcome, onSaveProductManagerDecision, onNavigate, onImportFeature }) => {
      const hasMatchingFeature = Boolean(feature && (feature.personaRoute === personaId || acceptedPersonaArtifact(feature, personaId)));
      return hasMatchingFeature
        ? <ProductManagerPanel project={project} onSaveOutcome={onSaveProductOutcome} onSaveDecision={onSaveProductManagerDecision} onOpenJourney={() => onNavigate('journey')} onOpenFeatureReview={() => onNavigate('spec')} />
        : <ProductManagerStart onCreate={(title, summary) => onCreateFeature(personaId, title, summary)} onImport={() => onImportFeature(personaId)} />;
    },
  },
  'business-analyst': {
    render: ({ project, personaId, onSaveBusinessAnalysis, onImportFeature }) => <BusinessAnalystPanel project={project} onSave={onSaveBusinessAnalysis} onImport={(scope) => onImportFeature(personaId, scope)} />,
  },
  developer: {
    render: ({ project, personaId, feature, technicalRole, onSaveDeveloperArchitecture, onSaveTechnicalRole, onNavigate, onImportFeature }) => <><section className="rounded-2xl border border-violet-400/25 bg-violet-500/5 p-5"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Technical delivery route</p><h1 className="mt-1 text-2xl font-bold text-zinc-100">Architecture and development have clear ownership</h1><p className="mt-2 text-sm text-zinc-300">Architects stop after the approved Stage 4 design. Developers begin at the earliest unfinished delivery stage with that accepted evidence in context.</p></section><DeveloperArchitectPanel project={project} onSave={onSaveDeveloperArchitecture} onImport={(scope) => onImportFeature(personaId, scope)} onConnectWorkspace={() => onNavigate('workspace')} technicalRole={technicalRole} onTechnicalRoleChange={(role) => feature && onSaveTechnicalRole(feature.id, role)} onOpenJourney={() => onNavigate('journey')} /></>,
    shouldShowHandoff: developerHandoffReady,
  },
  'security-researcher': {
    render: ({ project, personaId, onSaveSecurityResearch, onImportFeature }) => <SecurityResearcherPanel project={project} onSave={onSaveSecurityResearch} onImport={(scope) => onImportFeature(personaId, scope)} />,
  },
};

export function personaPanelDefinition(personaId: PersonaId): PersonaPanelDefinition {
  return personaPanelRegistry[personaId];
}
