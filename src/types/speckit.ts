export type Priority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type RequirementCategory = 'Core' | 'UI/UX' | 'API' | 'Database' | 'Security' | 'Performance' | 'Integration';
/** A remote URL or a compact, browser-prepared JPEG retained only in the
 * local Studio project. Uploaded evidence is capped before it is stored. */
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

/** Locally retained evidence that informed constitutional rules. Source text
 * stays reviewable; only explicit rules are enforced in delivery prompts. */
export interface GovernanceSourceDocument {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  content: string;
  uploadedAt: string;
}

export interface ProjectConstitution {
  id: string;
  title: string;
  rules: ConstitutionRule[];
  governanceSources?: GovernanceSourceDocument[];
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
  /** The role that started this shared route. Kept on the Journey so navigation
   * and handoff context survive even when restoring a legacy feature record. */
  personaRoute?: PersonaId;
  /** The role currently responsible for the shared Journey. This is distinct
   * from `personaRoute`, which is immutable handoff provenance. */
  activePersona?: PersonaId;
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

/** Persona evidence is feature-owned and never grants connector permissions. */
export type PersonaId = 'product-manager' | 'business-analyst' | 'developer' | 'security-researcher';
/** Engine profiles may define companion artifacts in addition to their core
 * executable documents. Never assume every persona produces a plan. */
export type SddEngineArtifactKind = 'spec' | 'plan' | 'tasks' | 'research';
/** Stable persona identity and technical ownership are intentionally separate:
 * archives and saved workspaces keep the former, while this controls the UX. */
export type TechnicalRole = 'architect' | 'developer' | 'combined';
export interface ProductOutcomeMeasure { id: string; metric: string; target: string; sourceOfTruth: string; cadence?: string; }
export interface ProductOutcomeDecision { id: string; statement: string; status: 'decided' | 'open'; owner?: string; }
export interface ProductOutcomePackage {
  schemaVersion: 1;
  path: string;
  title: string;
  targetUsers: string[];
  problem: string;
  desiredOutcome: string;
  nonGoals: string[];
  successMeasures: ProductOutcomeMeasure[];
  assumptions: Array<{ id: string; statement: string; owner?: string }>;
  decisions: ProductOutcomeDecision[];
  acceptanceAnchors: Array<{ id: string; statement: string }>;
  markdown: string;
  specKitProjection: { kind: 'spec'; path: string; content: string };
  preparedAt: string;
  acceptedAt?: string;
}
export interface PersonaDecisionReceipt { personaId: PersonaId; status: 'accepted' | 'skipped'; reason?: string; recordedAt: string; }
/** A role's explicit completion acknowledgement. It is feature-owned so the
 * completion receipt survives navigation and never starts another role. */
export interface PersonaWorkflowCompletion { personaId: PersonaId; completedAt: string; }

/** A human-reviewed technical decision package. It is advisory evidence for
 * the Feature Journey and never authorizes code execution or release. */
export interface DeveloperArchitecturePackage {
  schemaVersion: 1;
  path: string;
  title: string;
  outcome: string;
  scope: 'feature' | 'user-story';
  selectedRequirementIds: string[];
  changeSurface: Array<{ id: string; area: string; change: string; confidence: 'observed' | 'assumption' }>;
  options: Array<{ id: string; title: string; summary: string; tradeoffs: string }>;
  selectedOptionId: string;
  rationale: string;
  guardrails: string[];
  risks: Array<{ id: string; risk: string; mitigation: string }>;
  verification: string[];
  rollout: string;
  rollback: string;
  openQuestions: string[];
  preparedAt: string;
  acceptedAt?: string;
  markdown: string;
  specKitProjection: { kind: 'plan'; path: string; content: string };
}

/** Reviewable analysis evidence. It clarifies delivery scope but never changes
 * the underlying specification or authorizes implementation. */
export interface BusinessAnalysisPackage {
  schemaVersion: 1;
  path: string;
  title: string;
  scope: 'feature' | 'user-story';
  problem: string;
  stakeholders: string[];
  inScope: string[];
  outOfScope: string[];
  acceptanceEvidence: string[];
  assumptions: string[];
  openQuestions: string[];
  preparedAt: string;
  acceptedAt?: string;
  markdown: string;
  specKitProjection: { kind: 'spec'; path: string; content: string };
}

/** Security assessment evidence. Findings are advisory and must be reviewed
 * through the existing Journey before implementation or release decisions. */
export interface SecurityResearchPackage {
  schemaVersion: 1;
  path: string;
  title: string;
  scope: 'feature' | 'user-story';
  securityBoundary: string;
  assets: string[];
  findings: Array<{ id: string; severity: 'low' | 'medium' | 'high'; finding: string; mitigation: string }>;
  requiredControls: string[];
  verification: string[];
  openQuestions: string[];
  preparedAt: string;
  acceptedAt?: string;
  markdown: string;
  specKitProjection: { kind: 'research'; path: string; content: string };
}

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
  /** Final verification is feature-scoped evidence for Stage 8. It is either
   * connector-run or explicitly recorded human review when no safe command is declared. */
  finalVerification?: FeatureFinalVerificationReceipt;
  /** Persisted only after an explicitly confirmed publication completes. */
  pullRequest?: DeliveryPullRequest;
  /** Optional Outcome Refinery state, owned by this delivery item. */
  outcomeRefinery?: OutcomeRefineryRun;
  /** Product Manager evidence is reviewable context for later developer planning. */
  productOutcome?: ProductOutcomePackage;
  productManagerDecision?: PersonaDecisionReceipt;
  /** Architect/Tech Lead decision evidence, kept independently of engine plan. */
  developerArchitecture?: DeveloperArchitecturePackage;
  businessAnalysis?: BusinessAnalysisPackage;
  securityResearch?: SecurityResearchPackage;
  /** Explicit role completion receipts for delivery-awareness reporting. */
  personaWorkflowCompletions?: PersonaWorkflowCompletion[];
  /** The contributor route that created this feature. It guides the first
   * workspace without turning a persona into a mandatory engineering stage. */
  personaRoute?: PersonaId;
  /** Legacy records safely use the combined technical role. */
  technicalRole?: TechnicalRole;
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
  /** Agent-run timing is optional for legacy/manual receipts. Never infer it
   * from the later human-review timestamp. */
  startedAt?: string;
  finishedAt?: string;
  changedFiles: string[];
  diffStat: string;
  verificationSummary: string;
}

export interface FeatureFinalVerificationReceipt {
  method: 'automated' | 'manual';
  recordedAt: string;
  summary: string;
  output?: string;
}

export interface DeliveryPullRequest {
  provider: 'github';
  url: string;
  number?: number;
  title: string;
  baseBranch: string;
  headBranch: string;
  createdAt: string;
  state: 'open';
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
  status: 'running' | 'agent-failed' | 'verification-failed' | 'visual-verification-failed' | 'evidence-ready' | 'stopped';
  startedAt: string;
  finishedAt?: string;
  agentJobId?: string;
  verificationJobId?: string;
  visualVerificationJobId?: string;
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
export type SddEngineId = 'github-spec-kit' | 'openspec' | 'bmad-method' | 'tessl' | 'kiro';
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
  /** Legacy projects retain GitHub Spec Kit unless the user selects another engine. */
  sddEngine?: SddEngineId;
  /** Versioned selection metadata, migrated automatically from legacy projects. */
  sddEngineSchemaVersion?: 1;
}

export type ViewTab = 'overview' | 'personas' | 'journey' | 'refinery' | 'workflows' | 'workspace' | 'spec' | 'plan' | 'tasks' | 'constitution' | 'prompt' | 'audit' | 'export' | 'import' | 'settings';
