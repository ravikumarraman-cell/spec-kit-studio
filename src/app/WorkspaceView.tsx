import { lazy, Suspense, useEffect } from 'react';
import type { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import { activeFeatureForProject, approveJourneyStage, createFeatureJourney, getJourneyStage } from '../lib/featureJourney';
import type { SpecKitProject, ViewTab } from '../types/speckit';
import { workspaceViewWarmupTargets } from '../lib/workspaceViewPreload';
import { WorkspaceLoadingState } from '../components/common/WorkspaceLoadingState';

const workspaceViewImports = {
  overview: () => import('../components/dashboard/workspaceHub/WorkspaceHub').then((module) => ({ default: module.WorkspaceHub })),
  journey: () => import('../components/journey/FeatureJourney').then((module) => ({ default: module.FeatureJourney })),
  refinery: () => import('../components/refinery/OutcomeRefinery').then((module) => ({ default: module.OutcomeRefinery })),
  workflows: () => import('../components/process/ProcessStudio').then((module) => ({ default: module.ProcessStudio })),
  workspace: () => import('../components/workspace/WorkspaceControlCenter').then((module) => ({ default: module.WorkspaceControlCenter })),
  spec: () => import('../components/spec/SpecEditor').then((module) => ({ default: module.SpecEditor })),
  plan: () => import('../components/plan/PlanEditor').then((module) => ({ default: module.PlanEditor })),
  tasks: () => import('../components/tasks/TaskBoard').then((module) => ({ default: module.TaskBoard })),
  constitution: () => import('../components/constitution/ConstitutionEditor').then((module) => ({ default: module.ConstitutionEditor })),
  prompt: () => import('../components/prompt/PromptStudio').then((module) => ({ default: module.PromptStudio })),
  audit: () => import('../components/audit/AuditDashboard').then((module) => ({ default: module.AuditDashboard })),
  export: () => import('../components/exporter/CliExporter').then((module) => ({ default: module.CliExporter })),
  import: () => import('../components/import/RepoImportStudio').then((module) => ({ default: module.RepoImportStudio })),
  settings: () => import('../components/settings/StudioSettings').then((module) => ({ default: module.StudioSettings })),
};

export function preloadWorkspaceView(tab: ViewTab) {
  return workspaceViewImports[tab]();
}

const RepoImportStudio = lazy(workspaceViewImports.import);
const WorkspaceControlCenter = lazy(workspaceViewImports.workspace);
const SpecEditor = lazy(workspaceViewImports.spec);
const PlanEditor = lazy(workspaceViewImports.plan);
const TaskBoard = lazy(workspaceViewImports.tasks);
const ConstitutionEditor = lazy(workspaceViewImports.constitution);
const PromptStudio = lazy(workspaceViewImports.prompt);
const AuditDashboard = lazy(workspaceViewImports.audit);
const CliExporter = lazy(workspaceViewImports.export);
const FeatureJourney = lazy(workspaceViewImports.journey);
const OutcomeRefinery = lazy(workspaceViewImports.refinery);
const WorkspaceHub = lazy(workspaceViewImports.overview);
const StudioSettings = lazy(workspaceViewImports.settings);
const ProcessStudio = lazy(workspaceViewImports.workflows);

type ProjectWorkspace = ReturnType<typeof useProjectWorkspace>;

interface WorkspaceViewProps {
  activeTab: ViewTab;
  isDarkMode: boolean;
  project: SpecKitProject;
  targetPromptTaskId?: string;
  workspace: ProjectWorkspace;
  onNavigate: (tab: ViewTab) => void;
  onOpenAiSpec: () => void;
  onOpenFeatureImport: () => void;
  onStartStoryDelivery: (storyId: string) => void;
  onStartFeatureFromWorkspace: () => void;
  onSelectPromptTask: (taskId: string) => void;
  onPromptTaskHandled: () => void;
  onOpenQuickSearch: () => void;
}

export function WorkspaceView({
  activeTab,
  isDarkMode,
  project,
  targetPromptTaskId,
  workspace,
  onNavigate,
  onOpenAiSpec,
  onOpenFeatureImport,
  onStartStoryDelivery,
  onStartFeatureFromWorkspace,
  onSelectPromptTask,
  onPromptTaskHandled,
  onOpenQuickSearch,
}: WorkspaceViewProps) {
  const focusFeature = activeFeatureForProject(project);

  useEffect(() => {
    const warm = () => workspaceViewWarmupTargets(activeTab).forEach((tab) => { void preloadWorkspaceView(tab); });
    // Never compete with initial paint, interaction, or an active agent run.
    // requestIdleCallback is not universal, so retain a small cancellable
    // fallback for Safari and embedded browsers.
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(warm, { timeout: 2_000 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }
    const timeoutId = window.setTimeout(warm, 750);
    return () => window.clearTimeout(timeoutId);
  }, [activeTab]);

  return (
    <Suspense fallback={<WorkspaceLoadingState />}>
      <div key={activeTab} className="workspace-view-enter">
        {activeTab === 'overview' && <WorkspaceHub project={project} onNavigate={onNavigate} onOpenSearch={onOpenQuickSearch} onStartDelivery={onOpenFeatureImport} />}
        {activeTab === 'journey' && <FeatureJourney project={project} onNavigate={onNavigate} onOpenFeatureImport={onOpenFeatureImport} onSaveJourney={workspace.saveJourney} onSaveFeatureReview={workspace.saveLatestFeatureReview} onUpdateFeatureIdentity={workspace.updateFeatureIdentity} />}
        {activeTab === 'refinery' && <OutcomeRefinery project={project} onSave={workspace.saveOutcomeRefinery} onApplyContract={workspace.applyOutcomeRefineryContract} onOpenJourney={() => onNavigate('journey')} />}
        {activeTab === 'workflows' && <ProcessStudio key={project.id} project={project} onSaveCases={workspace.saveProcessCases} onStartFeature={onOpenFeatureImport} onOpenWorkspace={() => onNavigate('workspace')} onSelectWorkflow={workspace.saveWorkflowFocus} />}
        {activeTab === 'import' && <RepoImportStudio onImportComplete={(importedProject) => { workspace.replaceFromImport(importedProject); onNavigate('overview'); }} isDarkMode={isDarkMode} />}
        {activeTab === 'workspace' && <WorkspaceControlCenter project={project} onTruthAttached={workspace.attachTruth} onSaveBaseline={workspace.saveWorkspaceBaseline} onOpenJourney={() => onNavigate('journey')} onOpenFeatureImport={onStartFeatureFromWorkspace} onOpenWorkflow={() => onNavigate('workflows')} />}
        {activeTab === 'settings' && <StudioSettings project={project} onSelectVersion={workspace.selectVersion} onSaveStackProfile={workspace.saveStackProfile} onRestoreSnapshot={workspace.restoreProjectSnapshot} />}
        {activeTab === 'spec' && <SpecEditor projectId={project.id} spec={project.spec} onSaveSpec={workspace.saveSpec} onTriggerAiGenerate={onOpenAiSpec} onOpenFeatureImport={onOpenFeatureImport} onStartStoryDelivery={onStartStoryDelivery} featureInbox={project.featureInbox} />}
        {activeTab === 'plan' && <PlanEditor projectId={project.id} plan={project.plan} focusFeature={focusFeature} onSavePlan={workspace.savePlan} onTriggerAiGenerate={onOpenAiSpec} isDarkMode={isDarkMode} repositoryPath={project.importedRepo?.repoUrl} stageApproved={Boolean(project.journey?.completedStages.includes(4))} onRecoverFeatureArchitecturePlan={(architecturePlan) => workspace.saveLatestFeatureReview({ architecturePlan })} />}
        {activeTab === 'tasks' && <TaskBoard projectId={project.id} taskBreakdown={project.tasks} spec={project.spec} focusFeature={focusFeature} onSaveTasks={workspace.saveTasks} onTriggerAiGenerate={onOpenAiSpec} onSelectTaskForPrompt={onSelectPromptTask} repositoryPath={project.importedRepo?.repoUrl} onRecoverFeatureDeliveryPlan={(deliveryPlan) => workspace.saveLatestFeatureReview({ deliveryPlan })} />}
        {activeTab === 'constitution' && <ConstitutionEditor projectId={project.id} constitution={project.constitution} onSaveConstitution={workspace.saveConstitution} />}
        {activeTab === 'prompt' && <PromptStudio project={project} initialTaskId={targetPromptTaskId} onRecoverFeatureDeliveryPlan={(deliveryPlan) => workspace.saveLatestFeatureReview({ deliveryPlan })} onRecordFeatureImplementation={(featureId, receipt) => { const saved = workspace.saveFeatureImplementation(featureId, receipt); onPromptTaskHandled(); return saved; }} onOpenJourney={() => onNavigate('journey')} />}
        {activeTab === 'audit' && <AuditDashboard project={project} onUpdateAudit={workspace.saveAudit} onOpenJourney={() => onNavigate('journey')} onApproveQualityGate={() => { const qualityGate = getJourneyStage(6); if (!qualityGate.ready(project)) return; workspace.saveJourney(approveJourneyStage(project.journey || createFeatureJourney(), 6)); onNavigate('overview'); }} />}
        {activeTab === 'export' && <CliExporter project={project} />}
      </div>
    </Suspense>
  );
}
