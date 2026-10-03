import { DeliveryPullRequest, SpecKitProject } from '../types/speckit';
import { LocalAgentId, LocalAgentStatus } from './agentAvailability';
import { getConnectorSessionToken } from './connectorSession';

export const DEFAULT_CONNECTOR_URL = 'http://localhost:4318';
/** Broadcast when the shared, browser-local connector preferences change.
 * Screens that are already open can refresh their in-memory client without a
 * reload. This is deliberately a capability event, not a workflow event. */
export const CONNECTOR_CONFIGURATION_CHANGED_EVENT = 'speckit:connector-configuration-changed';
const CONNECTOR_REQUEST_TIMEOUT_MS = 20_000;
// Toolchain installation is explicit and can legitimately download/build a
// CLI. Keep normal connector calls responsive while bounding this operation.
const TOOLCHAIN_REQUEST_TIMEOUT_MS = 240_000;

/**
 * Centralizes Studio's loopback-only connector configuration. UI modules should
 * not need to know the storage key or repeat a fallback URL.
 */
export function configuredConnectorUrl(): string {
  const configured = window.localStorage.getItem('speckit_connector_url') || DEFAULT_CONNECTOR_URL;
  // Keep a single browser origin for local auth callbacks. Existing Studio
  // installations may have retained the older numeric loopback URL.
  return configured.replace(/^http:\/\/127\.0\.0\.1(?=[:/]|$)/i, 'http://localhost');
}

export function saveConfiguredConnectorUrl(connectorUrl: string): void {
  const normalized = connectorUrl.trim().replace(/\/$/, '').replace(/^http:\/\/127\.0\.0\.1(?=[:/]|$)/i, 'http://localhost');
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('speckit_connector_url', normalized || DEFAULT_CONNECTOR_URL);
    window.dispatchEvent(new Event(CONNECTOR_CONFIGURATION_CHANGED_EVENT));
  }
}

export interface ConnectorHealth {
  status: string;
  version: string;
  apiVersion?: number;
  capabilities?: string[];
  agentOperations?: Record<string, string[]>;
  deploymentMode?: 'standard' | 'govcloud' | 'dod';
  regulated?: boolean;
  tokenRequired: boolean;
  /** Present on current connectors; older connectors omit it. */
  tokenStatus?: 'not-required' | 'accepted' | 'missing' | 'rejected';
}

/**
 * Gives every capability-specific screen the same actionable explanation when
 * a Studio UI is newer than the connector process it is paired with. A 404
 * from the connector's catch-all route is otherwise indistinguishable to a
 * person from an empty result, even though their local configuration is fine.
 */
export function connectorCapabilityError(reason: unknown, capability: string): string {
  const message = reason instanceof Error ? reason.message.trim() : '';
  if (/^(not found\.?|connector request failed \(http 404\)\.)$/i.test(message)) {
    return `This local connector does not support ${capability} yet. Stop it, run \`npm run connector\` from this updated Spec-Kit Studio folder, then refresh Studio and try again.`;
  }
  return message || 'Studio could not complete this local connector action.';
}
export type AgentWriteScope = 'read-only' | 'workspace-write';
export type RequiredSpecKitArtifact = 'spec' | 'plan' | 'tasks';
export type ConnectorDeliveryPlanMode = 'detailed' | 'compact';

/** The connector needs only these immutable identity fields for its local
 * preflight. Never send retained transcripts, artifacts, or unrelated stories
 * back across the loopback boundary just to validate a feature worktree. */
export interface ConnectorPreflightProject {
  repositoryIdentity?: { canonicalRemote?: string };
  featureInbox?: Array<{ id?: string; featureKey?: string; slug?: string; branch?: string; worktreePath?: string; scope?: string }>;
  governanceSources?: Array<{ id: string; name: string; content: string }>;
}

export function connectorPreflightProject(project: SpecKitProject, featureId?: string): ConnectorPreflightProject {
  const feature = featureId ? project.featureInbox?.find((item) => item.id === featureId) : undefined;
  return {
    repositoryIdentity: project.repositoryIdentity ? { canonicalRemote: project.repositoryIdentity.canonicalRemote } : undefined,
    featureInbox: feature ? [{
      id: feature.id,
      featureKey: feature.featureKey,
      slug: feature.slug,
      branch: feature.branch,
      worktreePath: feature.worktreePath,
      scope: feature.scope,
    }] : [],
    // Older persisted projects can legitimately predate the constitution
    // record. Preflight remains identity-only and must not block recovery.
    governanceSources: (project.constitution?.governanceSources || []).map((source) => ({ id: source.id, name: source.name, content: source.content })),
  };
}

export function configuredConnectorClient(token?: string) {
  const baseUrl = configuredConnectorUrl();
  return connectorClient(baseUrl, token ?? getConnectorSessionToken(baseUrl));
}

export interface TruthReport {
  repositoryPath: string; repositoryName: string; scannedAt: string; files: string[]; filesTruncated: boolean;
  manifests: string[]; technologies: { category: string; name: string; version?: string; evidence: string; confidence: string }[];
  packageScripts: Record<string, string>; baselineCommands: { id: string; label: string; runner: string; kind: string; commandName: string; args: string[]; workingDirectory: string }[]; dependencyReadiness: { workingDirectory: string; manager: 'npm'; nodeModulesInstalled: boolean; hasLockfile: boolean }[]; agents: LocalAgentStatus[]; git: { available: boolean; branch: string | null; head: string | null; status: string; remotes: string }; specKit: { detected: boolean; featureFile: boolean; artifactFiles: string[]; hasWorkflowSetup: boolean };
}
export interface ValidationResult { passed: boolean; errors: { code: string; message: string }[]; warnings: { code: string; message: string }[]; checkedAt: string; }
export interface WorkspaceFile { path: string; content: string; }
export interface WorkspaceChange { id: string; path: string; operation: 'create' | 'update'; current: string; proposed: string; }
export interface ConnectorVisualEvidence {
  target: string;
  tool: string;
  artifacts: Array<{ name: 'desktop' | 'narrow'; path: string; bytes: number; mismatchRatio: number }>;
  report: { schemaVersion: 1; target: string; referenceImages: Array<{ alt?: string; url: string }>; viewports: Array<{ name: 'desktop' | 'narrow'; width: number; height: number; screenshot: string; comparison: { passed: true; mismatchRatio: number } }> };
}
export interface ConnectorJobEvidence { repositoryStatus: string; changedFiles: string[]; diffStat: string; visual?: ConnectorVisualEvidence; sandboxed?: boolean; promotedFiles?: string[]; discardedSandboxChanges?: boolean; }
export interface ConnectorJob { id: string; label: string; command: string; status: 'running' | 'succeeded' | 'failed' | 'cancelled'; output: string; startedAt: string; finishedAt: string | null; ok: boolean | null; evidence?: ConnectorJobEvidence | null; }
export interface SpecKitArtifact { path: string; kind: 'spec' | 'plan' | 'tasks' | string; content: string; modifiedAt: string; }
export interface SddEngineAdapterStatus { id: string; apiVersion: number; label: string; availability: 'available'; capabilities: string[]; artifactRoles: string[]; }
export interface FeatureCodePreview { path: string; status: string; content: string; patch: string; truncated: boolean; }
export interface FeaturePreflight { passed: boolean; errors: { code: string; message: string }[]; warnings: { code: string; message: string }[]; evidence: { remote: string; branch: string; commit: string; isLinkedWorktree: boolean }; checkedAt: string; }
export interface CreatedWorktree { repositoryPath: string; branch: string; baselineCommit: string; }
export interface DeliveryPublicationRequest {
  provider: 'github';
  title: string;
  body: string;
  baseBranch: string;
  project: ConnectorPreflightProject;
  featureId: string;
}
export interface FeatureIdentityMigration { moved: boolean; fromPath: string; toPath: string; }
export interface SpecKitStatus { installed: boolean; version: { ok: boolean; output: string }; check: { ok: boolean; output: string } | null; prerequisites: { uvAvailable: boolean; uvOutput: string }; compatibility?: { minimumVersion: string; compatible: boolean }; }
export interface LocalStoryExtraction {
  story: import('../types/speckit').UserStory;
  functionalRequirements: import('../types/speckit').FunctionalRequirement[];
  nonFunctionalRequirements?: import('../types/speckit').NonFunctionalRequirement[];
  compatibilityConstraints?: string[];
  sourceSummary?: string;
}
export interface GitHubMilestoneImport { sourceUrl: string; owner: string; repository: string; number: number; title: string; description: string; images: Array<{ alt: string; url: string }>; state: 'open' | 'closed'; dueOn: string | null; openIssues: number; closedIssues: number; issues: Array<{ number: number; title: string; body: string; state: 'open' | 'closed'; url?: string }>; }
/** Bounded workflow state sent to the local Guide; never repository source,
 * credentials, or prior chat history. */
export interface StudioGuideChatContext {
  screen: string;
  projectName: string;
  featureTitle?: string;
  stage?: { id: number; title: string; ready: boolean; readyHint: string };
  tasks?: Array<{ id: string; state: 'reviewed' | 'checked' | 'planned'; title: string }>;
}
export interface StudioGuideChatResponse { answer: string; provider: 'copilot' | 'codex'; }
/** A repository-free, read-only persona draft. The response is parsed by the
 * persona adapter that requested it; it is never accepted automatically. */
export interface PersonaDraftResponse { output: string; provider: string; label: string; }
export interface StudioGuideVisualAttachment { role: 'reference' | 'output'; mimeType: 'image/jpeg'; data: string; }
/** Bounded input forwarded only to the repository's explicitly declared visual
 * verifier. Image binaries are never copied into the worktree or retained. */
export interface VisualVerificationInput { expectedOutcome: string; referenceImages?: Array<{ alt?: string; url: string }>; }

/**
 * Prepares only the dependency graph already declared by the visual workspace
 * before a bounded repair starts. This never guesses or adds packages.
 */
export async function startFeatureVisualPreparation(repositoryPath: string): Promise<ConnectorJob> {
  const baseUrl = configuredConnectorUrl().replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl)) throw new Error('For safety, visual preparation can connect only to your local connector URL.');
  const response = await fetch(`${baseUrl}/v1/feature/visual-prepare`, {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...(getConnectorSessionToken(baseUrl) ? { 'X-Studio-Token': getConnectorSessionToken(baseUrl) } : {}) },
    body: JSON.stringify({ repositoryPath, confirmation: 'PREPARE_FEATURE_VISUAL' }),
  });
  const data = await response.json().catch(() => ({} as { error?: string }));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Studio could not prepare visual verification dependencies.');
  return data as ConnectorJob;
}

export async function startFeatureVisualVerification(repositoryPath: string, input: VisualVerificationInput): Promise<ConnectorJob> {
  const baseUrl = configuredConnectorUrl().replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl)) throw new Error('For safety, visual verification can connect only to your local connector URL.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONNECTOR_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/v1/feature/visual-verify`, {
      method: 'POST', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(getConnectorSessionToken(baseUrl) ? { 'X-Studio-Token': getConnectorSessionToken(baseUrl) } : {}) },
      body: JSON.stringify({ repositoryPath, ...input, confirmation: 'VERIFY_FEATURE_VISUAL' }),
    });
    const data = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Studio could not start visual acceptance verification.');
    return data as ConnectorJob;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Studio could not start visual acceptance verification within 20 seconds. Confirm the local connector is running, then retry.');
    throw error;
  } finally { window.clearTimeout(timeout); }
}

/** Explicit visual-review call. Images stay in browser memory until this is
 * invoked, then travel only over the paired loopback connector. */
export async function reviewStudioGuideImages(repositoryPath: string, question: string, context: StudioGuideChatContext, agent: 'copilot' | 'codex', images: StudioGuideVisualAttachment[]): Promise<StudioGuideChatResponse> {
  const baseUrl = configuredConnectorUrl().replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl)) throw new Error('For safety, visual review can connect only to your local connector URL.');
  if (images.length !== 2 || new Set(images.map((image) => image.role)).size !== 2) throw new Error('Attach one reference image and one current-output image before visual review.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 75_000);
  try {
    const response = await fetch(`${baseUrl}/v1/studio-guide/chat`, {
      method: 'POST', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(getConnectorSessionToken(baseUrl) ? { 'X-Studio-Token': getConnectorSessionToken(baseUrl) } : {}) },
      body: JSON.stringify({ repositoryPath, question, context, agent, images }),
    });
    const data = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Visual review failed (HTTP ${response.status}).`);
    return data as StudioGuideChatResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Visual review did not respond within 75 seconds. The images were not retained by Studio.');
    throw error;
  } finally { window.clearTimeout(timeout); }
}

/** Read review artifacts through a connector-declared SDD adapter. The engine
 * id is metadata only; the connector resolves it to trusted local code. */
export async function readSddEngineArtifacts(repositoryPath: string, engineId = 'github-spec-kit', token?: string): Promise<{ artifacts: SpecKitArtifact[] }> {
  const baseUrl = configuredConnectorUrl().replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl)) throw new Error('For safety, Studio can connect only to a local connector URL.');
  const response = await fetch(`${baseUrl}/v1/sdd-engines/artifacts/read`, {
    method: 'POST', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...((token ?? getConnectorSessionToken(baseUrl)) ? { 'X-Studio-Token': token ?? getConnectorSessionToken(baseUrl) } : {}) },
    body: JSON.stringify({ repositoryPath, engineId }),
  });
  const data = await response.json().catch(() => ({} as { error?: string; artifacts?: SpecKitArtifact[] }));
  if (!response.ok) throw new Error(data.error || 'Studio could not read SDD engine artifacts.');
  return { artifacts: data.artifacts || [] };
}

async function requestSddEngineLifecycle<T>(endpoint: string, repositoryPath: string, engineId: string | undefined, payload: Record<string, unknown>, token?: string): Promise<T> {
  const baseUrl = configuredConnectorUrl().replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl)) throw new Error('For safety, Studio can connect only to a local connector URL.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONNECTOR_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...((token ?? getConnectorSessionToken(baseUrl)) ? { 'X-Studio-Token': token ?? getConnectorSessionToken(baseUrl) } : {}) },
      body: JSON.stringify({ repositoryPath, engineId: engineId || 'github-spec-kit', ...payload }),
    });
    const data = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) throw new Error(data.error || 'Studio could not complete the SDD engine operation.');
    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Studio could not get a response from the local connector within 20 seconds. Confirm it is running, then retry.');
    throw error;
  } finally { window.clearTimeout(timeout); }
}

/** Generic lifecycle entry points. The current GitHub Spec Kit adapter is the
 * only verified implementation, but callers no longer need engine-specific routes. */
export function sddEngineStatus(repositoryPath: string, engineId?: string, token?: string): Promise<SpecKitStatus> {
  return requestSddEngineLifecycle('/v1/sdd-engines/status', repositoryPath, engineId, {}, token);
}
export function installSddEngine(repositoryPath: string, engineId?: string, token?: string): Promise<{ ok: boolean; output: string }> {
  return requestSddEngineLifecycle('/v1/sdd-engines/install', repositoryPath, engineId, { confirmation: 'INSTALL_SDD_ENGINE' }, token);
}
export function initializeSddEngine(repositoryPath: string, engineId: string | undefined, integration: string, token?: string): Promise<{ ok: boolean; output: string }> {
  return requestSddEngineLifecycle('/v1/sdd-engines/initialize', repositoryPath, engineId, { integration, confirmation: 'INITIALIZE_SDD_ENGINE' }, token);
}

/** Start a bounded workflow stage through a connector-declared SDD adapter.
 * The engine id is never an executable or install URL: the local connector
 * maps it to a trusted implementation and re-runs authoritative preflight. */
export async function startSddEngineStage(repositoryPath: string, engineId: string | undefined, agent: LocalAgentId, prompt: string, project?: ConnectorPreflightProject, featureId?: string, writeScope: AgentWriteScope = 'workspace-write', requiredArtifact?: RequiredSpecKitArtifact, expectedArtifactPath?: string, deliveryPlanMode?: ConnectorDeliveryPlanMode, compactTaskCount?: number, token?: string): Promise<ConnectorJob> {
  const baseUrl = configuredConnectorUrl().replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl)) throw new Error('For safety, Studio can connect only to a local connector URL.');
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONNECTOR_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/v1/sdd-engines/stage/run`, {
      method: 'POST', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...((token ?? getConnectorSessionToken(baseUrl)) ? { 'X-Studio-Token': token ?? getConnectorSessionToken(baseUrl) } : {}) },
      body: JSON.stringify({ repositoryPath, engineId: engineId || 'github-spec-kit', agent, prompt, project, featureId, writeScope, requiredArtifact, expectedArtifactPath, deliveryPlanMode, compactTaskCount, confirmation: 'RUN_SDD_ENGINE_STAGE' }),
    });
    const data = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) throw new Error(data.error || 'Studio could not start the SDD engine stage.');
    return data as ConnectorJob;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Studio could not start the SDD engine stage within 20 seconds. Confirm the local connector is running, then retry.');
    throw error;
  } finally { window.clearTimeout(timeout); }
}

export function connectorClient(baseUrl: string, token: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(normalizedBaseUrl)) {
    throw new Error('For safety, Studio can connect only to a local connector URL (localhost or 127.0.0.1). Open Connected Workspace to correct it.');
  }
  const request = async <T>(endpoint: string, payload?: unknown, timeoutMs = endpoint === '/v1/prerequisites/install-uv' || endpoint === '/v1/spec-kit/install' ? TOOLCHAIN_REQUEST_TIMEOUT_MS : CONNECTOR_REQUEST_TIMEOUT_MS): Promise<T> => {
    let response: Response;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const method = payload !== undefined ? 'POST' : 'GET';
      response = await fetch(`${normalizedBaseUrl}${endpoint}`, { method, cache: endpoint === '/health' ? 'no-store' : 'default', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Studio-Token': token } : {}) }, body: payload ? JSON.stringify(payload) : undefined, signal: controller.signal });
    } catch {
      if (timedOut) {
        throw new Error(timeoutMs === TOOLCHAIN_REQUEST_TIMEOUT_MS
          ? 'The local toolchain update did not finish within 4 minutes. Check the connector terminal for a network, proxy, or package-install error, then retry.'
          : 'Studio could not get a response from the local connector within 20 seconds. Start or restart it, then confirm its URL and pairing token in Connected Workspace.');
      }
      throw new Error('Studio could not reach the local connector. Start or restart it, then confirm its URL and pairing token in Connected Workspace.');
    } finally {
      window.clearTimeout(timeout);
    }
    const data = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Connector request failed (HTTP ${response.status}).`);
    return data as T;
  };
  return { health: () => request<ConnectorHealth>('/health'), selectRepositoryDirectory: () => request<{ cancelled: boolean; repositoryPath?: string }>('/v1/repository/select-directory', { confirmation: 'OPEN_DIRECTORY_PICKER' }, 125_000), listRepositoryDirectories: (parentPath?: string) => request<{ parentPath: string | null; directories: Array<{ name: string; path: string }> }>('/v1/repository/directories', { parentPath }), scan: (repositoryPath: string) => request<TruthReport>('/v1/repository/scan', { repositoryPath }), availableAgents: () => request<{ agents: LocalAgentStatus[] }>('/v1/agents/available'), preparePersonaDraft: (agent: LocalAgentId, persona: string, prompt: string) => request<PersonaDraftResponse>('/v1/persona-draft/prepare', { agent, persona, prompt, confirmation: 'PREPARE_PERSONA_DRAFT' }, 95_000), studioGuideChat: (repositoryPath: string, question: string, context: StudioGuideChatContext, agent: 'copilot' | 'codex' = 'copilot') => request<StudioGuideChatResponse>('/v1/studio-guide/chat', { repositoryPath, question, context, agent }, 75_000), readGitHubMilestone: (url: string) => request<{ milestone: GitHubMilestoneImport }>('/v1/github/milestone/read', { url }), readSpecKitArtifacts: (repositoryPath: string) => request<{ artifacts: SpecKitArtifact[] }>('/v1/spec-kit/artifacts/read', { repositoryPath }), migrateFeatureIdentity: (repositoryPath: string, fromSlug: string, toSlug: string) => request<FeatureIdentityMigration>('/v1/spec-kit/feature/migrate-identity', { repositoryPath, fromSlug, toSlug, confirmation: 'MIGRATE_FEATURE_IDENTITY' }), readFeatureCode: (repositoryPath: string, paths: string[]) => request<{ files: FeatureCodePreview[]; omitted: number }>('/v1/repository/feature-code', { repositoryPath, paths }), validate: (project: SpecKitProject) => request<ValidationResult>('/v1/validate', { project }), preflight: (repositoryPath: string, project: ConnectorPreflightProject, featureId?: string) => request<FeaturePreflight>('/v1/feature/preflight', { repositoryPath, project, featureId }), createDeliveryPublication: (repositoryPath: string, publication: DeliveryPublicationRequest) => request<{ publication: DeliveryPullRequest }>('/v1/delivery/publications/create', { repositoryPath, ...publication, confirmation: 'CREATE_DELIVERY_PUBLICATION' }, 95_000), createWorktree: (repositoryPath: string, targetPath: string, branch: string) => request<CreatedWorktree>('/v1/worktree/create', { repositoryPath, targetPath, branch, confirmation: 'CREATE_WORKTREE' }), specKitStatus: (repositoryPath: string) => request<SpecKitStatus>('/v1/spec-kit/status', { repositoryPath }), installUv: (repositoryPath: string) => request<{ ok: boolean; output: string }>('/v1/prerequisites/install-uv', { repositoryPath, confirmation: 'INSTALL_UV' }), installSpecKit: (repositoryPath: string) => request<{ ok: boolean; output: string }>('/v1/spec-kit/install', { repositoryPath, confirmation: 'INSTALL_SPEC_KIT' }), initializeSpecKit: (repositoryPath: string, integration: string) => request<{ ok: boolean; output: string }>('/v1/spec-kit/initialize', { repositoryPath, integration, confirmation: 'INITIALIZE_SPEC_KIT' }), preview: (repositoryPath: string, files: WorkspaceFile[]) => request<{ changes: WorkspaceChange[] }>('/v1/workspace/preview', { repositoryPath, files }), apply: (repositoryPath: string, files: WorkspaceFile[]) => request<{ applied: Pick<WorkspaceChange, 'id' | 'path' | 'operation'>[] }>('/v1/workspace/apply', { repositoryPath, files, confirmation: 'APPLY' }), startBaseline: (repositoryPath: string, commandId: string) => request<ConnectorJob>('/v1/baseline/run', { repositoryPath, commandId }), startDependencyInstall: (repositoryPath: string, workingDirectory: string) => request<ConnectorJob>('/v1/dependencies/install', { repositoryPath, workingDirectory, confirmation: 'INSTALL_DEPENDENCIES' }), startSpecKitAgent: (repositoryPath: string, agent: LocalAgentId, prompt: string, project?: ConnectorPreflightProject, featureId?: string, writeScope: AgentWriteScope = 'workspace-write', requiredArtifact?: RequiredSpecKitArtifact, expectedArtifactPath?: string, deliveryPlanMode?: ConnectorDeliveryPlanMode, compactTaskCount?: number) => request<ConnectorJob>('/v1/spec-kit/agent/run', { repositoryPath, agent, prompt, project, featureId, writeScope, requiredArtifact, expectedArtifactPath, deliveryPlanMode, compactTaskCount, confirmation: 'RUN_SPEC_KIT_AGENT' }), startLocalAgentTask: (repositoryPath: string, agent: LocalAgentId, taskId: string, featureTitle: string, prompt: string, project?: ConnectorPreflightProject, featureId?: string) => request<ConnectorJob>('/v1/local-agent/task/run', { repositoryPath, agent, prompt, taskId, featureTitle, project, featureId, confirmation: 'RUN_LOCAL_AGENT_TASK' }), startFeatureVerification: (repositoryPath: string) => request<ConnectorJob>('/v1/feature/verify', { repositoryPath, confirmation: 'VERIFY_FEATURE' }), activeJob: (repositoryPath: string) => request<{ job: ConnectorJob | null }>('/v1/jobs/active', { repositoryPath }).then((response) => response.job), cancelJob: (jobId: string) => request<ConnectorJob>(`/v1/jobs/cancel`, { jobId }), getJob: (id: string) => request<ConnectorJob>(`/v1/jobs/${encodeURIComponent(id)}`), execute: (repositoryPath: string, action: string) => request<{ action: string, ok: boolean; output: string }>('/v1/execute', { repositoryPath, action }) };
}

/** Recover a running job when the user navigates away from its original task. */
export async function activeConnectorJob(baseUrl: string, token: string, repositoryPath: string): Promise<ConnectorJob | null> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(normalizedBaseUrl)) {
    throw new Error('For safety, Studio can connect only to a local connector URL (localhost or 127.0.0.1).');
  }
  let response: Response;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CONNECTOR_REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(`${normalizedBaseUrl}/v1/jobs/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Studio-Token': token } : {}) },
      body: JSON.stringify({ repositoryPath }), signal: controller.signal,
    });
  } catch {
    throw new Error('Studio could not get a response from the local connector within 20 seconds. Start or restart it, then confirm its URL and pairing token in Connected Workspace.');
  } finally {
    window.clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({} as { error?: string; job?: ConnectorJob | null }));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Connector request failed (HTTP ${response.status}).`);
  return data.job || null;
}

/** Read current Git evidence without starting an agent or modifying the repository. */
export async function repositoryEvidenceSnapshot(baseUrl: string, token: string, repositoryPath: string): Promise<ConnectorJobEvidence> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(normalizedBaseUrl)) {
    throw new Error('For safety, Studio can connect only to a local connector URL (localhost or 127.0.0.1).');
  }
  let response: Response;
  try {
    response = await fetch(`${normalizedBaseUrl}/v1/repository/evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Studio-Token': token } : {}) },
      body: JSON.stringify({ repositoryPath }),
    });
  } catch {
    throw new Error('Studio cannot reach the local connector. Start or restart `npm run connector`, then confirm its URL and pairing token in Connected Workspace.');
  }
  const data = await response.json().catch(() => ({} as { error?: string; evidence?: ConnectorJobEvidence }));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Connector request failed (HTTP ${response.status}).`);
  if (!data.evidence) throw new Error('Studio could not read Git evidence from this repository.');
  return data.evidence;
}

/** Extract one reviewable story with the runtime-selected local agent. */
export async function extractStoryWithLocalAgent(repositoryPath: string, agent: LocalAgentId, storyContent: string, storyTitle?: string): Promise<LocalStoryExtraction> {
  const client = configuredConnectorClient();
  const baseUrl = configuredConnectorUrl().replace(/\/$/, '');
  const token = getConnectorSessionToken();
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(baseUrl)) {
    throw new Error('For safety, Studio can connect only to a local connector URL (localhost or 127.0.0.1).');
  }
  // Instantiate first so malformed connector configuration fails consistently
  // with all other connector actions.
  void client;
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/story/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Studio-Token': token } : {}) },
      body: JSON.stringify({ repositoryPath, agent, storyContent, storyTitle, sourceType: 'text' }),
    });
  } catch {
    throw new Error('Studio cannot reach the local connector. Start `npm run connector`, pair it in Connected Workspace, and retry.');
  }
  const body = await response.json().catch(() => ({} as { error?: string; data?: LocalStoryExtraction }));
  if (response.status === 404) {
    throw new Error('Your local connector is older than this Studio UI and does not support local story extraction. Stop the connector, update this repository, run `npm run connector` from the updated spec-kit-studio folder, then refresh Studio and retry.');
  }
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : `Connector request failed (HTTP ${response.status}).`);
  if (!body.data) throw new Error('The local connector did not return a story package.');
  return body.data;
}
