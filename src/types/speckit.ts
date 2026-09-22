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

/** Human approvals for the guided, feature-scoped Spec-Kit workflow. */
export interface FeatureJourney {
  activeStage: number;
  completedStages: number[];
  startedAt: string;
  updatedAt: string;
}

/** A durable, feature-level receipt for work imported into a Studio workspace. */
export type FeatureImportSource = 'text' | 'file' | 'github' | 'preset' | 'repository' | 'unknown';

export interface FeatureInboxItem {
  id: string;
  /** Stable, tracker-friendly identity for safe concurrent feature work. */
  featureKey?: string;
  /** Filesystem-safe namespace; feature artifacts belong under specs/<slug>/. */
  slug?: string;
  branch?: string;
  worktreePath?: string;
  baselineCommit?: string;
  allowedSourceRoots?: string[];
  prohibitedPaths?: string[];
  dependencies?: string[];
  lifecycle?: 'draft' | 'planned' | 'implementing' | 'verifying' | 'handed-off';
  title: string;
  summary: string;
  source: FeatureImportSource;
  importedAt: string;
  userStoryIds: string[];
  requirementIds: string[];
  taskIds: string[];
  /** Read-only Stage 3 architecture evidence, explicitly accepted by a reviewer. */
  impactMap?: { content: string; acceptedAt?: string };
  /** Stage 4 Engine plan retained with the feature that it was created for. */
  architecturePlan?: { path?: string; content: string; acceptedAt?: string };
  /** Stage 5 task breakdown retained with the feature it delivers. */
  deliveryPlan?: { path?: string; content: string; acceptedAt?: string };
  /** Human-reviewed local implementation receipts. A receipt never commits or pushes code. */
  implementationReceipts?: FeatureImplementationReceipt[];
}

export interface FeatureImplementationReceipt {
  taskId: string;
  recordedAt: string;
  jobId: string;
  changedFiles: string[];
  diffStat: string;
  verificationSummary: string;
}

/** Independent, evidence-preserving Spec Kit processes. They never advance the Feature Journey. */
export type StudioProcessKind = 'bug' | 'assessment';
export type AssessmentVerdict = 'go' | 'needs-clarification' | 'kill';
export interface StudioProcessCase {
  id: string;
  kind: StudioProcessKind;
  slug: string;
  title: string;
  input: string;
  currentStep: number;
  completedSteps: number[];
  createdAt: string;
  updatedAt: string;
  verdict?: AssessmentVerdict;
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
  /** Immutable Git identity after a Connected Workspace scan. Optional for legacy projects. */
  repositoryIdentity?: {
    canonicalRemote: string;
    defaultBranch?: string;
    lastScannedBranch?: string;
    lastScannedAt: string;
  };
  stackProfile?: { id: string; runtime?: string; packageManager?: string; testCommands?: string[]; allowedSourceRoots?: string[]; prohibitedPaths?: string[]; };
  /** Feature-level import history. Optional to keep persisted legacy workspaces compatible. */
  featureInbox?: FeatureInboxItem[];
  /** Bug and idea-assessment case history, separate from feature delivery. */
  processCases?: StudioProcessCase[];
  /** The workflow the user is actively working in; it drives contextual navigation only. */
  workflowFocus?: 'feature' | StudioProcessKind;
  journey?: FeatureJourney;
  version: string;
}

export type ViewTab = 'overview' | 'workflows' | 'workspace' | 'spec' | 'plan' | 'tasks' | 'constitution' | 'prompt' | 'audit' | 'export' | 'import' | 'settings';
