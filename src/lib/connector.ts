import { SpecKitProject } from '../types/speckit';

export interface TruthReport {
  repositoryPath: string; repositoryName: string; scannedAt: string; files: string[]; filesTruncated: boolean;
  manifests: string[]; technologies: { category: string; name: string; version?: string; evidence: string; confidence: string }[];
  packageScripts: Record<string, string>; baselineCommands: { id: string; label: string; runner: 'npm'; script: string; workingDirectory: string }[]; git: { available: boolean; branch: string | null; status: string; remotes: string }; specKit: { detected: boolean; featureFile: boolean };
}
export interface ValidationResult { passed: boolean; errors: { code: string; message: string }[]; warnings: { code: string; message: string }[]; checkedAt: string; }
export interface WorkspaceFile { path: string; content: string; }
export interface WorkspaceChange { id: string; path: string; operation: 'create' | 'update'; current: string; proposed: string; }
export interface ConnectorJob { id: string; label: string; command: string; status: 'running' | 'succeeded' | 'failed'; output: string; startedAt: string; finishedAt: string | null; ok: boolean | null; }

export function connectorClient(baseUrl: string, token: string) {
  const request = async <T>(endpoint: string, payload?: unknown): Promise<T> => {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${endpoint}`, { method: payload ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Studio-Token': token } : {}) }, body: payload ? JSON.stringify(payload) : undefined });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Connector request failed.');
    return data as T;
  };
  return { health: () => request<{ status: string; version: string; tokenRequired: boolean }>('/health'), scan: (repositoryPath: string) => request<TruthReport>('/v1/repository/scan', { repositoryPath }), validate: (project: SpecKitProject) => request<ValidationResult>('/v1/validate', { project }), specKitStatus: (repositoryPath: string) => request<{ installed: boolean; version: { ok: boolean; output: string }; check: { ok: boolean; output: string } | null; prerequisites: { uvAvailable: boolean; uvOutput: string } }>('/v1/spec-kit/status', { repositoryPath }), installUv: (repositoryPath: string) => request<{ ok: boolean; output: string }>('/v1/prerequisites/install-uv', { repositoryPath, confirmation: 'INSTALL_UV' }), installSpecKit: (repositoryPath: string) => request<{ ok: boolean; output: string }>('/v1/spec-kit/install', { repositoryPath, confirmation: 'INSTALL_SPEC_KIT' }), initializeSpecKit: (repositoryPath: string, integration: string) => request<{ ok: boolean; output: string }>('/v1/spec-kit/initialize', { repositoryPath, integration, confirmation: 'INITIALIZE_SPEC_KIT' }), preview: (repositoryPath: string, files: WorkspaceFile[]) => request<{ changes: WorkspaceChange[] }>('/v1/workspace/preview', { repositoryPath, files }), apply: (repositoryPath: string, files: WorkspaceFile[]) => request<{ applied: Pick<WorkspaceChange, 'id' | 'path' | 'operation'>[] }>('/v1/workspace/apply', { repositoryPath, files, confirmation: 'APPLY' }), startBaseline: (repositoryPath: string, commandId: string) => request<ConnectorJob>('/v1/baseline/run', { repositoryPath, commandId }), startDependencyInstall: (repositoryPath: string, workingDirectory: string) => request<ConnectorJob>('/v1/dependencies/install', { repositoryPath, workingDirectory, confirmation: 'INSTALL_DEPENDENCIES' }), getJob: (id: string) => request<ConnectorJob>(`/v1/jobs/${encodeURIComponent(id)}`), execute: (repositoryPath: string, action: string) => request<{ action: string; ok: boolean; output: string }>('/v1/execute', { repositoryPath, action }) };
}
