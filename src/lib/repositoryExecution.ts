import type { ConnectorJob } from './connector';

/** Structural interface keeps the execution guard independent of a specific
 * screen or connector client construction. */
export interface RepositoryExecutionClient {
  activeJob(repositoryPath: string): Promise<ConnectorJob | null>;
}

export type ExecutionActivity = 'active' | 'interrupted' | 'inactive';

/**
 * Reconciles durable workflow state with the observable, connector-owned job.
 * A persisted "running" value is intent/history, not proof that a process is
 * still alive after a refresh, connector restart, or rejected launch.
 */
export function reconcileExecutionActivity({
  durableStatus,
  localRunning = false,
  job,
}: {
  durableStatus?: string;
  localRunning?: boolean;
  job?: Pick<ConnectorJob, 'status'> | null;
}): ExecutionActivity {
  if (localRunning || job?.status === 'running') return 'active';
  return durableStatus === 'running' ? 'interrupted' : 'inactive';
}

export class RepositoryExecutionBusyError extends Error {
  constructor(public readonly job: ConnectorJob) {
    super(`Another Studio job is already running for this repository: ${job.label}.`);
    this.name = 'RepositoryExecutionBusyError';
  }
}

export function isRepositoryExecutionConflict(message: string | undefined): boolean {
  return /another studio job is already running|already running for this repository|repository.*(?:busy|locked)/i.test(message || '');
}

/**
 * The single safe entry point for repository-mutating or repository-executing
 * jobs. It checks the connector's durable live-job registry before launch and
 * rechecks after a lock race, so callers can render the actual competing job.
 */
export async function startRepositoryExecution<T extends ConnectorJob>(
  client: RepositoryExecutionClient,
  repositoryPath: string,
  start: () => Promise<T>,
): Promise<T> {
  const active = await client.activeJob(repositoryPath);
  if (active?.status === 'running') throw new RepositoryExecutionBusyError(active);
  try {
    return await start();
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (isRepositoryExecutionConflict(message)) {
      const competing = await client.activeJob(repositoryPath);
      if (competing?.status === 'running') throw new RepositoryExecutionBusyError(competing);
    }
    throw error;
  }
}
