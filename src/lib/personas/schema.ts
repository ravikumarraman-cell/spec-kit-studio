import { BusinessAnalysisPackage, DeveloperArchitecturePackage, PersonaId, ProductOutcomePackage, SddEngineArtifactKind, SecurityResearchPackage } from '../../types/speckit';

export type PersonaEngagement = 'recommended' | 'not-applicable' | 'complete' | 'skipped';
export interface PersonaRecommendation {
  personaId: PersonaId;
  engagement: PersonaEngagement;
  title: string;
  reason: string;
  creates: string[];
  changesCode: false;
}

export interface PersonaArtifactAdapter<T> {
  personaId: PersonaId;
  artifactLabel: string;
  parse: (output: string, context: { title: string; path: string; now: string }) => T | undefined;
  render: (artifact: T) => string;
  /** Canonical, feature-scoped engine projection consumed by downstream roles.
   * The selected engine determines how this projection is validated. */
  toEngineArtifact: (artifact: T) => { kind: SddEngineArtifactKind; path: string; content: string };
}

export type ProductManagerArtifactAdapter = PersonaArtifactAdapter<ProductOutcomePackage>;
export type DeveloperArchitectureArtifactAdapter = PersonaArtifactAdapter<DeveloperArchitecturePackage>;
export type BusinessAnalysisArtifactAdapter = PersonaArtifactAdapter<BusinessAnalysisPackage>;
export type SecurityResearchArtifactAdapter = PersonaArtifactAdapter<SecurityResearchPackage>;
