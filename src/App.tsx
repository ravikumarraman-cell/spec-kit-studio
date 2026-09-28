import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DeliveryScope, ViewTab, FeatureSpec, ImplementationPlan, TaskBreakdown } from './types/speckit';
import { ImportedFeatureData, useProjectWorkspace } from './hooks/useProjectWorkspace';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { JourneyHandoff } from './components/journey/JourneyHandoff';
import { WorkflowAwarenessBanner } from './components/workflow/WorkflowAwarenessBanner';
import { approveJourneyStage, createFeatureJourney, getJourneyStage, reopenJourneyStage } from './lib/featureJourney';
import { WorkspaceView } from './app/WorkspaceView';
import { StudioGuide } from './components/common/StudioGuide';
import { OUTCOME_REFINERY_REQUEST_EVENT } from './lib/studioGuide';

// Global dialogs are reached only through explicit user intent. Keeping them
// out of the app shell avoids paying their code cost during initial navigation.
const QuickSearchModal = lazy(() => import('./components/common/QuickSearchModal').then((module) => ({ default: module.QuickSearchModal })));
const AiSpecModal = lazy(() => import('./components/common/AiSpecModal').then((module) => ({ default: module.AiSpecModal })));
const FeatureImportModal = lazy(() => import('./components/import/FeatureImportModal').then((module) => ({ default: module.FeatureImportModal })));
const IntegrationsModal = lazy(() => import('./components/integrations/IntegrationsModal').then((module) => ({ default: module.IntegrationsModal })));
const NewProjectModal = lazy(() => import('./components/project/NewProjectModal').then((module) => ({ default: module.NewProjectModal })));
const DEFAULT_LANDING_TAB: ViewTab = 'overview';

function AppContent() {
  const { isDark } = useTheme();
  const workspace = useProjectWorkspace();
  const {
    projects, activeProject, selectProject, createProject, deleteProject, resetProjects,
    saveJourney, applyAiSpecData, replaceFromImport, mergeImportedFeature, selectVersion,
  } = workspace;
  const [activeTab, setActiveTab] = useState<ViewTab>(DEFAULT_LANDING_TAB);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Modals State
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isAiSpecModalOpen, setIsAiSpecModalOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isFeatureImportModalOpen, setIsFeatureImportModalOpen] = useState<boolean>(false);
  const [deliveryIntake, setDeliveryIntake] = useState<{ scope: DeliveryScope; storyId?: string }>({ scope: 'feature' });
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const openRefinery = () => setActiveTab('refinery');
    window.addEventListener(OUTCOME_REFINERY_REQUEST_EVENT, openRefinery);
    return () => window.removeEventListener(OUTCOME_REFINERY_REQUEST_EVENT, openRefinery);
  }, []);

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
    setActiveTab(DEFAULT_LANDING_TAB);
  };

  const handleResetSampleData = () => { resetProjects(); setActiveTab(DEFAULT_LANDING_TAB); };
  const handleApplyAiSpecData = (spec: FeatureSpec, plan?: ImplementationPlan, tasks?: TaskBreakdown) => { applyAiSpecData(spec, plan, tasks); setIsAiSpecModalOpen(false); };

  const handleSelectTaskForPrompt = (taskId: string) => {
    setTargetPromptTaskId(taskId);
    setActiveTab('prompt');
  };
  const handleStartFeatureFromWorkspace = () => {
    const journey = activeProject.journey || createFeatureJourney();
    if (!journey.completedStages.includes(1)) {
      saveJourney(approveJourneyStage(journey, 1));
    }
    setDeliveryIntake({ scope: 'feature' });
    setIsFeatureImportModalOpen(true);
  };
  const openDeliveryIntake = (scope: DeliveryScope, storyId?: string) => {
    setDeliveryIntake({ scope, storyId });
    setIsFeatureImportModalOpen(true);
  };
  const handleMergeIntoActiveProject = (stories: Parameters<typeof mergeImportedFeature>[0], data: ImportedFeatureData) => {
    const saved = mergeImportedFeature(stories, data);
    if (saved) setActiveTab(DEFAULT_LANDING_TAB);
    return saved;
  };
  const handleApproveJourneyStage = (stageId: number) => {
    const journey = activeProject.journey || createFeatureJourney();
    const stage = getJourneyStage(stageId);
    if (journey.activeStage !== stageId || !stage.ready(activeProject)) {
      setActiveTab(DEFAULT_LANDING_TAB);
      return;
    }
    saveJourney(approveJourneyStage(journey, stageId));
    setActiveTab(DEFAULT_LANDING_TAB);
  };
  const handleReopenJourneyStage = (stageId: number) => {
    const journey = activeProject.journey || createFeatureJourney();
    if (!journey.completedStages.includes(stageId)) return;
    saveJourney(reopenJourneyStage(journey, stageId));
    setActiveTab('journey');
  };

  return (
    <div className="h-dvh min-h-screen w-full max-w-[100vw] overflow-hidden theme-canvas font-sans antialiased flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Clean Single-Row Top Navigation Bar */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSelectProject={(projectId) => { selectProject(projectId); setActiveTab(DEFAULT_LANDING_TAB); }}
        onCreateProject={() => setIsNewProjectModalOpen(true)}
        onDeleteProject={deleteProject}
        // Repository setup has one guided path. The dedicated import studio is
        // retained as an explicitly enabled advanced migration tool.
        onOpenImportStudio={() => setActiveTab('workspace')}
        onOpenFeatureImport={() => openDeliveryIntake('feature')}
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
      <div className="flex-1 min-h-0 flex flex-col md:flex-row min-w-0 overflow-hidden">
        {/* Left Workflow Menu Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          project={activeProject}
          isCollapsed={!isSidebarOpen}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-h-0 min-w-0 overscroll-contain p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {(!activeProject.workflowFocus || activeProject.workflowFocus === 'feature') && <JourneyHandoff project={activeProject} activeTab={activeTab} onOpenJourney={() => setActiveTab('journey')} onNavigate={setActiveTab} onApproveStage={handleApproveJourneyStage} onReopenStage={handleReopenJourneyStage} />}
          <WorkflowAwarenessBanner project={activeProject} activeTab={activeTab} onOpenWorkflow={() => setActiveTab('workflows')} />
          <WorkspaceView
            activeTab={activeTab}
            isDarkMode={isDark}
            project={activeProject}
            targetPromptTaskId={targetPromptTaskId}
            workspace={workspace}
            onNavigate={setActiveTab}
            onOpenAiSpec={() => setIsAiSpecModalOpen(true)}
            onOpenFeatureImport={() => openDeliveryIntake('feature')}
            onStartStoryDelivery={(storyId) => openDeliveryIntake('user-story', storyId)}
            onStartFeatureFromWorkspace={handleStartFeatureFromWorkspace}
            onSelectPromptTask={handleSelectTaskForPrompt}
            onPromptTaskHandled={() => setTargetPromptTaskId(undefined)}
            onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
          />
        </main>
      </div>
      <StudioGuide project={activeProject} activeTab={activeTab} />

      {/* Global Quick Search Modal */}
      {isQuickSearchOpen && <Suspense fallback={null}><QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        project={activeProject}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsQuickSearchOpen(false);
        }}
        onStartStoryDelivery={(storyId) => { setIsQuickSearchOpen(false); openDeliveryIntake('user-story', storyId); }}
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
        initialScope={deliveryIntake.scope}
        initialStoryId={deliveryIntake.storyId}
        onMergeIntoActiveProject={handleMergeIntoActiveProject}
        onStartStoryDelivery={(story, requirements, source, parentFeatureId, referenceImages) => {
          const started = workspace.startStoryDelivery(story, requirements, source, parentFeatureId, referenceImages);
          if (started) setActiveTab('overview');
          return Boolean(started);
        }}
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
