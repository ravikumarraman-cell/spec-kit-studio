import { SpecKitProject } from '../types/speckit';

const BACKUP_KEY = 'speckit_studio_project_backups_v1';
const MAX_BACKUPS_PER_PROJECT = 12;

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
  } catch (error) { console.warn('Studio could not create a local recovery snapshot.', error); }
}

export function projectBackups(projectId: string): ProjectBackup[] {
  return read().filter((item) => item.projectId === projectId);
}
