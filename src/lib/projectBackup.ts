import { SpecKitProject } from '../types/speckit';

const BACKUP_KEY = 'speckit_studio_project_backups_v1';
const MAX_BACKUPS_PER_PROJECT = 3;
const MAX_BACKUPS_TOTAL = 12;
const MAX_BACKUP_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface ProjectBackup { projectId: string; savedAt: string; reason: string; project: SpecKitProject; }

function read(): ProjectBackup[] {
  try {
    const value = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function retained(entries: ProjectBackup[], now = Date.now()): ProjectBackup[] {
  const cutoff = now - MAX_BACKUP_AGE_MS;
  const byProject = new Map<string, number>();
  return entries
    .filter((entry) => entry?.projectId && entry?.savedAt && entry?.project)
    .sort((left, right) => right.savedAt.localeCompare(left.savedAt))
    .filter((entry) => {
      const savedAt = Date.parse(entry.savedAt);
      if (!Number.isFinite(savedAt) || savedAt < cutoff) return false;
      const count = byProject.get(entry.projectId) || 0;
      if (count >= MAX_BACKUPS_PER_PROJECT) return false;
      byProject.set(entry.projectId, count + 1);
      return true;
    })
    .slice(0, MAX_BACKUPS_TOTAL);
}

/** Remove expired and excess optional snapshots on startup and every snapshot write. */
export function pruneRecoverySnapshots(now = Date.now()): void {
  try {
    const current = read();
    const next = retained(current, now);
    if (JSON.stringify(current) !== JSON.stringify(next)) localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('Studio could not prune local recovery snapshots.', error);
  }
}

/** Keep a bounded, in-browser recovery history before each durable mutation. */
export function saveProjectBackup(project: SpecKitProject, reason: string): void {
  try {
    const entry: ProjectBackup = { projectId: project.id, savedAt: new Date().toISOString(), reason, project: structuredClone(project) };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(retained([entry, ...read()])));
  } catch (error) {
    // A full browser store is handled by StorageService, which releases these
    // optional snapshots and retries the primary write. Do not present that
    // expected recovery path as a console error to the user.
    if (error instanceof DOMException && error.name === 'QuotaExceededError') return;
    console.warn('Studio could not create a local recovery snapshot.', error);
  }
}

export function projectBackups(projectId: string): ProjectBackup[] {
  pruneRecoverySnapshots();
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
