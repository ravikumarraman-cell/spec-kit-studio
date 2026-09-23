import { useCallback, useEffect, useState } from 'react';
import { TruthReport } from '../lib/connector';
import { FeatureExtractionPackage } from '../lib/api/imports';
import { createFeatureInboxItem } from '../lib/featureInbox';
import { storageService } from '../lib/storage';
import { normalizeGitRemote } from '../lib/projectIdentity';
import { recordFeatureImplementationReceipt } from '../lib/featureReceipts';
import { reconcileDeliveryPlanReceipts } from '../lib/featureDeliveryPlanRevision';
import { activeFeatureForProject } from '../lib/featureJourney';
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
  FeatureImplementationReceipt,
  StudioProcessCase,
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
    if (!storageService.updateActiveProject(updated)) return null;

    // Re-read after the write. This makes a feature import a durable
    // transaction: the receipt must exist in the persisted aggregate before
    // React state can claim the operation succeeded.
    const persisted = storageService.getProjects().find((project) => project.id === updated.id);
    if (!persisted) return null;
    setActiveProject(persisted);
    setProjects(storageService.getProjects());
    return persisted;
  }, []);

  const selectProject = useCallback((id: string) => {
    storageService.setActiveProjectId(id);
    const selected = storageService.getActiveProject();
    // A completed feature is the safe default when re-entering a workspace.
    // Independent workflows remain available, but require a fresh explicit choice
    // so an old bug/assessment context cannot masquerade as the active journey.
    if (selected.journey?.completedStages.includes(8) && selected.workflowFocus !== 'feature') {
      storageService.updateActiveProject({ ...selected, workflowFocus: 'feature', updatedAt: new Date().toISOString() });
    }
    refresh();
  }, [refresh]);

  const createProject = useCallback((name: string, description: string) => {
    const created = storageService.createNewProject(name, description);
    setActiveProject(created);
    setProjects(storageService.getProjects());
    return created;
  }, []);

  const deleteProject = useCallback((id: string) => {
    // Storage preserves a recoverable snapshot before removal. Keep one
    // workspace available so Studio never falls into an empty state.
    if (storageService.getProjects().length <= 1) return false;
    storageService.deleteProject(id);
    refresh();
    return true;
  }, [refresh]);

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
  const saveStackProfile = useCallback((stackProfile: SpecKitProject['stackProfile']) => updateActiveProject((project) => ({ ...project, stackProfile })), [updateActiveProject]);
  const saveProcessCases = useCallback((processCases: StudioProcessCase[]) => updateActiveProject((project) => ({ ...project, processCases })), [updateActiveProject]);
  const saveWorkflowFocus = useCallback((workflowFocus: SpecKitProject['workflowFocus']) => updateActiveProject((project) => ({ ...project, workflowFocus })), [updateActiveProject]);

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
        primaryLanguage: report.technologies.find((item) => ['Python', 'Go', 'Rust', 'Java', '.NET', 'Ruby', 'PHP'].includes(item.name))?.name || report.technologies.find((item) => item.name === 'React' || item.name === 'Next.js') ? 'TypeScript/JavaScript' : 'Unknown / mixed stack',
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
      repositoryIdentity: {
        canonicalRemote: normalizeGitRemote(report.git.remotes.split('\n').find((line) => /\borigin\b.*\(fetch\)/.test(line))?.split(/\s+/)[1] || report.repositoryPath),
        lastScannedBranch: report.git.branch || undefined,
        lastScannedAt: report.scannedAt,
      },
    }));
  }, [updateActiveProject]);

  const replaceFromImport = useCallback((project: SpecKitProject) => {
    // A new imported project has a different ID from the workspace that opened
    // the dialog. Persist and select it atomically; updating the old active
    // project alone makes the UI fall back to that blank workspace on refresh.
    const imported = storageService.saveImportedProject(project);
    setActiveProject(imported);
    setProjects(storageService.getProjects());
    return imported;
  }, []);

  const mergeImportedFeature = useCallback((stories: UserStory[], data: ImportedFeatureData) => {
    let importedFeatureId = '';
    const updated = updateActiveProject((project) => {
      const now = new Date().toISOString();
      const extraction: FeatureExtractionPackage = { ...data, userStories: stories };
      const importedFeature = createFeatureInboxItem(extraction, data.source || 'unknown', project.featureInbox?.length || 0, now);
      importedFeatureId = importedFeature.id;
      const featureInbox = [...(project.featureInbox || []), importedFeature];
      return {
        ...project,
        featureInbox,
        journey: project.journey ? { ...project.journey, featureId: importedFeature.id, updatedAt: now } : project.journey,
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
    // The dialog may close only after the durable aggregate contains the new
    // feature receipt. This protects against stale workspace selection and
    // makes a failed browser persistence operation visible to the caller.
    return Boolean(importedFeatureId && updated?.featureInbox?.some((feature) => feature.id === importedFeatureId));
  }, [updateActiveProject]);

  const saveLatestFeatureReview = useCallback((review: { impactMap?: { content: string; acceptedAt?: string }; architecturePlan?: { path?: string; content: string; acceptedAt?: string }; deliveryPlan?: { path?: string; content: string; acceptedAt?: string; repositoryPath?: string } }) => {
    updateActiveProject((project) => {
      const items = project.featureInbox || [];
      const activeFeature = activeFeatureForProject(project);
      if (!activeFeature || !items.length) return project;
      return {
        ...project,
        featureInbox: items.map((item) => {
          if (item.id !== activeFeature.id) return item;
          if (!review.deliveryPlan || item.deliveryPlan?.content === review.deliveryPlan.content) return { ...item, ...review };
          const receiptRevision = reconcileDeliveryPlanReceipts(item.deliveryPlan?.content, review.deliveryPlan.content, item.implementationReceipts);
          return {
            ...item,
            ...review,
            implementationReceipts: receiptRevision.active,
            supersededImplementationReceipts: [
              ...(item.supersededImplementationReceipts || []),
              ...receiptRevision.superseded,
            ],
          };
        }),
      };
    });
  }, [updateActiveProject]);

  const saveFeatureImplementation = useCallback((featureId: string, receipt: FeatureImplementationReceipt) => {
    let saved = false;
    updateActiveProject((project) => {
      const updated = recordFeatureImplementationReceipt(project, featureId, receipt);
      saved = updated !== project;
      return updated;
    });
    return saved;
  }, [updateActiveProject]);

  const updateFeatureIdentity = useCallback((featureId: string, identity: Partial<Pick<import('../types/speckit').FeatureInboxItem, 'featureKey' | 'slug' | 'branch' | 'worktreePath' | 'baselineCommit'>>) => {
    updateActiveProject((project) => ({ ...project, featureInbox: (project.featureInbox || []).map((feature) => feature.id === featureId ? { ...feature, ...identity } : feature) }));
  }, [updateActiveProject]);

  const selectVersion = useCallback((version: string) => updateActiveProject((project) => ({ ...project, version })), [updateActiveProject]);
  const restoreProjectSnapshot = useCallback((savedAt: string) => {
    const active = storageService.getActiveProject();
    const restored = storageService.restoreProjectBackup(active.id, savedAt);
    if (restored) refresh();
    return restored;
  }, [refresh]);

  return {
    projects, activeProject, selectProject, createProject, deleteProject, resetProjects,
    saveSpec, savePlan, saveTasks, saveConstitution, saveAudit, saveJourney, saveStackProfile, saveProcessCases, saveWorkflowFocus,
    applyAiSpecData, attachTruth, replaceFromImport, mergeImportedFeature, saveLatestFeatureReview, saveFeatureImplementation, updateFeatureIdentity, selectVersion, restoreProjectSnapshot,
  };
}
