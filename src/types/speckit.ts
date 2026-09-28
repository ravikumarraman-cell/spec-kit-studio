export type Priority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type RequirementCategory = 'Core' | 'UI/UX' | 'API' | 'Database' | 'Security' | 'Performance' | 'Integration';
export interface ReferenceImage { alt: string; url: string; }

export interface UserStory {
  id: string;
  title: string;
  priority: Priority;
  asA: string;
  iWantTo: string;
  soThat: string;
  acceptanceCriteria: string[];
  requirementIds?: string[];
  /** HTTPS visual evidence retained with the story; never copied into source files. */
  referenceImages?: ReferenceImage[];
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

/** A baseline is reusable only for the exact repository revision and branch
 * that produced it. It is evidence, never an approval. */
export interface WorkspaceBaselineEvidence {
  repositoryPath: string;
  branch: string | null;
  commit: string | null;
  recordedAt: string;
  results: Array<{ label: string; ok: boolean; output: string }>;
  manual?: boolean;
}

/** Human approvals for the guided, feature-scoped Spec-Kit workflow. */
export interface FeatureJourney {
  /** The feature this journey is currently operating on; never infer from inbox order. */
  featureId?: string;
  activeStage: number;
  completedStages: number[];
  startedAt: string;
  updatedAt: string;
  /** Bounded local delivery observability; no source, prompt, or secret data. */
  observability?: JourneyObservability;
}

export type JourneyAttemptOutcome = 'succeeded' | 'failed' | 'approved';
export interface JourneyStageAttempt {
  id: string;
  stageId: number;
  operation: 'agent' | 'human-approval';
  outcome: JourneyAttemptOutcome;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}
export interface JourneyObservability { attempts: JourneyStageAttempt[]; }

/** A durable, feature-level receipt for work imported into a Studio workspace. */
export type FeatureImportSource = 'text' | 'file' | 'github' | 'preset' | 'repository' | 'unknown';
export type DeliveryScope = 'feature' | 'user-story';

export interface FeatureInboxItem {
  id: string;
  /** Missing on legacy records; absence always means feature scope. */
  scope?: DeliveryScope;
  /** The one authoritative story when this item has user-story scope. */
  primaryStoryId?: string;
  /** Optional provenance only; it never controls artifact ownership. */
  parentFeatureId?: string;
  /** Item-owned progress used when switching between delivery items. */
  journey?: FeatureJourney;
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
  /** Immutable, bounded source brief retained so engine packets do not lose
   * acceptance clauses during import extraction. Never used for credentials. */
  sourceContent?: string;
  source: FeatureImportSource;
  importedAt: string;
  userStoryIds: string[];
  requirementIds: string[];
  taskIds: string[];
  /** Visual evidence can originate from a feature brief, story, or milestone. */
  referenceImages?: ReferenceImage[];
  /** Official Spec-Kit specification retained after Stage 2 review. */
  specification?: { path?: string; content: string; acceptedAt?: string };
  /** Read-only Stage 3 architecture evidence, explicitly accepted by a reviewer. */
  impactMap?: { content: string; acceptedAt?: string };
  /** Stage 4 Engine plan retained with the feature that it was created for. */
  architecturePlan?: { path?: string; content: string; acceptedAt?: string };
  /** Stage 5 task breakdown retained with the feature it delivers. */
  deliveryPlan?: { path?: string; content: string; acceptedAt?: string; repositoryPath?: string; executionMode?: 'standard' | 'demo' };
  /** Human-reviewed local implementation receipts. A receipt never commits or pushes code. */
  implementationReceipts?: FeatureImplementationReceipt[];
  /** Optional Outcome Refinery state, owned by this delivery item. */
  outcomeRefinery?: OutcomeRefineryRun;
  /** Historical receipts from an earlier delivery-plan revision. They remain
   * exportable evidence but never satisfy the current plan's completion gate. */
  supersededImplementationReceipts?: FeatureImplementationReceipt[];
  /** Delivery-item-owned quality evidence. Legacy features may use project.audit. */
  qualityAudit?: SpecAuditResult;
}

export interface FeatureImplementationReceipt {
  taskId: string;
  recordedAt: string;
  jobId: string;
  changedFiles: string[];
  diffStat: string;
  verificationSummary: string;
}

/** Evidence-preserving repair workflow for a feature whose delivered outcome
 * did not meet its approved expectation. All mutations remain feature scoped. */
export type OutcomeRefineryStatus = 'idle' | 'diagnosed' | 'ready-to-run' | 'running' | 'verifying' | 'repaired' | 'needs-decision' | 'failed';
export type OutcomeGapKind = 'specification' | 'data-source' | 'visual-design' | 'behavior' | 'accessibility' | 'verification';
export type OutcomeFindingConfidence = 'observed' | 'inferred' | 'unknown';
export interface OutcomeRefineryFinding {
  id: string;
  kind: OutcomeGapKind;
  confidence: OutcomeFindingConfidence;
  title: string;
  evidence: string;
  repair: string;
  requiresDecision?: boolean;
}
export interface OutcomeRefineryReceipt {
  id: string;
  step: 'diagnose' | 'contract' | 'artifact-repair' | 'verification';
  outcome: 'succeeded' | 'failed' | 'stopped';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  summary: string;
}
/** Durable, bounded record of the connector work started by Outcome Refinery.
 * It is observability only: a successful job never substitutes for review. */
export interface OutcomeRefineryAutopilotAttempt {
  number: number;
  agentId: string;
  taskId: string;
  status: 'running' | 'agent-failed' | 'verification-failed' | 'evidence-ready' | 'stopped';
  startedAt: string;
  finishedAt?: string;
  agentJobId?: string;
  verificationJobId?: string;
  changedFiles?: string[];
  summary?: string;
}
export interface OutcomeRefineryRun {
  id: string;
  status: OutcomeRefineryStatus;
  expectedOutcome: string;
  deliveredOutcome: string;
  findings: OutcomeRefineryFinding[];
  contractMarkdown?: string;
  receipts: OutcomeRefineryReceipt[];
  attemptCount: number;
  startedAt: string;
  updatedAt: string;
  /** Explicit user consent for one bounded, feature-scoped repair run. */
  autopilotEnabled?: boolean;
  /** Connector job history for this run. Never contains raw command output. */
  autopilotAttempts?: OutcomeRefineryAutopilotAttempt[];
  stopReason?: string;
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
  /** A durable record that Studio received a successful agent result for a step. Completion still requires review. */
  stepReceipts?: Array<{ step: number; completedAt: string; summary?: string; changedFiles?: string[]; diffStat?: string; repositoryStatus?: string; command?: string }>;
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
  workspaceBaseline?: WorkspaceBaselineEvidence;
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

export type ViewTab = 'overview' | 'journey' | 'refinery' | 'workflows' | 'workspace' | 'spec' | 'plan' | 'tasks' | 'constitution' | 'prompt' | 'audit' | 'export' | 'import' | 'settings';
