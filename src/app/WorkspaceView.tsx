import { lazy, Suspense, useEffect } from 'react';
import type { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import { activeFeatureForProject, approveJourneyStage, createFeatureJourney, getJourneyStage } from '../lib/featureJourney';
import type { DeliveryScope, PersonaId, SddEngineId, SpecKitProject, ViewTab } from '../types/speckit';
import { shouldWarmWorkspaceViews, workspaceViewWarmupTargets } from '../lib/workspaceViewPreload';
import { WorkspaceLoadingState } from '../components/common/WorkspaceLoadingState';
import { DeliveryPersonaMarker } from '../components/common/DeliveryPersonaMarker';

const workspaceViewImports = {
  overview: () => import('../components/dashboard/workspaceHub/WorkspaceHub').then((module) => ({ default: module.WorkspaceHub })),
  personas: () => import('../components/personas/PersonaWorkspace').then((module) => ({ default: module.PersonaWorkspace })),
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
const PersonaWorkspace = lazy(workspaceViewImports.personas);
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
  onContinueImportedHandoffFromWorkspace: () => void;
  onSelectPromptTask: (taskId: string) => void;
  onPromptTaskHandled: () => void;
  onSelectSddEngine: (engine: SddEngineId) => void;
  personaRoute?: PersonaId;
  onStartPersona: (personaId: PersonaId) => void;
  onClearPersonaRoute: () => void;
  onImportPersonaFeature: (personaId: PersonaId, scope?: DeliveryScope) => void;
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
  onContinueImportedHandoffFromWorkspace,
  onSelectPromptTask,
  onPromptTaskHandled,
  onSelectSddEngine,
  personaRoute,
  onStartPersona,
  onClearPersonaRoute,
  onImportPersonaFeature,
}: WorkspaceViewProps) {
  const focusFeature = activeFeatureForProject(project);
  const completedFeatureHandoff = Boolean(
    focusFeature
    && project.journey?.featureId === focusFeature.id
    && project.journey.completedStages.includes(8),
  );

  // `export` is an advanced, workspace-wide utility. A completed delivery
  // always has a narrower, feature-owned handoff with the correct archives
  // and next action, so never let generic navigation replace that context.
  useEffect(() => {
    if (activeTab === 'export' && completedFeatureHandoff) onNavigate('journey');
  }, [activeTab, completedFeatureHandoff, onNavigate]);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (!shouldWarmWorkspaceViews(connection)) return;
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
    <>
    <DeliveryPersonaMarker project={project} activePersona={personaRoute} onOpenPersona={onStartPersona} />
    <Suspense fallback={<WorkspaceLoadingState />}>
      <div key={activeTab} className="workspace-view-enter">
        {activeTab === 'overview' && <WorkspaceHub project={project} onNavigate={onNavigate} onStartPersona={onStartPersona} onClearPersonaRoute={onClearPersonaRoute} onPrefetchPersona={() => { void preloadWorkspaceView('personas'); }} personaRoute={personaRoute} />}
        {activeTab === 'personas' && personaRoute && <PersonaWorkspace project={project} personaId={personaRoute} onCreateFeature={workspace.startPersonaFeature} onSaveProductOutcome={workspace.saveProductOutcome} onSaveProductManagerDecision={workspace.saveProductManagerDecision} onSaveDeveloperArchitecture={workspace.saveDeveloperArchitecture} onSaveTechnicalRole={workspace.saveTechnicalRole} onSaveBusinessAnalysis={workspace.saveBusinessAnalysis} onSaveSecurityResearch={workspace.saveSecurityResearch} onCompletePersonaWorkflow={workspace.completePersonaWorkflow} onResumeHandoff={workspace.resumePersonaHandoff} onStartPersona={onStartPersona} onNavigate={onNavigate} onImportFeature={onImportPersonaFeature} onExploreSharedJourney={(featureId) => workspace.startJourneyFromPersonaHandoff(featureId, personaRoute)} />}
        {activeTab === 'journey' && <FeatureJourney project={project} onNavigate={onNavigate} onOpenFeatureImport={onOpenFeatureImport} onSaveJourney={workspace.saveJourney} onSaveFeatureReview={workspace.saveLatestFeatureReview} onUpdateFeatureIdentity={workspace.updateFeatureIdentity} onSaveProductOutcome={workspace.saveProductOutcome} onSaveProductManagerDecision={workspace.saveProductManagerDecision} onSaveFeaturePullRequest={workspace.saveFeaturePullRequest} onOpenImplementationTask={onSelectPromptTask} actorPersona={personaRoute} onStartTechnicalRole={() => { onStartPersona('developer'); onNavigate('journey'); }} />}
        {activeTab === 'refinery' && <OutcomeRefinery project={project} onSave={workspace.saveOutcomeRefinery} onAttachReferenceImage={workspace.attachFeatureReferenceImage} onApplyContract={workspace.applyOutcomeRefineryContract} onOpenJourney={() => onNavigate('journey')} actorPersona={personaRoute} onOpenDeveloper={() => onStartPersona('developer')} />}
        {activeTab === 'workflows' && <ProcessStudio key={project.id} project={project} onSaveCases={workspace.saveProcessCases} onStartFeature={onOpenFeatureImport} onOpenWorkspace={() => onNavigate('workspace')} onSelectWorkflow={workspace.saveWorkflowFocus} />}
        {activeTab === 'import' && <RepoImportStudio onImportComplete={(importedProject) => { workspace.replaceFromImport(importedProject); onNavigate('overview'); }} isDarkMode={isDarkMode} />}
        {activeTab === 'workspace' && <WorkspaceControlCenter project={project} onTruthAttached={workspace.attachTruth} onSaveBaseline={workspace.saveWorkspaceBaseline} onOpenJourney={() => onNavigate('journey')} onOpenFeatureImport={() => personaRoute === 'developer' ? onImportPersonaFeature('developer', 'feature') : onStartFeatureFromWorkspace()} onContinueImportedHandoff={onContinueImportedHandoffFromWorkspace} onOpenWorkflow={() => onNavigate('workflows')} />}
        {activeTab === 'settings' && <StudioSettings project={project} onSelectVersion={workspace.selectVersion} onSelectSddEngine={onSelectSddEngine} onSaveStackProfile={workspace.saveStackProfile} onRestoreSnapshot={workspace.restoreProjectSnapshot} />}
        {activeTab === 'spec' && <SpecEditor projectId={project.id} spec={project.spec} onSaveSpec={workspace.saveSpec} onTriggerAiGenerate={onOpenAiSpec} onOpenFeatureImport={onOpenFeatureImport} onStartStoryDelivery={onStartStoryDelivery} featureInbox={project.featureInbox} />}
        {activeTab === 'plan' && <PlanEditor projectId={project.id} plan={project.plan} focusFeature={focusFeature} onSavePlan={workspace.savePlan} onTriggerAiGenerate={onOpenAiSpec} isDarkMode={isDarkMode} repositoryPath={project.importedRepo?.repoUrl} stageApproved={Boolean(project.journey?.completedStages.includes(4))} onRecoverFeatureArchitecturePlan={(architecturePlan) => workspace.saveLatestFeatureReview({ architecturePlan })} />}
        {activeTab === 'tasks' && <TaskBoard projectId={project.id} taskBreakdown={project.tasks} spec={project.spec} focusFeature={focusFeature} onSaveTasks={workspace.saveTasks} onTriggerAiGenerate={onOpenAiSpec} onSelectTaskForPrompt={onSelectPromptTask} repositoryPath={project.importedRepo?.repoUrl} onRecoverFeatureDeliveryPlan={(deliveryPlan) => workspace.saveLatestFeatureReview({ deliveryPlan })} />}
        {activeTab === 'constitution' && <ConstitutionEditor projectId={project.id} constitution={project.constitution} onSaveConstitution={workspace.saveConstitution} />}
        {activeTab === 'prompt' && <PromptStudio project={project} initialTaskId={targetPromptTaskId} onRecoverFeatureDeliveryPlan={(deliveryPlan) => workspace.saveLatestFeatureReview({ deliveryPlan })} onRecordFeatureImplementation={(featureId, receipt) => { const saved = workspace.saveFeatureImplementation(featureId, receipt); onPromptTaskHandled(); return saved; }} onOpenJourney={() => onNavigate('journey')} />}
        {activeTab === 'audit' && <AuditDashboard project={project} onUpdateAudit={workspace.saveAudit} onOpenJourney={() => onNavigate('journey')} onRestoreUnlinkedFeatureScope={workspace.restoreUnlinkedFeatureScope} onApproveQualityGate={() => { const qualityGate = getJourneyStage(6); if (!qualityGate.ready(project)) return; workspace.saveJourney(approveJourneyStage(project.journey || createFeatureJourney(), 6)); onNavigate('overview'); }} />}
        {activeTab === 'export' && !completedFeatureHandoff && <CliExporter project={project} />}
        {activeTab === 'export' && completedFeatureHandoff && <WorkspaceLoadingState />}
      </div>
    </Suspense>
    </>
  );
}
