export type Priority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type RequirementCategory = 'Core' | 'UI/UX' | 'API' | 'Database' | 'Security' | 'Performance' | 'Integration';

export interface UserStory {
  id: string;
  title: string;
  priority: Priority;
  asA: string;
  iWantTo: string;
  soThat: string;
  acceptanceCriteria: string[];
}

export interface FunctionalRequirement {
  id: string;
  title: string;
  description: string;
  category: RequirementCategory;
  priority: Priority;
}

export interface NonFunctionalRequirement {
  id: string;
  title: string;
  description: string;
  metric?: string;
}

export interface FeatureSpec {
  id: string;
  title: string;
  summary: string;
  userStories: UserStory[];
  functionalRequirements: FunctionalRequirement[];
  nonFunctionalRequirements: NonFunctionalRequirement[];
  userFlows: string[];
  edgeCases: string[];
  successMetrics: string[];
  markdown: string;
  lastUpdated: string;
}

export interface TechStackItem {
  category: string;
  technology: string;
  justification: string;
  version?: string;
}

export interface ComponentSpec {
  name: string;
  purpose: string;
  layer: 'Frontend' | 'Backend' | 'Database' | 'Shared' | 'Service';
}

export interface ApiContract {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  payload?: string;
  response?: string;
}

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface DataSchema {
  modelName: string;
  fields: SchemaField[];
}

export interface ADR {
  id: string;
  title: string;
  status: 'Proposed' | 'Accepted' | 'Superceded' | 'Rejected';
  context: string;
  decision: string;
  consequences: string;
  date: string;
}

export interface ImplementationPlan {
  id: string;
  techStack: TechStackItem[];
  architectureSummary: string;
  components: ComponentSpec[];
  apiContracts: ApiContract[];
  dataSchemas: DataSchema[];
  adrs: ADR[];
  mermaidDiagram: string;
  markdown: string;
  lastUpdated: string;
}

export interface TaskItem {
  id: string;
  title: string;
  phase: 'Phase 1: Setup' | 'Phase 2: Core Infrastructure' | 'Phase 3: Integration' | 'Phase 4: Polish & Testing';
  description: string;
  status: TaskStatus;
  estimatedHours: number;
  mappedRequirementId?: string;
  dependencies: string[];
  targetAgentPromptSnippet?: string;
  completedAt?: string;
}

export interface TaskBreakdown {
  id: string;
  tasks: TaskItem[];
  markdown: string;
  lastUpdated: string;
}

export interface ConstitutionRule {
  id: string;
  title: string;
  category: 'Coding Standard' | 'Architecture' | 'Testing & QA' | 'Security' | 'Git & Release';
  description: string;
  ruleStatement: string;
  strictness: 'Mandatory' | 'Recommended' | 'Optional';
}

export interface ProjectConstitution {
  id: string;
  title: string;
  rules: ConstitutionRule[];
  markdown: string;
  lastUpdated: string;
}

export interface AuditRecommendation {
  category: string;
  suggestion: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface DetectedTech {
  id: string;
  category: 'Frontend' | 'Backend' | 'Database' | 'State' | 'Styling' | 'Testing' | 'Infra/DevOps' | 'Other';
  name: string;
  version?: string;
  confidence: 'High' | 'Medium' | 'Low';
  fileEvidence: string;
  selectedForNewFeature: boolean;
}

export interface ImportedRepository {
  repoUrl?: string;
  repoName: string;
  description: string;
  primaryLanguage: string;
  detectedTechStack: DetectedTech[];
  architectureSummary: string;
  keyDirectories: string[];
  suggestedNewFeatures: string[];
  importedAt: string;
}

export interface SpecAuditResult {
  lastAudited: string;
  overallScore: number;
  completenessScore: number;
  clarityScore: number;
  testabilityScore: number;
  traceabilityScore: number;
  summary: string;
  gaps: string[];
  ambiguities: string[];
  recommendations: AuditRecommendation[];
}

export interface SpecKitProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  spec: FeatureSpec;
  plan: ImplementationPlan;
  tasks: TaskBreakdown;
  constitution: ProjectConstitution;
  audit?: SpecAuditResult;
  importedRepo?: ImportedRepository;
  version: string;
}

export type ViewTab = 'overview' | 'workspace' | 'spec' | 'plan' | 'tasks' | 'constitution' | 'prompt' | 'audit' | 'export' | 'import';
