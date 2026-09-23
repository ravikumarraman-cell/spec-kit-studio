import { lazy, Suspense } from 'react';
import type { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import { activeFeatureForProject, approveJourneyStage, createFeatureJourney, getJourneyStage } from '../lib/featureJourney';
import type { SpecKitProject, ViewTab } from '../types/speckit';

const RepoImportStudio = lazy(() => import('../components/import/RepoImportStudio').then((module) => ({ default: module.RepoImportStudio })));
const WorkspaceControlCenter = lazy(() => import('../components/workspace/WorkspaceControlCenter').then((module) => ({ default: module.WorkspaceControlCenter })));
const SpecEditor = lazy(() => import('../components/spec/SpecEditor').then((module) => ({ default: module.SpecEditor })));
const PlanEditor = lazy(() => import('../components/plan/PlanEditor').then((module) => ({ default: module.PlanEditor })));
const TaskBoard = lazy(() => import('../components/tasks/TaskBoard').then((module) => ({ default: module.TaskBoard })));
const ConstitutionEditor = lazy(() => import('../components/constitution/ConstitutionEditor').then((module) => ({ default: module.ConstitutionEditor })));
const PromptStudio = lazy(() => import('../components/prompt/PromptStudio').then((module) => ({ default: module.PromptStudio })));
const AuditDashboard = lazy(() => import('../components/audit/AuditDashboard').then((module) => ({ default: module.AuditDashboard })));
const CliExporter = lazy(() => import('../components/exporter/CliExporter').then((module) => ({ default: module.CliExporter })));
const FeatureJourney = lazy(() => import('../components/journey/FeatureJourney').then((module) => ({ default: module.FeatureJourney })));
const StudioSettings = lazy(() => import('../components/settings/StudioSettings').then((module) => ({ default: module.StudioSettings })));
const ProcessStudio = lazy(() => import('../components/process/ProcessStudio').then((module) => ({ default: module.ProcessStudio })));

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
  onStartFeatureFromWorkspace: () => void;
  onSelectPromptTask: (taskId: string) => void;
  onPromptTaskHandled: () => void;
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
  onStartFeatureFromWorkspace,
  onSelectPromptTask,
  onPromptTaskHandled,
}: WorkspaceViewProps) {
  const focusFeature = activeFeatureForProject(project);

  return (
    <Suspense fallback={<div className="py-16 text-center text-xs theme-text-muted">Loading workspace...</div>}>
      <div key={activeTab} className="workspace-view-enter">
        {activeTab === 'overview' && <FeatureJourney project={project} onNavigate={onNavigate} onOpenFeatureImport={onOpenFeatureImport} onSaveJourney={workspace.saveJourney} onSaveFeatureReview={workspace.saveLatestFeatureReview} onUpdateFeatureIdentity={workspace.updateFeatureIdentity} />}
        {activeTab === 'workflows' && <ProcessStudio key={project.id} project={project} onSaveCases={workspace.saveProcessCases} onStartFeature={onOpenFeatureImport} onOpenWorkspace={() => onNavigate('workspace')} onSelectWorkflow={workspace.saveWorkflowFocus} />}
        {activeTab === 'import' && <RepoImportStudio onImportComplete={(importedProject) => { workspace.replaceFromImport(importedProject); onNavigate('overview'); }} isDarkMode={isDarkMode} />}
        {activeTab === 'workspace' && <WorkspaceControlCenter project={project} onTruthAttached={workspace.attachTruth} onOpenJourney={() => onNavigate('overview')} onOpenFeatureImport={onStartFeatureFromWorkspace} onOpenWorkflow={() => onNavigate('workflows')} />}
        {activeTab === 'settings' && <StudioSettings project={project} onSelectVersion={workspace.selectVersion} onSaveStackProfile={workspace.saveStackProfile} onOpenWorkspace={() => onNavigate('workspace')} onRestoreSnapshot={workspace.restoreProjectSnapshot} />}
        {activeTab === 'spec' && <SpecEditor projectId={project.id} spec={project.spec} onSaveSpec={workspace.saveSpec} onTriggerAiGenerate={onOpenAiSpec} onOpenFeatureImport={onOpenFeatureImport} featureInbox={project.featureInbox} />}
        {activeTab === 'plan' && <PlanEditor projectId={project.id} plan={project.plan} focusFeature={focusFeature} onSavePlan={workspace.savePlan} onTriggerAiGenerate={onOpenAiSpec} isDarkMode={isDarkMode} repositoryPath={project.importedRepo?.repoUrl} stageApproved={Boolean(project.journey?.completedStages.includes(4))} onRecoverFeatureArchitecturePlan={(architecturePlan) => workspace.saveLatestFeatureReview({ architecturePlan })} />}
        {activeTab === 'tasks' && <TaskBoard projectId={project.id} taskBreakdown={project.tasks} spec={project.spec} focusFeature={focusFeature} onSaveTasks={workspace.saveTasks} onTriggerAiGenerate={onOpenAiSpec} onSelectTaskForPrompt={onSelectPromptTask} repositoryPath={project.importedRepo?.repoUrl} onRecoverFeatureDeliveryPlan={(deliveryPlan) => workspace.saveLatestFeatureReview({ deliveryPlan })} />}
        {activeTab === 'constitution' && <ConstitutionEditor projectId={project.id} constitution={project.constitution} onSaveConstitution={workspace.saveConstitution} />}
        {activeTab === 'prompt' && <PromptStudio project={project} initialTaskId={targetPromptTaskId} onRecoverFeatureDeliveryPlan={(deliveryPlan) => workspace.saveLatestFeatureReview({ deliveryPlan })} onRecordFeatureImplementation={(featureId, receipt) => { const saved = workspace.saveFeatureImplementation(featureId, receipt); onPromptTaskHandled(); return saved; }} onOpenJourney={() => onNavigate('overview')} />}
        {activeTab === 'audit' && <AuditDashboard project={project} onUpdateAudit={workspace.saveAudit} onOpenJourney={() => onNavigate('overview')} onApproveQualityGate={() => { const qualityGate = getJourneyStage(6); if (!qualityGate.ready(project)) return; workspace.saveJourney(approveJourneyStage(project.journey || createFeatureJourney(), 6)); onNavigate('overview'); }} />}
        {activeTab === 'export' && <CliExporter project={project} />}
      </div>
    </Suspense>
  );
}