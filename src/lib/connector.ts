import { SpecKitProject } from '../types/speckit';
import { LocalAgentId, LocalAgentStatus } from './agentAvailability';

export interface TruthReport {
  repositoryPath: string; repositoryName: string; scannedAt: string; files: string[]; filesTruncated: boolean;
  manifests: string[]; technologies: { category: string; name: string; version?: string; evidence: string; confidence: string }[];
  packageScripts: Record<string, string>; baselineCommands: { id: string; label: string; runner: string; kind: string; commandName: string; args: string[]; workingDirectory: string }[]; agents: LocalAgentStatus[]; git: { available: boolean; branch: string | null; status: string; remotes: string }; specKit: { detected: boolean; featureFile: boolean };
}
export interface ValidationResult { passed: boolean; errors: { code: string; message: string }[]; warnings: { code: string; message: string }[]; checkedAt: string; }
export interface WorkspaceFile { path: string; content: string; }
export interface WorkspaceChange { id: string; path: string; operation: 'create' | 'update'; current: string; proposed: string; }
export interface ConnectorJobEvidence { repositoryStatus: string; changedFiles: string[]; diffStat: string; }
export interface ConnectorJob { id: string; label: string; command: string; status: 'running' | 'succeeded' | 'failed' | 'cancelled'; output: string; startedAt: string; finishedAt: string | null; ok: boolean | null; evidence?: ConnectorJobEvidence | null; }
export interface SpecKitArtifact { path: string; kind: 'spec' | 'plan' | 'tasks' | string; content: string; modifiedAt: string; }

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
  return { health: () => request<{ status: string; version: string; tokenRequired: boolean }>('/health'), scan: (repositoryPath: string) => request<TruthReport>('/v1/repository/scan', { repositoryPath }), readSpecKitArtifacts: (repositoryPath: string) => request<{ artifacts: SpecKitArtifact[] }>('/v1/spec-kit/artifacts/read', { repositoryPath }), validate: (project: SpecKitProject) => request<ValidationResult>('/v1/validate', { project }), specKitStatus: (repositoryPath: string) => request<{ installed: boolean; version: { ok: boolean; output: string }; check: { ok: boolean; output: string } | null; prerequisites: { uvAvailable: boolean; uvOutput: string } }>('/v1/spec-kit/status', { repositoryPath }), installUv: (repositoryPath: string) => request<{ ok: boolean; output: string }>('/v1/prerequisites/install-uv', { repositoryPath, confirmation: 'INSTALL_UV' }), installSpecKit: (repositoryPath: string) => request<{ ok: boolean; output: string }>('/v1/spec-kit/install', { repositoryPath, confirmation: 'INSTALL_SPEC_KIT' }), initializeSpecKit: (repositoryPath: string, integration: string) => request<{ ok: boolean; output: string }>('/v1/spec-kit/initialize', { repositoryPath, integration, confirmation: 'INITIALIZE_SPEC_KIT' }), preview: (repositoryPath: string, files: WorkspaceFile[]) => request<{ changes: WorkspaceChange[] }>('/v1/workspace/preview', { repositoryPath, files }), apply: (repositoryPath: string, files: WorkspaceFile[]) => request<{ applied: Pick<WorkspaceChange, 'id' | 'path' | 'operation'>[] }>('/v1/workspace/apply', { repositoryPath, files, confirmation: 'APPLY' }), startBaseline: (repositoryPath: string, commandId: string) => request<ConnectorJob>('/v1/baseline/run', { repositoryPath, commandId }), startDependencyInstall: (repositoryPath: string, workingDirectory: string) => request<ConnectorJob>('/v1/dependencies/install', { repositoryPath, workingDirectory, confirmation: 'INSTALL_DEPENDENCIES' }), startSpecKitAgent: (repositoryPath: string, agent: LocalAgentId, prompt: string) => request<ConnectorJob>('/v1/spec-kit/agent/run', { repositoryPath, agent, prompt, confirmation: 'RUN_SPEC_KIT_AGENT' }), startCodexTask: (repositoryPath: string, taskId: string, featureTitle: string, prompt: string) => request<ConnectorJob>('/v1/codex/task/run', { repositoryPath, taskId, featureTitle, prompt, confirmation: 'RUN_CODEX_TASK' }), startLocalAgentTask: (repositoryPath: string, agent: LocalAgentId, taskId: string, featureTitle: string, prompt: string) => request<ConnectorJob>('/v1/local-agent/task/run', { repositoryPath, agent, taskId, featureTitle, prompt, confirmation: 'RUN_LOCAL_AGENT_TASK' }), startFeatureVerification: (repositoryPath: string) => request<ConnectorJob>('/v1/feature/verify', { repositoryPath, confirmation: 'VERIFY_FEATURE' }), cancelJob: (jobId: string) => request<ConnectorJob>('/v1/jobs/cancel', { jobId }), getJob: (id: string) => request<ConnectorJob>(`/v1/jobs/${encodeURIComponent(id)}`), execute: (repositoryPath: string, action: string) => request<{ action: string; ok: boolean; output: string }>('/v1/execute', { repositoryPath, action }) };
}
