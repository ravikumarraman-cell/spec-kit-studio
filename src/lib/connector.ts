import { SpecKitProject } from '../types/speckit';
import { LocalAgentId, LocalAgentStatus } from './agentAvailability';
import { getConnectorSessionToken } from './connectorSession';

export const DEFAULT_CONNECTOR_URL = 'http://127.0.0.1:4318';

/**
 * Centralizes Studio's loopback-only connector configuration. UI modules should
 * not need to know the storage key or repeat a fallback URL.
 */
export function configuredConnectorUrl(): string {
  return window.localStorage.getItem('speckit_connector_url') || DEFAULT_CONNECTOR_URL;
}

export function configuredConnectorClient(token = getConnectorSessionToken()) {
  return connectorClient(configuredConnectorUrl(), token);
}

export interface TruthReport {
  repositoryPath: string; repositoryName: string; scannedAt: string; files: string[]; filesTruncated: boolean;
  manifests: string[]; technologies: { category: string; name: string; version?: string; evidence: string; confidence: string }[];
  packageScripts: Record<string, string>; baselineCommands: { id: string; label: string; runner: string; kind: string; commandName: string; args: string[]; workingDirectory: string }[]; dependencyReadiness: { workingDirectory: string; manager: 'npm'; nodeModulesInstalled: boolean; hasLockfile: boolean }[]; agents: LocalAgentStatus[]; git: { available: boolean; branch: string | null; status: string; remotes: string }; specKit: { detected: boolean; featureFile: boolean; artifactFiles: string[]; hasWorkflowSetup: boolean };
}
export interface ValidationResult { passed: boolean; errors: { code: string; message: string }[]; warnings: { code: string; message: string }[]; checkedAt: string; }
export interface WorkspaceFile { path: string; content: string; }
export interface WorkspaceChange { id: string; path: string; operation: 'create' | 'update'; current: string; proposed: string; }
export interface ConnectorJobEvidence { repositoryStatus: string; changedFiles: string[]; diffStat: string; }
export interface ConnectorJob { id: string; label: string; command: string; status: 'running' | 'succeeded' | 'failed' | 'cancelled'; output: string; startedAt: string; finishedAt: string | null; ok: boolean | null; evidence?: ConnectorJobEvidence | null; }
export interface SpecKitArtifact { path: string; kind: 'spec' | 'plan' | 'tasks' | string; content: string; modifiedAt: string; }
export interface FeatureCodePreview { path: string; status: string; content: string; patch: string; truncated: boolean; }
export interface FeaturePreflight { passed: boolean; errors: { code: string; message: string }[]; warnings: { code: string; message: string }[]; evidence: { remote: string; branch: string; commit: string; isLinkedWorktree: boolean }; checkedAt: string; }
export interface CreatedWorktree { repositoryPath: string; branch: string; baselineCommit: string; }
export interface LocalStoryExtraction {
  story: import('../types/speckit').UserStory;
  functionalRequirements: import('../types/speckit').FunctionalRequirement[];
  nonFunctionalRequirements?: import('../types/speckit').NonFunctionalRequirement[];
  compatibilityConstraints?: string[];
  sourceSummary?: string;
}

export function connectorClient(baseUrl: string, token: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(normalizedBaseUrl)) {
    throw new Error('For safety, Studio can connect only to a local connector URL (localhost or 127.0.0.1). Open Connected Workspace to correct it.');
  }
  const request = async <T>(endpoint: string, payload?: unknown): Promise<T> => {
    let response: Response;
    try {
      response = await fetch(`${normalizedBaseUrl}${endpoint}`, { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Studio-Token': token } : {}) }, body: payload ? JSON.stringify(payload) : undefined });
    } catch {
      throw new Error('Studio cannot reach the local connector. Start or restart `npm run connector`, then confirm its URL and pairing token in Connected Workspace.');
    }
    const data = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : `Connector request failed (HTTP ${response.status}).`);
    return data as T;
  };
  return { health: () => request<{ status: string; version: string; tokenRequired: boolean }>('/health'), scan: (repositoryPath: string) => request<TruthReport>('/v1/repository/scan', { repositoryPath }), readSpecKitArtifacts: (repositoryPath: string) => request<{ artifacts: SpecKitArtifact[] }>('/v1/spec-kit/artifacts/read', { repositoryPath }), readFeatureCode: (repositoryPath: string, paths: string[]) => request<{ files: FeatureCodePreview[]; omitted: number }>('/v1/repository/feature-code', { repositoryPath, paths }), validate: (project: SpecKitProject) => request<ValidationResult>('/v1/validate', { project }), preflight: (repositoryPath: string, project: SpecKitProject, featureId?: string) => request<FeaturePreflight>('/v1/feature/preflight', { repositoryPath, project, featureId }), createWorktree: (repositoryPath: string, targetPath: string, branch: string) => request<CreatedWorktree>('/v1/worktree/create', { repositoryPath, targetPath, branch, confirmation: 'CREATE_WORKTREE' }), specKitStatus: (repositoryPath: string) => request<{ installed: boolean; version: { ok: boolean; output: string }; check: { ok: boolean; output: string } | null; prerequisites: { uvAvailable: boolean; uvOutput: string } }>('/v1/spec-kit/status', { repositoryPath }), installUv: (repositoryPath: string) => request<{ ok: boolean; output: string }>('/v1/prerequisites/install-uv', { repositoryPath, confirmation: 'INSTALL_UV' }), installSpecKit: (repositoryPath: string) => request<{ ok: boolean; output: string }>('/v1/spec-kit/install', { repositoryPath, confirmation: 'INSTALL_SPEC_KIT' }), initializeSpecKit: (repositoryPath: string, integration: string) => request<{ ok: boolean; output: string }>('/v1/spec-kit/initialize', { repositoryPath, integration, confirmation: 'INITIALIZE_SPEC_KIT' }), preview: (repositoryPath: string, files: WorkspaceFile[]) => request<{ changes: WorkspaceChange[] }>('/v1/workspace/preview', { repositoryPath, files }), apply: (repositoryPath: string, files: WorkspaceFile[]) => request<{ applied: Pick<WorkspaceChange, 'id' | 'path' | 'operation'>[] }>('/v1/workspace/apply', { repositoryPath, files, confirmation: 'APPLY' }), startBaseline: (repositoryPath: string, commandId: string) => request<ConnectorJob>('/v1/baseline/run', { repositoryPath, commandId }), startDependencyInstall: (repositoryPath: string, workingDirectory: string) => request<ConnectorJob>('/v1/dependencies/install', { repositoryPath, workingDirectory, confirmation: 'INSTALL_DEPENDENCIES' }), startSpecKitAgent: (repositoryPath: string, agent: LocalAgentId, prompt: string, project?: SpecKitProject, featureId?: string) => request<ConnectorJob>('/v1/spec-kit/agent/run', { repositoryPath, agent, prompt, project, featureId, confirmation: 'RUN_SPEC_KIT_AGENT' }), startLocalAgentTask: (repositoryPath: string, agent: LocalAgentId, taskId: string, featureTitle: string, prompt: string, project?: SpecKitProject, featureId?: string) => request<ConnectorJob>('/v1/local-agent/task/run', { repositoryPath, agent, prompt, taskId, featureTitle, project, featureId, confirmation: 'RUN_LOCAL_AGENT_TASK' }), startFeatureVerification: (repositoryPath: string) => request<ConnectorJob>('/v1/feature/verify', { repositoryPath, confirmation: 'VERIFY_FEATURE' }), cancelJob: (jobId: string) => request<ConnectorJob>('/v1/jobs/cancel', { jobId }), getJob: (id: string) => request<ConnectorJob>(`/v1/jobs/${encodeURIComponent(id)}`), execute: (repositoryPath: string, action: string) => request<{ action: string; ok: boolean; output: string }>('/v1/execute', { repositoryPath, action }) };
}

/** Recover a running job when the user navigates away from its original task. */
export async function activeConnectorJob(baseUrl: string, token: string, repositoryPath: string): Promise<ConnectorJob | null> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  if (!/^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(normalizedBaseUrl)) {
    throw new Error('For safety, Studio can connect only to a local connector URL (localhost or 127.0.0.1).');
  }
  let response: Response;
  try {
    response = await fetch(`${normalizedBaseUrl}/v1/jobs/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Studio-Token': token } : {}) },
      body: JSON.stringify({ repositoryPath }),
    });
  } catch {
    throw new Error('Studio cannot reach the local connector. Start or restart `npm run connector`, then confirm its URL and pairing token in Connected Workspace.');
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
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : `Connector request failed (HTTP ${response.status}).`);
  if (!body.data) throw new Error('The local connector did not return a story package.');
  return body.data;
}
