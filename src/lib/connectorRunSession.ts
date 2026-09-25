/**
 * Durable, non-sensitive reference to a connector job.
 *
 * Connector jobs run in the local connector process, not in a React screen.
 * Keeping this reference in session storage lets any screen that owns a run
 * resume its status after navigation or a refresh without storing prompts,
 * tokens, output, or repository contents in the browser.
 */
export interface ConnectorRunReference {
  jobId: string;
  projectId: string;
  repositoryPath: string;
  scope: string;
  ownerId: string;
  stageId?: number;
}

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const keyFor = (projectId: string, scope: string, ownerId: string) =>
  `speckit:connector-run:${encodeURIComponent(projectId)}:${encodeURIComponent(scope)}:${encodeURIComponent(ownerId)}`;

function sessionStorageOrUndefined(): SessionStorageLike | undefined {
  return typeof window === 'undefined' ? undefined : window.sessionStorage;
}

function isReference(value: unknown): value is ConnectorRunReference {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return ['jobId', 'projectId', 'repositoryPath', 'scope', 'ownerId']
    .every((field) => typeof candidate[field] === 'string' && candidate[field].trim().length > 0)
    && (candidate.stageId === undefined || (typeof candidate.stageId === 'number' && Number.isInteger(candidate.stageId)));
}

export function saveConnectorRunReference(reference: ConnectorRunReference, storage = sessionStorageOrUndefined()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(keyFor(reference.projectId, reference.scope, reference.ownerId), JSON.stringify(reference));
    return true;
  } catch {
    return false;
  }
}

export function readConnectorRunReference(projectId: string, scope: string, ownerId: string, repositoryPath: string, storage = sessionStorageOrUndefined()): ConnectorRunReference | null {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(keyFor(projectId, scope, ownerId)) || 'null');
    return isReference(value)
      && value.projectId === projectId
      && value.scope === scope
      && value.ownerId === ownerId
      && value.repositoryPath === repositoryPath
      ? value
      : null;
  } catch {
    return null;
  }
}

export function clearConnectorRunReference(projectId: string, scope: string, ownerId: string, storage = sessionStorageOrUndefined()): void {
  if (!storage) return;
  try {
    storage.removeItem(keyFor(projectId, scope, ownerId));
  } catch {
    // Optional browser state must never interrupt a connector job or review.
  }
}
