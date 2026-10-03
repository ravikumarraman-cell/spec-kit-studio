import { useEffect, useMemo, useState } from 'react';
import type { AgentCapability, LocalAgentStatus } from '../lib/agentAvailability';
import { type LocalAgentScan, readRuntimeAgentScan, selectedRuntimeAgent } from '../lib/runtimeAgents';

/** Keep adapter-dependent UI current after Connected Workspace performs a new
 * scan. The connector remains authoritative when a job actually starts. */
export function useRuntimeAgentScan(): LocalAgentScan {
  const [scan, setScan] = useState<LocalAgentScan>(() => readRuntimeAgentScan());

  useEffect(() => {
    const refresh = () => setScan(readRuntimeAgentScan());
    window.addEventListener('speckit-agents-change', refresh);
    return () => window.removeEventListener('speckit-agents-change', refresh);
  }, []);

  return scan;
}

export function useSelectedRuntimeAgent(capability?: AgentCapability): LocalAgentStatus | undefined {
  const scan = useRuntimeAgentScan();
  return useMemo(() => selectedRuntimeAgent(capability, scan), [capability, scan]);
}
