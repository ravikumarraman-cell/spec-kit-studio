export type LocalAgentId = 'claude' | 'codex' | 'copilot';

export interface LocalAgentStatus {
  id: LocalAgentId;
  label: string;
  installed: boolean;
  version?: string;
}

export const localAgentOrder: LocalAgentId[] = ['claude', 'codex', 'copilot'];

export const localAgentLabels: Record<LocalAgentId, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  copilot: 'GitHub Copilot CLI',
};

export function recommendedLocalAgent(agents: LocalAgentStatus[], preferred: 'auto' | LocalAgentId = 'auto'): LocalAgentStatus | undefined {
  const orderedIds = preferred === 'auto' ? localAgentOrder : [preferred, ...localAgentOrder.filter((id) => id !== preferred)];
  return orderedIds
    .map((id) => agents.find((agent) => agent.id === id && agent.installed))
    .find(Boolean);
}

export function defaultGenerationPath(agents: LocalAgentStatus[]): 'engine' | 'gemini' {
  return recommendedLocalAgent(agents) ? 'engine' : 'gemini';
}
