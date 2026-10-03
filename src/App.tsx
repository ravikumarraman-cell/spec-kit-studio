import { lazy, Suspense } from 'react';
import { WorkspaceView } from './app/WorkspaceView';
import { useStudioShell } from './app/useStudioShell';
import { DeploymentBoundaryBanner } from './components/common/DeploymentBoundaryBanner';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { useConnectedWorkspaceAgents } from './hooks/useConnectedWorkspaceAgents';
import { useProjectWorkspace } from './hooks/useProjectWorkspace';

// Dialogs are task-triggered, not shell-critical. Keep their modal graph out
// of first paint while retaining one centralized dialog boundary.
const StudioDialogs = lazy(() => import('./app/StudioDialogs').then((module) => ({ default: module.StudioDialogs })));
const StudioGuide = lazy(() => import('./components/common/StudioGuide').then((module) => ({ default: module.StudioGuide })));
const ConfirmationHost = lazy(() => import('./components/common/ConfirmationHost').then((module) => ({ default: module.ConfirmationHost })));

function AppContent() {
  const { isDark } = useTheme();
  const workspace = useProjectWorkspace();
  const shell = useStudioShell(workspace.activeProject, workspace);
  const { projects, activeProject, selectProject, createProject, deleteProject, selectVersion, selectSddEngine } = workspace;

  // Keep the latest read-only connector scan shared across every screen.
  useConnectedWorkspaceAgents(activeProject?.importedRepo?.repoUrl);

  if (!activeProject) {
    return <div className="min-h-screen theme-canvas flex items-center justify-center"><div className="text-xs theme-text-muted font-mono animate-pulse">Initializing Spec-Kit Studio...</div></div>;
  }

  return (
    <div className="h-dvh min-h-screen w-full max-w-[100vw] overflow-hidden theme-canvas font-sans antialiased flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        projects={projects} activeProject={activeProject} activeTab={shell.activeTab} onSelectTab={shell.setActiveTab}
        onSelectProject={(projectId) => { selectProject(projectId); shell.setActiveTab(shell.defaultLandingTab); }}
        onCreateProject={() => shell.openDialog('newProject')} onDeleteProject={deleteProject}
        onOpenImportStudio={() => shell.setActiveTab('workspace')} onOpenFeatureImport={() => shell.openDeliveryIntake('feature')}
        onOpenIntegrations={() => shell.openDialog('integrations')} onOpenQuickSearch={() => shell.openDialog('quickSearch')}
        onOpenAiSpecModal={() => shell.openDialog('aiSpec')} onSelectVersion={selectVersion}
        isSidebarOpen={shell.isSidebarOpen} onToggleSidebar={() => shell.setIsSidebarOpen(!shell.isSidebarOpen)}
      />
      <DeploymentBoundaryBanner />
      <div className="flex-1 min-h-0 flex flex-col md:flex-row min-w-0 overflow-hidden">
        <Sidebar activeTab={shell.activeTab} onTabChange={shell.setActiveTab} project={activeProject} isCollapsed={!shell.isSidebarOpen} personaRoute={shell.personaRoute} onStartPersona={shell.startPersonaRoute} onStartHandoffJourney={shell.startHandoffJourney} onReopenJourneyStage={shell.reopenJourneyStage} onReturnToPersonaHandoff={shell.returnToPersonaHandoff} />
        <main data-testid="workspace-viewport" className="flex-1 min-h-0 min-w-0 overscroll-contain p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <WorkspaceView
            activeTab={shell.activeTab} isDarkMode={isDark} project={activeProject} targetPromptTaskId={shell.targetPromptTaskId} workspace={workspace}
            onNavigate={shell.setActiveTab} onOpenAiSpec={() => shell.openDialog('aiSpec')} onOpenFeatureImport={() => shell.openDeliveryIntake('feature')}
            onStartStoryDelivery={(storyId) => shell.openDeliveryIntake('user-story', storyId)} onStartFeatureFromWorkspace={shell.startFeatureFromWorkspace}
            onContinueImportedHandoffFromWorkspace={shell.continueImportedHandoffFromWorkspace}
            onSelectPromptTask={(taskId) => { shell.setTargetPromptTaskId(taskId); shell.setActiveTab('prompt'); }} onPromptTaskHandled={() => shell.setTargetPromptTaskId(undefined)}
            onSelectSddEngine={selectSddEngine} personaRoute={shell.personaRoute} onStartPersona={shell.startPersonaRoute}
            onClearPersonaRoute={() => shell.setPersonaRoute(undefined)}
            onImportPersonaFeature={(personaId, scope = 'feature') => { shell.setPersonaRoute(personaId); shell.openDeliveryIntake(scope, undefined, personaId); }}
          />
        </main>
      </div>
      <Suspense fallback={null}><StudioGuide project={activeProject} activeTab={shell.activeTab} /></Suspense>
      <Suspense fallback={null}><ConfirmationHost /></Suspense>
      <Suspense fallback={null}><StudioDialogs
          project={activeProject} workspace={workspace} dialogs={shell.dialogs} deliveryIntake={shell.deliveryIntake}
          closeDialog={shell.closeDialog} onNavigate={shell.setActiveTab}
          onCreateProject={(name, description) => { createProject(name, description); shell.closeDialog('newProject'); shell.setActiveTab(shell.defaultLandingTab); }}
          onApplyAiSpec={shell.applyAiSpec} onOpenDeliveryIntake={shell.openDeliveryIntake} onMergeIntoActiveProject={shell.mergeImportedFeature}
        /></Suspense>
    </div>
  );
}

export default function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}
