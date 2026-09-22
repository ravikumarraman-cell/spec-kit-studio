import { SpecKitProject } from '../types/speckit';
import { SAMPLE_PROJECTS } from './sampleData';
import { createProjectWorkspace } from './projectFactory';
import { saveProjectBackup } from './projectBackup';
import { projectBackups } from './projectBackup';

const STORAGE_KEY = 'speckit_studio_projects_v1';
const ACTIVE_PROJECT_KEY = 'speckit_studio_active_project_id';

class StorageService {
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
      parsed.forEach((p) => {
        if (p.plan?.mermaidDiagram && p.plan.mermaidDiagram.includes('|@google/genai SDK|')) {
          p.plan.mermaidDiagram = p.plan.mermaidDiagram.replace('|@google/genai SDK|', '|"@google/genai SDK"|');
          modified = true;
        }
      });
      if (modified) {
        this.saveProjects(parsed);
      }
      return parsed;
    } catch (err) {
      console.error('Failed to parse projects from storage, resetting to sample projects', err);
      return SAMPLE_PROJECTS;
    }
  }

  public saveProjects(projects: SpecKitProject[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
      this.notify();
    } catch (err) {
      console.error('Failed to save projects to storage', err);
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

  public updateActiveProject(updatedProject: SpecKitProject): void {
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

    this.saveProjects(projects);
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
