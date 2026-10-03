import { ConnectorJob } from './connector';

export interface ConnectorJobReader {
  getJob(id: string): Promise<ConnectorJob>;
}

export type ConnectorJobSleep = (milliseconds: number) => Promise<void>;
export interface ConnectorJobVisibility { hidden(): boolean; waitUntilVisible(signal?: AbortSignal): Promise<void>; }

const browserSleep: ConnectorJobSleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const browserVisibility: ConnectorJobVisibility = {
  hidden: () => typeof document !== 'undefined' && document.visibilityState === 'hidden',
  waitUntilVisible: (signal) => new Promise((resolve, reject) => {
    if (typeof document === 'undefined' || document.visibilityState !== 'hidden') { resolve(); return; }
    const cleanup = () => { document.removeEventListener('visibilitychange', visible); signal?.removeEventListener('abort', aborted); };
    const visible = () => { if (document.visibilityState !== 'hidden') { cleanup(); resolve(); } };
    const aborted = () => { cleanup(); reject(new ConnectorJobPollingAborted()); };
    document.addEventListener('visibilitychange', visible);
    signal?.addEventListener('abort', aborted, { once: true });
  }),
};

export class ConnectorJobPollingAborted extends Error {
  constructor() { super('Connector job polling was stopped.'); this.name = 'ConnectorJobPollingAborted'; }
}

export function isConnectorJobPollingAborted(error: unknown): boolean {
  return error instanceof ConnectorJobPollingAborted;
}

/**
 * One polling implementation for every connector-backed workflow. Keeping the
 * loop here prevents subtly different polling intervals, missed final state
 * updates, and unbounded retry behavior across UI surfaces.
 */
export async function waitForConnectorJob(
  initial: ConnectorJob,
  reader: ConnectorJobReader,
  onUpdate: (job: ConnectorJob) => void,
  intervalMs = 750,
  sleep: ConnectorJobSleep = browserSleep,
  signal?: AbortSignal,
  visibility: ConnectorJobVisibility = browserVisibility,
): Promise<ConnectorJob> {
  let job = initial;
  onUpdate(job);
  while (job.status === 'running') {
    if (signal?.aborted) throw new ConnectorJobPollingAborted();
    if (visibility.hidden()) await visibility.waitUntilVisible(signal);
    await sleep(intervalMs);
    if (signal?.aborted) throw new ConnectorJobPollingAborted();
    job = await reader.getJob(job.id);
    onUpdate(job);
  }
  return job;
}
