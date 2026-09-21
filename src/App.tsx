import React, { lazy, Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { SpecKitProject, ViewTab, FeatureSpec, ImplementationPlan, TaskBreakdown } from './types/speckit';
import { ImportedFeatureData, useProjectWorkspace } from './hooks/useProjectWorkspace';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { JourneyHandoff } from './components/journey/JourneyHandoff';
import { approveJourneyStage, createFeatureJourney, getJourneyStage } from './lib/featureJourney';

const RepoImportStudio = lazy(() => import('./components/import/RepoImportStudio').then((module) => ({ default: module.RepoImportStudio })));
const WorkspaceControlCenter = lazy(() => import('./components/workspace/WorkspaceControlCenter').then((module) => ({ default: module.WorkspaceControlCenter })));
const SpecEditor = lazy(() => import('./components/spec/SpecEditor').then((module) => ({ default: module.SpecEditor })));
const PlanEditor = lazy(() => import('./components/plan/PlanEditor').then((module) => ({ default: module.PlanEditor })));
const TaskBoard = lazy(() => import('./components/tasks/TaskBoard').then((module) => ({ default: module.TaskBoard })));
const ConstitutionEditor = lazy(() => import('./components/constitution/ConstitutionEditor').then((module) => ({ default: module.ConstitutionEditor })));
const PromptStudio = lazy(() => import('./components/prompt/PromptStudio').then((module) => ({ default: module.PromptStudio })));
const AuditDashboard = lazy(() => import('./components/audit/AuditDashboard').then((module) => ({ default: module.AuditDashboard })));
const CliExporter = lazy(() => import('./components/exporter/CliExporter').then((module) => ({ default: module.CliExporter })));
const FeatureJourney = lazy(() => import('./components/journey/FeatureJourney').then((module) => ({ default: module.FeatureJourney })));
const StudioSettings = lazy(() => import('./components/settings/StudioSettings').then((module) => ({ default: module.StudioSettings })));
// Global dialogs are reached only through explicit user intent. Keeping them
// out of the app shell avoids paying their code cost during initial navigation.
const QuickSearchModal = lazy(() => import('./components/common/QuickSearchModal').then((module) => ({ default: module.QuickSearchModal })));
const AiSpecModal = lazy(() => import('./components/common/AiSpecModal').then((module) => ({ default: module.AiSpecModal })));
const FeatureImportModal = lazy(() => import('./components/import/FeatureImportModal').then((module) => ({ default: module.FeatureImportModal })));
const IntegrationsModal = lazy(() => import('./components/integrations/IntegrationsModal').then((module) => ({ default: module.IntegrationsModal })));
const NewProjectModal = lazy(() => import('./components/project/NewProjectModal').then((module) => ({ default: module.NewProjectModal })));

function AppContent() {
  const { isDark } = useTheme();
  const {
    projects, activeProject, selectProject, createProject, resetProjects,
    saveSpec, savePlan, saveTasks, saveConstitution, saveAudit, saveJourney,
    applyAiSpecData, attachTruth, replaceFromImport, mergeImportedFeature, saveLatestFeatureReview, saveLatestFeatureImplementation, selectVersion,
  } = useProjectWorkspace();
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Modals State
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isAiSpecModalOpen, setIsAiSpecModalOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isFeatureImportModalOpen, setIsFeatureImportModalOpen] = useState<boolean>(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);

  // Selected Task for Prompt Studio
  const [targetPromptTaskId, setTargetPromptTaskId] = useState<string | undefined>(undefined);

  if (!activeProject) {
    return (
      <div className="min-h-screen theme-canvas flex items-center justify-center">
        <div className="text-xs theme-text-muted font-mono animate-pulse">Initializing Spec-Kit Studio...</div>
      </div>
    );
  }

  const handleCreateNewProject = (name: string, description: string) => {
    createProject(name, description);
    setIsNewProjectModalOpen(false);
    setActiveTab('overview');
  };

  const handleResetSampleData = () => { resetProjects(); setActiveTab('overview'); };
  const handleApplyAiSpecData = (spec: FeatureSpec, plan?: ImplementationPlan, tasks?: TaskBreakdown) => { applyAiSpecData(spec, plan, tasks); setIsAiSpecModalOpen(false); };

  const handleSelectTaskForPrompt = (taskId: string) => {
    setTargetPromptTaskId(taskId);
    setActiveTab('prompt');
  };

  const handleImportRepoComplete = (newProject: SpecKitProject) => {
    replaceFromImport(newProject);
    setActiveTab('overview');
  };
  const handleStartFeatureFromWorkspace = () => {
    const journey = activeProject.journey || createFeatureJourney();
    if (!journey.completedStages.includes(1)) {
      saveJourney(approveJourneyStage(journey, 1));
    }
    setIsFeatureImportModalOpen(true);
  };
  const handleMergeIntoActiveProject = (stories: Parameters<typeof mergeImportedFeature>[0], data: ImportedFeatureData) => { mergeImportedFeature(stories, data); setActiveTab('overview'); };
  const handleApproveJourneyStage = (stageId: number) => {
    const journey = activeProject.journey || createFeatureJourney();
    const stage = getJourneyStage(stageId);
    if (journey.activeStage !== stageId || !stage.ready(activeProject)) {
      setActiveTab('overview');
      return;
    }
    saveJourney(approveJourneyStage(journey, stageId));
    setActiveTab('overview');
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden theme-canvas font-sans antialiased flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Clean Single-Row Top Navigation Bar */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSelectProject={selectProject}
        onCreateProject={() => setIsNewProjectModalOpen(true)}
        onOpenImportStudio={() => setActiveTab('import')}
        onOpenFeatureImport={() => setIsFeatureImportModalOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsModalOpen(true)}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onOpenAiSpecModal={() => setIsAiSpecModalOpen(true)}
        isDarkMode={isDark}
        onToggleTheme={() => {}}
        onResetSampleData={handleResetSampleData}
        onSelectVersion={selectVersion}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Studio Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden">
        {/* Left Workflow Menu Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          project={activeProject}
          isCollapsed={!isSidebarOpen}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <JourneyHandoff project={activeProject} activeTab={activeTab} onOpenJourney={() => setActiveTab('overview')} onNavigate={setActiveTab} onApproveStage={handleApproveJourneyStage} />
          <Suspense fallback={<div className="py-16 text-center text-xs theme-text-muted">Loading workspace…</div>}><AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'overview' && <FeatureJourney project={activeProject} onNavigate={setActiveTab} onOpenFeatureImport={() => setIsFeatureImportModalOpen(true)} onSaveJourney={saveJourney} onSaveFeatureReview={saveLatestFeatureReview} />}

              {activeTab === 'import' && (
                <RepoImportStudio
                  onImportComplete={handleImportRepoComplete}
                  isDarkMode={isDark}
                />
              )}

              {activeTab === 'workspace' && (
                <WorkspaceControlCenter project={activeProject} onTruthAttached={attachTruth} onOpenJourney={() => setActiveTab('overview')} onOpenFeatureImport={handleStartFeatureFromWorkspace} />
              )}

              {activeTab === 'settings' && <StudioSettings project={activeProject} onSelectVersion={selectVersion} onOpenWorkspace={() => setActiveTab('workspace')} />}

              {activeTab === 'spec' && (
                <SpecEditor
                  spec={activeProject.spec}
                  onSaveSpec={saveSpec}
                  onTriggerAiGenerate={() => setIsAiSpecModalOpen(true)}
                  onOpenFeatureImport={() => setIsFeatureImportModalOpen(true)}
                  featureInbox={activeProject.featureInbox}
                />
              )}

              {activeTab === 'plan' && (
                <PlanEditor
                  plan={activeProject.plan}
                  focusFeature={activeProject.featureInbox?.at(-1)}
                  onSavePlan={savePlan}
                  onTriggerAiGenerate={() => setIsAiSpecModalOpen(true)}
                  isDarkMode={isDark}
                />
              )}

              {activeTab === 'tasks' && (
                <TaskBoard
                  taskBreakdown={activeProject.tasks}
                  spec={activeProject.spec}
                  focusFeature={activeProject.featureInbox?.at(-1)}
                  onSaveTasks={saveTasks}
                  onTriggerAiGenerate={() => setIsAiSpecModalOpen(true)}
                  onSelectTaskForPrompt={handleSelectTaskForPrompt}
                />
              )}

              {activeTab === 'constitution' && (
                <ConstitutionEditor
                  constitution={activeProject.constitution}
                  onSaveConstitution={saveConstitution}
                />
              )}

              {activeTab === 'prompt' && (
                <PromptStudio
                  project={activeProject}
                  initialTaskId={targetPromptTaskId}
                  onRecordFeatureImplementation={(receipt) => {
                    saveLatestFeatureImplementation(receipt);
                    setTargetPromptTaskId(undefined);
                  }}
                />
              )}

              {activeTab === 'audit' && (
                <AuditDashboard
                  project={activeProject}
                  onUpdateAudit={saveAudit}
                  onOpenJourney={() => setActiveTab('overview')}
                />
              )}

              {activeTab === 'export' && (
                <CliExporter
                  project={activeProject}
                />
              )}
            </motion.div>
          </AnimatePresence></Suspense>
        </main>
      </div>

      {/* Global Quick Search Modal */}
      {isQuickSearchOpen && <Suspense fallback={null}><QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        project={activeProject}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsQuickSearchOpen(false);
        }}
      /></Suspense>}

      {/* AI Spec Generation Modal */}
      {isAiSpecModalOpen && <Suspense fallback={null}><AiSpecModal
        isOpen={isAiSpecModalOpen}
        onClose={() => setIsAiSpecModalOpen(false)}
        project={activeProject}
        onApplySpecData={handleApplyAiSpecData}
      /></Suspense>}

      {/* Feature Import & User Stories Generator Modal */}
      {isFeatureImportModalOpen && <Suspense fallback={null}><FeatureImportModal
        isOpen={isFeatureImportModalOpen}
        onClose={() => setIsFeatureImportModalOpen(false)}
        onImportComplete={(newProject) => {
          replaceFromImport(newProject);
          setActiveTab('overview');
        }}
        activeProject={activeProject}
        onMergeIntoActiveProject={handleMergeIntoActiveProject}
        onOpenWorkspace={() => { setIsFeatureImportModalOpen(false); setActiveTab('workspace'); }}
      /></Suspense>}

      {/* GitHub & Jira Integration Sync Modal */}
      {isIntegrationsModalOpen && <Suspense fallback={null}><IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        specData={activeProject.spec}
        planData={activeProject.plan}
        tasksData={activeProject.tasks}
        rulesData={activeProject.constitution}
      /></Suspense>}

      {isNewProjectModalOpen && <Suspense fallback={null}><NewProjectModal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} onCreate={handleCreateNewProject} /></Suspense>}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
