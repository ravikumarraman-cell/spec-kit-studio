/**
 * A local agent run belongs to a feature task, but the connector holds the
 * actual job in memory. Keep the small job reference in session storage so a
 * route change or refresh can retrieve both running and terminal results.
 *
 * This deliberately stores no prompt, output, token, or repository contents.
 */
export interface LocalAgentJobReference {
  jobId: string;
  projectId: string;
  featureId: string;
  taskId: string;
  repositoryPath: string;
}

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const keyFor = (projectId: string, featureId: string) =>
  `speckit:local-agent-job:${encodeURIComponent(projectId)}:${encodeURIComponent(featureId)}`;

function sessionStorageOrUndefined(): SessionStorageLike | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.sessionStorage;
}

function isReference(value: unknown): value is LocalAgentJobReference {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['jobId', 'projectId', 'featureId', 'taskId', 'repositoryPath']
    .every((field) => typeof candidate[field] === 'string' && candidate[field].trim().length > 0);
}

export function saveLocalAgentJobReference(reference: LocalAgentJobReference, storage = sessionStorageOrUndefined()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(keyFor(reference.projectId, reference.featureId), JSON.stringify(reference));
    return true;
  } catch {
    // A run must never be blocked because a browser declined optional session
    // storage. The active-job endpoint remains a running-job fallback.
    return false;
  }
}

export function readLocalAgentJobReference(projectId: string, featureId: string, repositoryPath: string, storage = sessionStorageOrUndefined()): LocalAgentJobReference | null {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(keyFor(projectId, featureId)) || 'null');
    return isReference(value) && value.projectId === projectId && value.featureId === featureId && value.repositoryPath === repositoryPath
      ? value
      : null;
  } catch {
    return null;
  }
}

export function clearLocalAgentJobReference(projectId: string, featureId: string, storage = sessionStorageOrUndefined()): void {
  if (!storage) return;
  try {
    storage.removeItem(keyFor(projectId, featureId));
  } catch {
    // Clearing optional browser state must not interrupt a reviewed receipt.
  }
}
