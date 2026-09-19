import { postApi } from './client';
import { requireObjectField } from './guards';
import {
  ApiContract,
  ConstitutionRule,
  DetectedTech,
  FunctionalRequirement,
  ImportedRepository,
  NonFunctionalRequirement,
  TechStackItem,
  UserStory,
} from '../../types/speckit';

export interface RepositoryAnalysisRequest { repoUrl?: string; manifestContent?: string; files?: unknown[]; }
export interface RepositoryAnalysisResponse { success: true; data: Partial<ImportedRepository>; }
export interface FeatureExtractionRequest { featureContent: string; featureTitle?: string; sourceType: string; }
export interface FeatureExtractionPackage {
  title?: string;
  summary?: string;
  userStories?: UserStory[];
  functionalRequirements?: FunctionalRequirement[];
  nonFunctionalRequirements?: NonFunctionalRequirement[];
  userFlows?: string[];
  techStack?: TechStackItem[];
  apiContracts?: ApiContract[];
  mermaidDiagram?: string;
  tasks?: GeneratedFeatureTask[];
  constitutionRules?: GeneratedConstitutionRule[];
}

export interface FeatureExtractionResponse { success: true; data: FeatureExtractionPackage; }
export interface ImportedFeatureGenerationRequest {
  importedRepo: ImportedRepository;
  selectedTechStack: DetectedTech[];
  newFeatureTitle: string;
  newFeatureGoal: string;
}
export interface GeneratedFeatureTask {
  id?: string;
  title?: string;
  phase?: string;
  description?: string;
  estimatedHours?: number;
  mappedRequirementId?: string;
  targetAgentPromptSnippet?: string;
}

export interface GeneratedConstitutionRule {
  id?: string;
  title?: string;
  category?: ConstitutionRule['category'];
  description?: string;
  ruleStatement?: string;
  strictness?: ConstitutionRule['strictness'];
}

export interface ImportedFeaturePackage {
  title?: string;
  summary?: string;
  userStories?: UserStory[];
  functionalRequirements?: FunctionalRequirement[];
  techStack?: TechStackItem[];
  apiContracts?: ApiContract[];
  mermaidDiagram?: string;
  tasks?: GeneratedFeatureTask[];
  constitutionRules?: GeneratedConstitutionRule[];
}

export interface ImportedFeatureGenerationResponse { success: true; data: ImportedFeaturePackage; }

function parseDataEnvelope<T>(envelope: Record<string, unknown>): { success: true; data: T } {
  return { success: true, data: requireObjectField(envelope, 'data') as T };
}

export const importApi = {
  analyzeRepository: (request: RepositoryAnalysisRequest) => postApi<RepositoryAnalysisResponse, RepositoryAnalysisRequest>('/api/repo/analyze', request, parseDataEnvelope<Partial<ImportedRepository>>),
  extractFeature: (request: FeatureExtractionRequest) => postApi<FeatureExtractionResponse, FeatureExtractionRequest>('/api/feature/import', request, parseDataEnvelope<FeatureExtractionPackage>),
  generateFeatureForImportedRepository: (request: ImportedFeatureGenerationRequest) =>
    postApi<ImportedFeatureGenerationResponse, ImportedFeatureGenerationRequest>('/api/repo/generate-feature-for-imported', request, parseDataEnvelope<ImportedFeaturePackage>),
};
