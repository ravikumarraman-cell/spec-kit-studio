import { useCallback, useEffect, useState } from 'react';
import { TruthReport } from '../lib/connector';
import { FeatureExtractionPackage } from '../lib/api/imports';
import { createFeatureInboxItem } from '../lib/featureInbox';
import { storageService } from '../lib/storage';
import {
  FeatureSpec,
  FeatureJourney,
  FunctionalRequirement,
  ImplementationPlan,
  ProjectConstitution,
  SpecAuditResult,
  SpecKitProject,
  TaskBreakdown,
  TaskItem,
  UserStory,
  FeatureImportSource,
} from '../types/speckit';

type ImportedTask = Partial<TaskItem>;
export interface ImportedFeatureData {
  title?: string;
  summary?: string;
  source?: FeatureImportSource;
  functionalRequirements?: FunctionalRequirement[];
  tasks?: ImportedTask[];
}

const taskPhases = new Set<TaskItem['phase']>([
  'Phase 1: Setup',
  'Phase 2: Core Infrastructure',
  'Phase 3: Integration',
  'Phase 4: Polish & Testing',
]);

function createImportedTask(task: ImportedTask, index: number): TaskItem {
  return {
    id: task.id || `TASK-${200 + index}`,
    title: task.title || `Task ${index + 1}`,
    phase: task.phase && taskPhases.has(task.phase) ? task.phase : 'Phase 2: Core Infrastructure',
    description: task.description || 'Task description',
    status: 'todo',
    estimatedHours: task.estimatedHours || 3,
    mappedRequirementId: task.mappedRequirementId || 'FR-101',
    dependencies: [],
    targetAgentPromptSnippet: task.targetAgentPromptSnippet || `Implement ${task.title || `Task ${index + 1}`}`,
  };
}

/**
 * Application-facing project controller. Components receive stable, domain-specific
 * callbacks and do not need to know how projects are persisted.
 */
export function useProjectWorkspace() {
  const [projects, setProjects] = useState<SpecKitProject[]>([]);
  const [activeProject, setActiveProject] = useState<SpecKitProject | null>(null);

  const refresh = useCallback(() => {
    setProjects(storageService.getProjects());
    setActiveProject(storageService.getActiveProject());
  }, []);

  useEffect(() => {
    refresh();
    return storageService.subscribe(refresh);
  }, [refresh]);

  const updateActiveProject = useCallback((updater: (project: SpecKitProject) => SpecKitProject) => {
    const current = storageService.getActiveProject();
    const updated = { ...updater(current), updatedAt: new Date().toISOString() };
    storageService.updateActiveProject(updated);
    setActiveProject(updated);
    setProjects(storageService.getProjects());
    return updated;
  }, []);

  const selectProject = useCallback((id: string) => {
    storageService.setActiveProjectId(id);
    refresh();
  }, [refresh]);

  const createProject = useCallback((name: string, description: string) => {
    const created = storageService.createNewProject(name, description);
    setActiveProject(created);
    setProjects(storageService.getProjects());
    return created;
  }, []);

  const resetProjects = useCallback(() => {
    storageService.resetToSampleProjects();
    refresh();
  }, [refresh]);

  const saveSpec = useCallback((spec: FeatureSpec) => updateActiveProject((project) => ({ ...project, spec })), [updateActiveProject]);
  const savePlan = useCallback((plan: ImplementationPlan) => updateActiveProject((project) => ({ ...project, plan })), [updateActiveProject]);
  const saveTasks = useCallback((tasks: TaskBreakdown) => updateActiveProject((project) => ({ ...project, tasks })), [updateActiveProject]);
  const saveConstitution = useCallback((constitution: ProjectConstitution) => updateActiveProject((project) => ({ ...project, constitution })), [updateActiveProject]);
  const saveAudit = useCallback((audit: SpecAuditResult) => updateActiveProject((project) => ({ ...project, audit })), [updateActiveProject]);
  const saveJourney = useCallback((journey: FeatureJourney) => updateActiveProject((project) => ({ ...project, journey })), [updateActiveProject]);

  const applyAiSpecData = useCallback((spec: FeatureSpec, plan?: ImplementationPlan, tasks?: TaskBreakdown) => {
    updateActiveProject((project) => ({ ...project, spec, plan: plan || project.plan, tasks: tasks || project.tasks }));
  }, [updateActiveProject]);

  const attachTruth = useCallback((report: TruthReport) => {
    const allowedCategories = new Set(['Frontend', 'Backend', 'Database', 'State', 'Styling', 'Testing', 'Infra/DevOps', 'Other']);
    updateActiveProject((project) => ({
      ...project,
      importedRepo: {
        repoUrl: report.repositoryPath,
        repoName: report.repositoryName,
        description: `Local repository evidence scan completed ${new Date(report.scannedAt).toLocaleString()}.`,
        primaryLanguage: report.technologies.find((item) => item.name === 'Python' || item.name === 'Go' || item.name === 'Rust')?.name || 'TypeScript/JavaScript',
        detectedTechStack: report.technologies.map((item, index) => ({
          id: `EVIDENCE-${index + 1}`,
          category: allowedCategories.has(item.category) ? item.category as NonNullable<SpecKitProject['importedRepo']>['detectedTechStack'][number]['category'] : 'Other',
          name: item.name,
          version: item.version,
          confidence: item.confidence === 'high' ? 'High' : 'Medium',
          fileEvidence: item.evidence,
          selectedForNewFeature: true,
        })),
        architectureSummary: `Evidence-backed local scan of ${report.files.length}${report.filesTruncated ? '+' : ''} files.`,
        keyDirectories: [...new Set(report.files.map((file) => file.split('/')[0]).filter((part) => part && !part.includes('.')))].slice(0, 12).map((part) => `/${part}`),
        suggestedNewFeatures: [],
        importedAt: report.scannedAt,
      },
    }));
  }, [updateActiveProject]);

  const replaceFromImport = useCallback((project: SpecKitProject) => updateActiveProject(() => project), [updateActiveProject]);

  const mergeImportedFeature = useCallback((stories: UserStory[], data: ImportedFeatureData) => {
    updateActiveProject((project) => {
      const now = new Date().toISOString();
      const extraction: FeatureExtractionPackage = { ...data, userStories: stories };
      const featureInbox = [...(project.featureInbox || []), createFeatureInboxItem(extraction, data.source || 'unknown', project.featureInbox?.length || 0, now)];
      return {
        ...project,
        featureInbox,
        spec: {
          ...project.spec,
          userStories: [...project.spec.userStories, ...stories],
          functionalRequirements: [...project.spec.functionalRequirements, ...(data.functionalRequirements || [])],
          lastUpdated: now,
        },
        tasks: {
          ...project.tasks,
          tasks: [...project.tasks.tasks, ...(data.tasks || []).map(createImportedTask)],
          lastUpdated: now,
        },
      };
    });
  }, [updateActiveProject]);

  const saveLatestFeatureReview = useCallback((review: { impactMap?: { content: string; acceptedAt?: string }; architecturePlan?: { path?: string; content: string; acceptedAt?: string }; deliveryPlan?: { path?: string; content: string; acceptedAt?: string } }) => {
    updateActiveProject((project) => {
      const items = project.featureInbox || [];
      if (!items.length) return project;
      const index = items.length - 1;
      return { ...project, featureInbox: items.map((item, itemIndex) => itemIndex === index ? { ...item, ...review } : item) };
    });
  }, [updateActiveProject]);

  const selectVersion = useCallback((version: string) => updateActiveProject((project) => ({ ...project, version })), [updateActiveProject]);

  return {
    projects, activeProject, selectProject, createProject, resetProjects,
    saveSpec, savePlan, saveTasks, saveConstitution, saveAudit, saveJourney,
    applyAiSpecData, attachTruth, replaceFromImport, mergeImportedFeature, saveLatestFeatureReview, selectVersion,
  };
}
