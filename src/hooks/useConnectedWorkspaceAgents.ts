import { useEffect } from 'react';
import { refreshRuntimeAgentScan } from '../lib/runtimeAgents';

/**
 * Keeps the browser's advisory local-agent cache aligned with the connected
 * workspace. A terminal health check cannot update browser storage, so this
 * small read-only reconciliation runs when Studio opens a connected project
 * and when the user returns to the tab. Execution remains connector-owned.
 */
export function useConnectedWorkspaceAgents(repositoryPath?: string): void {
  useEffect(() => {
    if (!repositoryPath) return;

    let disposed = false;
    let lastRefreshAt = 0;
    const refresh = () => {
      const now = Date.now();
      // Focus and visibility events commonly arrive together. One scan is
      // sufficient, and the connector's own cache remains the authority.
      if (now - lastRefreshAt < 5_000) return;
      lastRefreshAt = now;
      void refreshRuntimeAgentScan(repositoryPath)
        .then(() => undefined)
        // A workspace can be intentionally offline. Preserve its last good
        // scan and let Connected Workspace surface actionable diagnostics.
        .catch(() => undefined);
    };

    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('visibilitychange', refresh);
    };
  }, [repositoryPath]);
}
