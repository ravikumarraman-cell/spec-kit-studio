import { SpecKitProject } from '../types/speckit';
import { SAMPLE_PROJECTS } from './sampleData';
import { createProjectWorkspace } from './projectFactory';
import { projectBackups, pruneRecoverySnapshots, releaseRecoverySnapshotsForStoragePressure, saveProjectBackup } from './projectBackup';
import { normalizeProcessCases } from './processCases';
import { createUniqueId } from './ids';

const LEGACY_STORAGE_KEY = 'speckit_studio_projects_v1';
const ACTIVE_PROJECT_KEY = 'speckit_studio_active_project_id';
const DATABASE_NAME = 'speckit-studio';
const DATABASE_VERSION = 1;
const PROJECTS_KEY = 'projects';
const META_STORE = 'meta';
const PROJECTS_STORE = 'projects';
const RECOVERY_PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000;
const PERSIST_DEBOUNCE_MS = 150;

function copyRepositoryContext(source: SpecKitProject): Pick<SpecKitProject, 'importedRepo' | 'repositoryIdentity' | 'stackProfile'> {
  return {
    ...(source.importedRepo ? { importedRepo: { ...source.importedRepo, detectedTechStack: source.importedRepo.detectedTechStack.map((technology) => ({ ...technology })), keyDirectories: [...source.importedRepo.keyDirectories], suggestedNewFeatures: [...source.importedRepo.suggestedNewFeatures] } } : {}),
    ...(source.repositoryIdentity ? { repositoryIdentity: { ...source.repositoryIdentity } } : {}),
    ...(source.stackProfile ? { stackProfile: { ...source.stackProfile, testCommands: projectArray(source.stackProfile.testCommands), allowedSourceRoots: projectArray(source.stackProfile.allowedSourceRoots), prohibitedPaths: projectArray(source.stackProfile.prohibitedPaths) } } : {}),
  };
}

function projectArray<T>(value: T[] | undefined): T[] | undefined {
  return value ? [...value] : undefined;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) database.createObjectStore(PROJECTS_STORE);
      if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB could not be opened.'));
    request.onblocked = () => reject(new Error('IndexedDB is blocked by another open Studio tab.'));
  });
}

function readRecord<T>(database: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = database.transaction(store, 'readonly').objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error || new Error(`IndexedDB read failed for ${store}.`));
  });
}

function writeState(database: IDBDatabase, projects: SpecKitProject[], activeProjectId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE, META_STORE], 'readwrite');
    transaction.objectStore(PROJECTS_STORE).put(projects, PROJECTS_KEY);
    transaction.objectStore(META_STORE).put(activeProjectId, ACTIVE_PROJECT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB write failed.'));
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB write was aborted.'));
  });
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function readLegacyProjects(): SpecKitProject[] | undefined {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return undefined;
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value as SpecKitProject[] : undefined;
  } catch (error) {
    console.warn('Studio could not read the legacy localStorage workspace.', error);
    return undefined;
  }
}

function normalizeProjects(input: SpecKitProject[]): { projects: SpecKitProject[]; modified: boolean } {
  const projects = structuredClone(input);
  let modified = false;
  const seenProjectIds = new Set<string>();
  projects.forEach((project) => {
    if (seenProjectIds.has(project.id)) {
      project.id = createUniqueId('project');
      modified = true;
    }
    seenProjectIds.add(project.id);
    if (project.plan?.mermaidDiagram?.includes('|@google/genai SDK|')) {
      project.plan.mermaidDiagram = project.plan.mermaidDiagram.replace('|@google/genai SDK|', '|"@google/genai SDK"|');
      modified = true;
    }
    const normalizedCases = normalizeProcessCases(project.processCases);
    if (JSON.stringify(normalizedCases) !== JSON.stringify(project.processCases)) {
      project.processCases = normalizedCases;
      modified = true;
    }
    if (project.journey && !project.journey.featureId && project.featureInbox?.length) {
      project.journey.featureId = project.featureInbox[project.featureInbox.length - 1].id;
      modified = true;
    }
  });

  const connectedProjects = projects.filter((project) => project.importedRepo?.repoUrl && project.repositoryIdentity?.canonicalRemote);
  const unboundImportedFeatures = projects.filter((project) => !project.importedRepo && !project.repositoryIdentity && project.featureInbox?.length === 1);
  if (connectedProjects.length === 1 && unboundImportedFeatures.length) {
    const context = copyRepositoryContext(connectedProjects[0]);
    unboundImportedFeatures.forEach((project) => Object.assign(project, context));
    modified = true;
  }
  return { projects, modified };
}

/**
 * Browser project persistence. IndexedDB is the primary durable store; localStorage
 * is read only as a one-time migration source and as a fallback for browsers where
 * IndexedDB is unavailable. The in-memory cache keeps the UI synchronous.
 */
export class StorageService {
  private listeners = new Set<() => void>();
  private projects: SpecKitProject[] | null = null;
  private activeProjectId: string | null = null;
  private database: IDBDatabase | null = null;
  private initialization: Promise<void> | null = null;
  private persistQueue: Promise<void> = Promise.resolve();
  private persistenceTimer: number | undefined;
  private recoveryPruneTimer: number | undefined;

  public initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.initialization = this.hydrate().catch((error) => {
      console.warn('IndexedDB is unavailable; Studio is using localStorage fallback.', error);
      const normalized = normalizeProjects(readLegacyProjects() || SAMPLE_PROJECTS);
      this.projects = normalized.projects;
      this.activeProjectId = this.legacyActiveProjectId(this.projects);
    }).then(() => {
      pruneRecoverySnapshots();
      // Backups are best-effort local undo, not durable project data. Prune at
      // hydration and periodically while Studio remains open so stale copies
      // cannot quietly consume the smaller localStorage quota.
      if (typeof window !== 'undefined' && this.recoveryPruneTimer === undefined) {
        this.recoveryPruneTimer = window.setInterval(() => pruneRecoverySnapshots(), RECOVERY_PRUNE_INTERVAL_MS);
      }
      if (typeof window !== 'undefined') window.addEventListener('pagehide', this.flushPendingPersistence);
      this.notify();
    });
    return this.initialization;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  private async hydrate(): Promise<void> {
    if (!hasIndexedDb()) throw new Error('IndexedDB is not available in this environment.');
    this.database = await openDatabase();
    const [storedProjects, storedActiveId] = await Promise.all([
      readRecord<SpecKitProject[]>(this.database, PROJECTS_STORE, PROJECTS_KEY),
      readRecord<string>(this.database, META_STORE, ACTIVE_PROJECT_KEY),
    ]);
    const legacy = !storedProjects?.length ? readLegacyProjects() : undefined;
    const normalized = normalizeProjects(storedProjects?.length ? storedProjects : legacy || SAMPLE_PROJECTS);
    this.projects = normalized.projects;
    this.activeProjectId = storedActiveId && this.projects.some((project) => project.id === storedActiveId)
      ? storedActiveId
      : this.legacyActiveProjectId(this.projects);

    if (!storedProjects?.length || normalized.modified) {
      await writeState(this.database, this.projects, this.activeProjectId);
    }

    // Clear the potentially large legacy payload only after IndexedDB has a
    // committed copy. Keep all other small preferences in localStorage.
    if (legacy) {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }

  private legacyActiveProjectId(projects: SpecKitProject[]): string {
    try {
      const storedId = localStorage.getItem(ACTIVE_PROJECT_KEY);
      if (storedId && projects.some((project) => project.id === storedId)) return storedId;
    } catch { /* Browser privacy mode can reject localStorage. */ }
    return projects[0]?.id || 'proj-spec-kit-studio';
  }

  private ensureCache(): SpecKitProject[] {
    if (!this.projects) {
      this.projects = normalizeProjects(readLegacyProjects() || SAMPLE_PROJECTS).projects;
      this.activeProjectId = this.legacyActiveProjectId(this.projects);
    }
    return this.projects;
  }

  private commitLatestState(): void {
    const projects = structuredClone(this.ensureCache());
    const activeProjectId = this.getActiveProjectId();
    this.persistQueue = this.persistQueue
      .then(async () => {
        await this.initialize();
        if (this.database) {
          await writeState(this.database, projects, activeProjectId);
          return;
        }
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(projects));
        localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
      })
      .catch((error) => {
        console.error('Studio could not persist the latest workspace update.', error);
      });
  }

  private enqueuePersistence(): void {
    // Editors can emit a project update on every keystroke. Holding one short
    // timer avoids building an unbounded queue of large structured clones and
    // IndexedDB writes while preserving an immediately updated UI cache.
    if (this.persistenceTimer !== undefined) window.clearTimeout(this.persistenceTimer);
    this.persistenceTimer = window.setTimeout(() => {
      this.persistenceTimer = undefined;
      this.commitLatestState();
    }, PERSIST_DEBOUNCE_MS);
  }

  private flushPendingPersistence = (): void => {
    if (this.persistenceTimer === undefined) return;
    window.clearTimeout(this.persistenceTimer);
    this.persistenceTimer = undefined;
    this.commitLatestState();
  };

  public getProjects(): SpecKitProject[] {
    return this.ensureCache();
  }

  /** Updates the memory cache immediately and queues its IndexedDB commit. */
  public saveProjects(projects: SpecKitProject[]): boolean {
    const normalized = normalizeProjects(projects).projects;
    // Keep the fallback synchronous. It preserves deterministic behavior in
    // browsers that disable IndexedDB and in non-browser test environments.
    if (!hasIndexedDb()) {
      const serialized = JSON.stringify(normalized);
      try {
        localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'QuotaExceededError' && releaseRecoverySnapshotsForStoragePressure()) {
          try {
            localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
          } catch (retryError) {
            console.error('Studio could not persist the workspace after releasing recovery snapshots.', retryError);
            return false;
          }
        } else {
          console.error('Studio could not persist the workspace.', error);
          return false;
        }
      }
      this.projects = normalized;
      if (!this.projects.some((project) => project.id === this.activeProjectId)) this.activeProjectId = this.projects[0]?.id || null;
      localStorage.setItem(ACTIVE_PROJECT_KEY, this.getActiveProjectId());
      this.notify();
      return true;
    }
    this.projects = normalized;
    if (!this.projects.some((project) => project.id === this.activeProjectId)) this.activeProjectId = this.projects[0]?.id || null;
    this.enqueuePersistence();
    this.notify();
    return true;
  }

  public getActiveProjectId(): string {
    const projects = this.ensureCache();
    if (this.activeProjectId && projects.some((project) => project.id === this.activeProjectId)) return this.activeProjectId;
    this.activeProjectId = projects[0]?.id || 'proj-spec-kit-studio';
    return this.activeProjectId;
  }

  public setActiveProjectId(id: string): void {
    this.activeProjectId = id;
    if (!hasIndexedDb()) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
      this.notify();
      return;
    }
    this.enqueuePersistence();
    this.notify();
  }

  public getActiveProject(): SpecKitProject {
    const projects = this.ensureCache();
    return projects.find((project) => project.id === this.getActiveProjectId()) || projects[0] || SAMPLE_PROJECTS[0];
  }

  public updateActiveProject(updatedProject: SpecKitProject): boolean {
    const projects = [...this.ensureCache()];
    const index = projects.findIndex((project) => project.id === updatedProject.id);
    if (index >= 0) saveProjectBackup(projects[index], 'before project update');
    const projectToSave = { ...updatedProject, updatedAt: new Date().toISOString() };
    if (index >= 0) projects[index] = projectToSave;
    else projects.unshift(projectToSave);
    return this.saveProjects(projects);
  }

  public saveImportedProject(project: SpecKitProject): SpecKitProject {
    const projects = [...this.ensureCache()];
    const index = projects.findIndex((item) => item.id === project.id);
    const projectToSave = { ...project, updatedAt: new Date().toISOString() };
    if (index >= 0) projects[index] = projectToSave;
    else projects.unshift(projectToSave);
    this.activeProjectId = projectToSave.id;
    this.saveProjects(projects);
    return projectToSave;
  }

  public createNewProject(name: string, description: string): SpecKitProject {
    const newProject = createProjectWorkspace(name, description);
    this.activeProjectId = newProject.id;
    this.saveProjects([newProject, ...this.ensureCache()]);
    return newProject;
  }

  public deleteProject(id: string): void {
    const projects = this.ensureCache();
    if (projects.length <= 1) {
      alert('Cannot delete the last remaining project.');
      return;
    }
    const removed = projects.find((project) => project.id === id);
    if (removed) saveProjectBackup(removed, 'before project deletion');
    const retained = projects.filter((project) => project.id !== id);
    this.activeProjectId = retained[0].id;
    this.saveProjects(retained);
  }

  public exportProjectsJson(): string {
    return JSON.stringify(this.ensureCache(), null, 2);
  }

  public importProjectsJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (!Array.isArray(parsed) || !parsed.length || !parsed[0].id) return false;
      this.activeProjectId = parsed[0].id;
      return this.saveProjects(parsed);
    } catch (error) {
      console.error('Invalid JSON import', error);
      return false;
    }
  }

  public resetToSampleProjects(): void {
    this.activeProjectId = SAMPLE_PROJECTS[0].id;
    this.saveProjects(SAMPLE_PROJECTS);
  }

  public restoreProjectBackup(projectId: string, savedAt: string): boolean {
    const snapshot = projectBackups(projectId).find((item) => item.savedAt === savedAt);
    if (!snapshot) return false;
    return this.updateActiveProject(snapshot.project);
  }
}

export const storageService = new StorageService();
