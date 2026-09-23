import { SpecKitProject } from '../types/speckit';
import { SAMPLE_PROJECTS } from './sampleData';
import { createProjectWorkspace } from './projectFactory';
import { projectBackups, releaseRecoverySnapshotsForStoragePressure, saveProjectBackup } from './projectBackup';
import { normalizeProcessCases } from './processCases';
import { createUniqueId } from './ids';

const STORAGE_KEY = 'speckit_studio_projects_v1';
const ACTIVE_PROJECT_KEY = 'speckit_studio_active_project_id';

function copyRepositoryContext(source: SpecKitProject): Pick<SpecKitProject, 'importedRepo' | 'repositoryIdentity' | 'stackProfile'> {
  return {
    ...(source.importedRepo ? {
      importedRepo: {
        ...source.importedRepo,
        detectedTechStack: source.importedRepo.detectedTechStack.map((technology) => ({ ...technology })),
        keyDirectories: [...source.importedRepo.keyDirectories],
        suggestedNewFeatures: [...source.importedRepo.suggestedNewFeatures],
      },
    } : {}),
    ...(source.repositoryIdentity ? { repositoryIdentity: { ...source.repositoryIdentity } } : {}),
    ...(source.stackProfile ? {
      stackProfile: {
        ...source.stackProfile,
        testCommands: source.stackProfile.testCommands ? [...source.stackProfile.testCommands] : undefined,
        allowedSourceRoots: source.stackProfile.allowedSourceRoots ? [...source.stackProfile.allowedSourceRoots] : undefined,
        prohibitedPaths: source.stackProfile.prohibitedPaths ? [...source.stackProfile.prohibitedPaths] : undefined,
      },
    } : {}),
  };
}

export class StorageService {
  private listeners: Set<() => void> = new Set();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public getProjects(): SpecKitProject[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveProjects(SAMPLE_PROJECTS);
        return SAMPLE_PROJECTS;
      }
      const parsed: SpecKitProject[] = JSON.parse(raw);
      // Clean up any legacy unquoted mermaid diagrams in cache
      let modified = false;
      const seenProjectIds = new Set<string>();
      parsed.forEach((p) => {
        // Repair historical timestamp-ID collisions without discarding either
        // workspace. The first record retains its old ID so an existing active
        // selection keeps working; later duplicates receive a fresh identity.
        if (seenProjectIds.has(p.id)) {
          p.id = createUniqueId('project');
          modified = true;
        }
        seenProjectIds.add(p.id);
        if (p.plan?.mermaidDiagram && p.plan.mermaidDiagram.includes('|@google/genai SDK|')) {
          p.plan.mermaidDiagram = p.plan.mermaidDiagram.replace('|@google/genai SDK|', '|"@google/genai SDK"|');
          modified = true;
        }
        const normalizedCases = normalizeProcessCases(p.processCases);
        if (JSON.stringify(normalizedCases) !== JSON.stringify(p.processCases)) {
          p.processCases = normalizedCases;
          modified = true;
        }
        // Older workspaces selected the last inbox item implicitly. Persist
        // that one-time legacy choice so later imports cannot retarget an
        // in-progress journey, its artifacts, or its implementation receipts.
        if (p.journey && !p.journey.featureId && p.featureInbox?.length) {
          p.journey.featureId = p.featureInbox[p.featureInbox.length - 1].id;
          modified = true;
        }
      });

      // Repair the short-lived legacy behavior where “Create New” retained
      // the imported feature but dropped the connection from the workspace
      // that launched the import. Only infer a parent when there is exactly
      // one unambiguous connected workspace; otherwise require explicit user
      // action rather than risking a repository mix-up.
      const connectedProjects = parsed.filter((project) => project.importedRepo?.repoUrl && project.repositoryIdentity?.canonicalRemote);
      const unboundImportedFeatures = parsed.filter((project) =>
        !project.importedRepo &&
        !project.repositoryIdentity &&
        project.featureInbox?.length === 1,
      );
      if (connectedProjects.length === 1 && unboundImportedFeatures.length > 0) {
        const repositoryContext = copyRepositoryContext(connectedProjects[0]);
        unboundImportedFeatures.forEach((project) => Object.assign(project, repositoryContext));
        modified = true;
      }
      if (modified) {
        this.saveProjects(parsed);
      }
      return parsed;
    } catch (err) {
      console.error('Failed to parse projects from storage, resetting to sample projects', err);
      return SAMPLE_PROJECTS;
    }
  }

  /**
   * Persists the complete workspace aggregate. Callers that drive a user
   * decision (such as feature intake) must be able to distinguish a durable
   * write from a browser-storage failure instead of optimistically advancing
   * the UI.
   */
  public saveProjects(projects: SpecKitProject[]): boolean {
    const serialized = JSON.stringify(projects);
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      this.notify();
      return true;
    } catch (err) {
      // Full snapshots can consume localStorage quickly because each is a
      // complete project aggregate. Release those optional copies and retry
      // the primary workspace write once before reporting a real failure.
      if (err instanceof DOMException && err.name === 'QuotaExceededError' && releaseRecoverySnapshotsForStoragePressure()) {
        try {
          localStorage.setItem(STORAGE_KEY, serialized);
          this.notify();
          return true;
        } catch (retryError) {
          console.error('Failed to save projects after releasing recovery snapshots', retryError);
          return false;
        }
      }
      console.error('Failed to save projects to storage', err);
      return false;
    }
  }

  public getActiveProjectId(): string {
    const projects = this.getProjects();
    const storedId = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (storedId && projects.some((p) => p.id === storedId)) {
      return storedId;
    }
    return projects[0]?.id || 'proj-spec-kit-studio';
  }

  public setActiveProjectId(id: string): void {
    localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    this.notify();
  }

  public getActiveProject(): SpecKitProject {
    const projects = this.getProjects();
    const activeId = this.getActiveProjectId();
    const active = projects.find((p) => p.id === activeId);
    if (active) return active;
    return projects[0] || SAMPLE_PROJECTS[0];
  }

  public updateActiveProject(updatedProject: SpecKitProject): boolean {
    const projects = this.getProjects();
    const index = projects.findIndex((p) => p.id === updatedProject.id);
    if (index >= 0) saveProjectBackup(projects[index], 'before project update');
    const now = new Date().toISOString();
    const projectToSave = {
      ...updatedProject,
      updatedAt: now,
    };

    if (index >= 0) {
      projects[index] = projectToSave;
    } else {
      projects.unshift(projectToSave);
    }

    return this.saveProjects(projects);
  }

  /**
   * Adds (or updates) a project created by an import and makes it the active
   * workspace in the same persistence operation. Importing a feature must
   * never leave the user looking at the workspace they came from.
   */
  public saveImportedProject(project: SpecKitProject): SpecKitProject {
    const projects = this.getProjects();
    const index = projects.findIndex((item) => item.id === project.id);
    const projectToSave = { ...project, updatedAt: new Date().toISOString() };

    if (index >= 0) {
      projects[index] = projectToSave;
    } else {
      projects.unshift(projectToSave);
    }

    // Keep the project list and selected-project pointer coherent before
    // notifying subscribers. Calling the public selector here would notify
    // once while the new project was not yet visible and can briefly restore
    // the prior workspace in React.
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectToSave.id);
    this.saveProjects(projects);
    return projectToSave;
  }

  public createNewProject(name: string, description: string): SpecKitProject {
    const newProj = createProjectWorkspace(name, description);

    const projects = this.getProjects();
    projects.unshift(newProj);
    this.saveProjects(projects);
    this.setActiveProjectId(newProj.id);
    return newProj;
  }

  public deleteProject(id: string): void {
    let projects = this.getProjects();
    if (projects.length <= 1) {
      alert('Cannot delete the last remaining project.');
      return;
    }
    const removed = projects.find((p) => p.id === id);
    if (removed) saveProjectBackup(removed, 'before project deletion');
    projects = projects.filter((p) => p.id !== id);
    this.saveProjects(projects);
    this.setActiveProjectId(projects[0].id);
  }

  public exportProjectsJson(): string {
    return JSON.stringify(this.getProjects(), null, 2);
  }

  public importProjectsJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
        this.saveProjects(parsed);
        this.setActiveProjectId(parsed[0].id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Invalid JSON import', err);
      return false;
    }
  }

  public resetToSampleProjects(): void {
    this.saveProjects(SAMPLE_PROJECTS);
    this.setActiveProjectId(SAMPLE_PROJECTS[0].id);
  }

  /** Explicit recovery only: callers choose a retained snapshot; no silent rollback occurs. */
  public restoreProjectBackup(projectId: string, savedAt: string): boolean {
    const snapshot = projectBackups(projectId).find((item) => item.savedAt === savedAt);
    if (!snapshot) return false;
    this.updateActiveProject(snapshot.project);
    return true;
  }
}

export const storageService = new StorageService();
