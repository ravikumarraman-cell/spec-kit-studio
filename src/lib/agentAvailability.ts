/**
 * Agent identities are connector-owned strings rather than a Studio enum.
 * This lets a newly configured local CLI participate without a frontend
 * release, while the connector remains the authority that can execute it.
 */
export type LocalAgentId = string;
export type AgentCapability = 'planning' | 'implementation' | 'story-extraction';

export interface LocalAgentStatus {
  id: LocalAgentId;
  label: string;
  installed: boolean;
  version?: string;
  capabilities?: AgentCapability[];
}

/** Known adapters are only a deterministic tie-breaker, never an allowlist. */
export const localAgentOrder = ['claude', 'codex', 'copilot'];

const knownLabels: Record<string, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  copilot: 'GitHub Copilot CLI',
};

/**
 * Compatibility view for older presentation code. It resolves connector-scan
 * labels dynamically, so custom adapters never collapse to an empty label.
 */
export const localAgentLabels: Record<string, string> = new Proxy(knownLabels, {
  get(target, property) {
    if (typeof property !== 'string') return undefined;
    if (target[property]) return target[property];
    try {
      const agents = JSON.parse(window.localStorage.getItem('speckit_local_agents') || '[]');
      const agent = Array.isArray(agents) ? agents.find((item) => item?.id === property && typeof item.label === 'string') : undefined;
      return agent?.label || property;
    } catch { return property; }
  },
});

export function localAgentLabel(agent: Pick<LocalAgentStatus, 'id' | 'label'> | string): string {
  if (typeof agent !== 'string') return agent.label || knownLabels[agent.id] || agent.id;
  return knownLabels[agent] || agent;
}

export function agentSupports(agent: LocalAgentStatus | undefined, capability: AgentCapability): boolean {
  // Older connector versions did not report capabilities. Treat their detected
  // agents as compatible so an updated Studio remains backwards compatible.
  return Boolean(agent?.installed && (!agent.capabilities || agent.capabilities.includes(capability)));
}

export function recommendedLocalAgent(agents: LocalAgentStatus[], preferred: 'auto' | LocalAgentId = 'auto', capability?: AgentCapability): LocalAgentStatus | undefined {
  const runnable = agents.filter((agent) => agent.installed && (!capability || agentSupports(agent, capability)));
  if (preferred !== 'auto') return runnable.find((agent) => agent.id === preferred) || runnable[0];
  return [...runnable].sort((left, right) => {
    const leftRank = localAgentOrder.indexOf(left.id); const rightRank = localAgentOrder.indexOf(right.id);
    return (leftRank < 0 ? Number.MAX_SAFE_INTEGER : leftRank) - (rightRank < 0 ? Number.MAX_SAFE_INTEGER : rightRank)
      || left.label.localeCompare(right.label);
  })[0];
}

export function defaultGenerationPath(_agents: LocalAgentStatus[]): 'engine' | 'gemini' {
  // Hosted generation is always an explicit choice. A missing local agent is
  // a setup condition, never permission to silently spend hosted-provider use.
  return 'engine';
}
