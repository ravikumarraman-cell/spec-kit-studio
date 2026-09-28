import { useCallback, useEffect, useRef, useState } from 'react';
import { activeConnectorJob, configuredConnectorClient, configuredConnectorUrl, type ConnectorJob } from '../../../lib/connector';
import { getConnectorSessionToken } from '../../../lib/connectorSession';

export type ConnectorRuntimeState = 'unavailable' | 'checking' | 'ready' | 'stale';

interface RuntimeState {
  connector: ConnectorRuntimeState;
  job: ConnectorJob | null;
  message?: string;
  checkedAt?: number;
}

const INITIAL: RuntimeState = { connector: 'unavailable', job: null };
const ACTIVE_POLL_MS = 4_000;
const IDLE_POLL_MS = 20_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Recovers local connector work after navigation. It never starts work or
 * changes Journey state; it merely reports connector-owned runtime truth.
 */
export function useWorkspaceHubRuntime(repositoryPath?: string, jobIds: string[] = []) {
  const [state, setState] = useState<RuntimeState>(INITIAL);
  const stateRef = useRef<RuntimeState>(INITIAL);
  const errorCount = useRef(0);
  const mounted = useRef(true);
  const commit = useCallback((update: RuntimeState | ((current: RuntimeState) => RuntimeState)) => {
    setState((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      stateRef.current = next;
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!repositoryPath) {
      if (mounted.current) commit(INITIAL);
      return;
    }
    if (mounted.current) commit((current) => ({ ...current, connector: current.checkedAt ? current.connector : 'checking' }));
    try {
      const client = configuredConnectorClient();
      const [health, activeJob] = await Promise.all([
        client.health(),
        activeConnectorJob(configuredConnectorUrl(), getConnectorSessionToken(), repositoryPath),
      ]);
      if (!mounted.current) return;
      // The active endpoint intentionally omits finished jobs. Recover the last
      // observed run once so the Hub can show a reviewable terminal result.
      const previous = stateRef.current.job;
      const referenceId = jobIds.find((id) => id && id !== activeJob?.id && id !== previous?.id);
      const referencedJob = referenceId ? await client.getJob(referenceId).catch(() => null) : null;
      const job = activeJob || referencedJob || (previous?.status === 'running' ? await client.getJob(previous.id).catch(() => previous) : previous);
      if (!mounted.current) return;
      errorCount.current = 0;
      commit({ connector: health.status === 'ok' ? 'ready' : 'stale', job, checkedAt: Date.now() });
    } catch (error) {
      if (!mounted.current) return;
      errorCount.current += 1;
      commit((current) => ({ connector: 'stale', job: current.job, checkedAt: current.checkedAt, message: error instanceof Error ? error.message : 'Connector status could not be refreshed.' }));
    }
  }, [commit, repositoryPath, jobIds]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    let timer: number | undefined;
    const schedule = () => {
      const base = errorCount.current ? Math.min(ACTIVE_POLL_MS * 2 ** (errorCount.current - 1), MAX_BACKOFF_MS) : stateRef.current.job?.status === 'running' ? ACTIVE_POLL_MS : IDLE_POLL_MS;
      timer = window.setTimeout(async () => { await refresh(); schedule(); }, base);
    };
    schedule();
    return () => { mounted.current = false; if (timer) window.clearTimeout(timer); };
    // State is intentionally not a dependency: refresh is the sole source of
    // each polling cycle and prevents timer churn after a status update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const stopSafely = useCallback(async () => {
    if (!state.job || state.job.status !== 'running') return;
    const job = await configuredConnectorClient().cancelJob(state.job.id);
    if (mounted.current) commit((current) => ({ ...current, job, checkedAt: Date.now() }));
  }, [commit, state.job]);

  return { ...state, refresh, stopSafely };
}
