import { AgentCapability, LocalAgentStatus, recommendedLocalAgent } from './agentAvailability';
import { getStudioSettings } from './studioSettings';

export const LOCAL_AGENT_STORAGE_KEY = 'speckit_local_agents';

export interface LocalAgentScan {
  scanned: boolean;
  agents: LocalAgentStatus[];
}

function isLocalAgentStatus(value: unknown): value is LocalAgentStatus {
  return Boolean(value && typeof value === 'object'
    && typeof (value as LocalAgentStatus).id === 'string'
    && typeof (value as LocalAgentStatus).label === 'string'
    && typeof (value as LocalAgentStatus).installed === 'boolean');
}

/** The browser cache is advisory only; the connector revalidates every run. */
export function readRuntimeAgentScan(storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): LocalAgentScan {
  if (!storage) return { scanned: false, agents: [] };
  try {
    const value = JSON.parse(storage.getItem(LOCAL_AGENT_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? { scanned: true, agents: value.filter(isLocalAgentStatus) } : { scanned: false, agents: [] };
  } catch { return { scanned: false, agents: [] }; }
}

export function saveRuntimeAgentScan(agents: LocalAgentStatus[], storage: Storage | undefined = typeof window === 'undefined' ? undefined : window.localStorage): void {
  if (!storage) return;
  storage.setItem(LOCAL_AGENT_STORAGE_KEY, JSON.stringify(agents.filter(isLocalAgentStatus)));
  window.dispatchEvent(new Event('speckit-agents-change'));
}

/** Resolves the Settings preference against the current connector capabilities. */
export function selectedRuntimeAgent(capability?: AgentCapability, scan = readRuntimeAgentScan()): LocalAgentStatus | undefined {
  return recommendedLocalAgent(scan.agents, getStudioSettings().preferredAgent, capability);
}
