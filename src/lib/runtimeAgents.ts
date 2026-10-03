import { AgentCapability, LocalAgentStatus, recommendedLocalAgent } from './agentAvailability';
import { getStudioSettings } from './studioSettings';
import { configuredConnectorClient } from './connector';

export const LOCAL_AGENT_STORAGE_KEY = 'speckit_local_agents';
let latestRefreshRequest = 0;

export type LocalAgentScanSource = 'none' | 'legacy-cache' | 'connector' | 'workspace';

export interface LocalAgentScan {
  scanned: boolean;
  agents: LocalAgentStatus[];
  checkedAt?: string;
  source: LocalAgentScanSource;
}

interface StoredLocalAgentScan {
  version: 1;
  agents: LocalAgentStatus[];
  checkedAt: string;
  source: 'connector' | 'workspace';
}

function isLocalAgentStatus(value: unknown): value is LocalAgentStatus {
  return Boolean(value && typeof value === 'object'
    && typeof (value as LocalAgentStatus).id === 'string'
    && typeof (value as LocalAgentStatus).label === 'string'
    && typeof (value as LocalAgentStatus).installed === 'boolean');
}

/** The browser cache is advisory only; the connector revalidates every run. */
export function readRuntimeAgentScan(storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): LocalAgentScan {
  if (!storage) return { scanned: false, agents: [], source: 'none' };
  try {
    const value: unknown = JSON.parse(storage.getItem(LOCAL_AGENT_STORAGE_KEY) || 'null');
    if (Array.isArray(value)) return { scanned: false, agents: value.filter(isLocalAgentStatus), source: 'legacy-cache' };
    if (!value || typeof value !== 'object') return { scanned: false, agents: [], source: 'none' };
    const snapshot = value as Partial<StoredLocalAgentScan>;
    if (snapshot.version !== 1 || !Array.isArray(snapshot.agents) || typeof snapshot.checkedAt !== 'string'
      || (snapshot.source !== 'connector' && snapshot.source !== 'workspace')) {
      return { scanned: false, agents: [], source: 'none' };
    }
    return { scanned: true, agents: snapshot.agents.filter(isLocalAgentStatus), checkedAt: snapshot.checkedAt, source: snapshot.source };
  } catch { return { scanned: false, agents: [], source: 'none' }; }
}

export function saveRuntimeAgentScan(agents: LocalAgentStatus[], storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage, source: 'connector' | 'workspace' = 'workspace'): LocalAgentScan {
  const snapshot: StoredLocalAgentScan = { version: 1, agents: agents.filter(isLocalAgentStatus), checkedAt: new Date().toISOString(), source };
  if (storage) storage.setItem(LOCAL_AGENT_STORAGE_KEY, JSON.stringify(snapshot));
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('speckit-agents-change'));
  return { scanned: true, agents: snapshot.agents, checkedAt: snapshot.checkedAt, source };
}

/**
 * The sole browser-side agent discovery path. All screens share the same
 * ordered request stream, which prevents a slow older response from replacing
 * a newer connector result with an incorrect "not detected" status.
 */
export async function refreshRuntimeAgentScan(repositoryPath: string, token?: string): Promise<LocalAgentScan> {
  const request = ++latestRefreshRequest;
  const report = await configuredConnectorClient(token).scan(repositoryPath);
  if (request !== latestRefreshRequest) return readRuntimeAgentScan();
  return saveRuntimeAgentScan(report.agents, undefined, 'workspace');
}

/**
 * Discovers available agents without opening or inspecting a repository.
 * Persona drafting uses this path so Product, Business Analysis, and Security
 * work can start from their source material alone.
 */
export async function refreshRuntimeAgentAvailability(token?: string): Promise<LocalAgentScan> {
  const request = ++latestRefreshRequest;
  const response = await configuredConnectorClient(token).availableAgents();
  if (request !== latestRefreshRequest) return readRuntimeAgentScan();
  return saveRuntimeAgentScan(response.agents, undefined, 'connector');
}

/** Resolves the Settings preference against the current connector capabilities. */
export function selectedRuntimeAgent(capability?: AgentCapability, scan = readRuntimeAgentScan()): LocalAgentStatus | undefined {
  return scan.scanned ? recommendedLocalAgent(scan.agents, getStudioSettings().preferredAgent, capability) : undefined;
}
