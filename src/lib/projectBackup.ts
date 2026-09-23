import { SpecKitProject } from '../types/speckit';

const BACKUP_KEY = 'speckit_studio_project_backups_v1';
const MAX_BACKUPS_PER_PROJECT = 3;

export interface ProjectBackup { projectId: string; savedAt: string; reason: string; project: SpecKitProject; }

function read(): ProjectBackup[] {
  try {
    const value = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

/** Keep a bounded, in-browser recovery history before each durable mutation. */
export function saveProjectBackup(project: SpecKitProject, reason: string): void {
  try {
    const entry: ProjectBackup = { projectId: project.id, savedAt: new Date().toISOString(), reason, project: structuredClone(project) };
    const other = read().filter((item) => item.projectId !== project.id);
    const current = [entry, ...read().filter((item) => item.projectId === project.id)].slice(0, MAX_BACKUPS_PER_PROJECT);
    localStorage.setItem(BACKUP_KEY, JSON.stringify([...current, ...other]));
  } catch (error) {
    // A full browser store is handled by StorageService, which releases these
    // optional snapshots and retries the primary write. Do not present that
    // expected recovery path as a console error to the user.
    if (error instanceof DOMException && error.name === 'QuotaExceededError') return;
    console.warn('Studio could not create a local recovery snapshot.', error);
  }
}

export function projectBackups(projectId: string): ProjectBackup[] {
  return read().filter((item) => item.projectId === projectId);
}

/**
 * Recovery snapshots are intentionally best-effort. If the browser quota is
 * exhausted, primary workspace data takes priority over historical copies.
 * The current project remains intact; only local undo snapshots are released.
 */
export function releaseRecoverySnapshotsForStoragePressure(): boolean {
  try {
    if (localStorage.getItem(BACKUP_KEY) === null) return false;
    localStorage.removeItem(BACKUP_KEY);
    return true;
  } catch {
    return false;
  }
}
