import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { SpecEditor } from './components/spec/SpecEditor';
import { PlanEditor } from './components/plan/PlanEditor';
import { TaskBoard } from './components/tasks/TaskBoard';
import { ConstitutionEditor } from './components/constitution/ConstitutionEditor';
import { PromptStudio } from './components/prompt/PromptStudio';
import { AuditDashboard } from './components/audit/AuditDashboard';
import { CliExporter } from './components/exporter/CliExporter';
import { RepoImportStudio } from './components/import/RepoImportStudio';
import { FeatureImportModal } from './components/import/FeatureImportModal';
import { IntegrationsModal } from './components/integrations/IntegrationsModal';
import { QuickSearchModal } from './components/common/QuickSearchModal';
import { AiSpecModal } from './components/common/AiSpecModal';
import { storageService } from './lib/storage';
import { SpecKitProject, ViewTab, FeatureSpec, ImplementationPlan, TaskBreakdown, ProjectConstitution, SpecAuditResult } from './types/speckit';
import { Plus, X } from 'lucide-react';
import { ThemeProvider, useTheme } from './context/ThemeContext';

function AppContent() {
  const { isDark, theme } = useTheme();
  const [projects, setProjects] = useState<SpecKitProject[]>([]);
  const [activeProject, setActiveProject] = useState<SpecKitProject | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Modals State
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isAiSpecModalOpen, setIsAiSpecModalOpen] = useState<boolean>(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState<boolean>(false);
  const [isFeatureImportModalOpen, setIsFeatureImportModalOpen] = useState<boolean>(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);

  // New Project Form
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');

  // Selected Task for Prompt Studio
  const [targetPromptTaskId, setTargetPromptTaskId] = useState<string | undefined>(undefined);

  // Load projects from Storage Service on mount
  useEffect(() => {
    const loadedProjects = storageService.getProjects();
    setProjects(loadedProjects);
    const active = storageService.getActiveProject();
    setActiveProject(active);

    const unsubscribe = storageService.subscribe(() => {
      setProjects(storageService.getProjects());
      setActiveProject(storageService.getActiveProject());
    });

    return () => unsubscribe();
  }, []);

  if (!activeProject) {
    return (
      <div className="min-h-screen theme-canvas flex items-center justify-center">
        <div className="text-xs theme-text-muted font-mono animate-pulse">Initializing Spec-Kit Studio...</div>
      </div>
    );
  }

  const handleSelectProject = (id: string) => {
    storageService.setActiveProjectId(id);
    const updated = storageService.getActiveProject();
    if (updated) setActiveProject(updated);
  };

  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    const created = storageService.createNewProject(newProjName.trim(), newProjDesc.trim());
    setProjects(storageService.getProjects());
    setActiveProject(created);
    setIsNewProjectModalOpen(false);
    setNewProjName('');
    setNewProjDesc('');
    setActiveTab('overview');
  };

  const handleResetSampleData = () => {
    storageService.resetToSampleProjects();
    const loadedProjects = storageService.getProjects();
    setProjects(loadedProjects);
    setActiveProject(loadedProjects[0]);
    setActiveTab('overview');
  };

  const handleSaveSpec = (updatedSpec: FeatureSpec) => {
    if (!activeProject) return;
    const updated = { ...activeProject, spec: updatedSpec, updatedAt: new Date().toISOString() };
    storageService.updateActiveProject(updated);
  };

  const handleSavePlan = (updatedPlan: ImplementationPlan) => {
    if (!activeProject) return;
    const updated = { ...activeProject, plan: updatedPlan, updatedAt: new Date().toISOString() };
    storageService.updateActiveProject(updated);
  };

  const handleSaveTasks = (updatedTasks: TaskBreakdown) => {
    if (!activeProject) return;
    const updated = { ...activeProject, tasks: updatedTasks, updatedAt: new Date().toISOString() };
    storageService.updateActiveProject(updated);
  };

  const handleSaveConstitution = (updatedConstitution: ProjectConstitution) => {
    if (!activeProject) return;
    const updated = { ...activeProject, constitution: updatedConstitution, updatedAt: new Date().toISOString() };
    storageService.updateActiveProject(updated);
  };

  const handleUpdateAudit = (updatedAudit: SpecAuditResult) => {
    if (!activeProject) return;
    const updated = { ...activeProject, audit: updatedAudit, updatedAt: new Date().toISOString() };
    storageService.updateActiveProject(updated);
  };

  const handleApplyAiSpecData = (generatedSpec: FeatureSpec, generatedPlanData?: any, generatedTasksData?: any) => {
    if (!activeProject) return;
    const updated: SpecKitProject = {
      ...activeProject,
      spec: generatedSpec,
      plan: generatedPlanData || activeProject.plan,
      tasks: generatedTasksData || activeProject.tasks,
      updatedAt: new Date().toISOString(),
    };
    storageService.updateActiveProject(updated);
    setIsAiSpecModalOpen(false);
  };

  const handleSelectTaskForPrompt = (taskId: string) => {
    setTargetPromptTaskId(taskId);
    setActiveTab('prompt');
  };

  const handleImportRepoComplete = (newProject: SpecKitProject) => {
    storageService.updateActiveProject(newProject);
    setProjects(storageService.getProjects());
    setActiveProject(newProject);
    setActiveTab('overview');
  };

  const handleMergeIntoActiveProject = (importedStories: any[], importedData: any) => {
    if (!activeProject) return;

    const currentStories = activeProject.spec.userStories || [];
    const mergedStories = [...currentStories, ...importedStories];

    const currentFrs = activeProject.spec.functionalRequirements || [];
    const importedFrs = importedData.functionalRequirements || [];
    const mergedFrs = [...currentFrs, ...importedFrs];

    const updatedSpec = {
      ...activeProject.spec,
      userStories: mergedStories,
      functionalRequirements: mergedFrs,
      lastUpdated: new Date().toISOString(),
    };

    const currentTasks = activeProject.tasks.tasks || [];
    const importedTasks = (importedData.tasks || []).map((t: any, idx: number) => ({
      id: t.id || `TASK-${200 + idx}`,
      title: t.title || `Task ${idx + 1}`,
      phase: t.phase || 'Phase 2: Integration',
      description: t.description || 'Task description',
      status: 'todo',
      estimatedHours: t.estimatedHours || 3,
      mappedRequirementId: t.mappedRequirementId || 'FR-101',
      dependencies: [],
      targetAgentPromptSnippet: t.targetAgentPromptSnippet || `Implement ${t.title}`,
    }));

    const updatedTasks = {
      ...activeProject.tasks,
      tasks: [...currentTasks, ...importedTasks],
      lastUpdated: new Date().toISOString(),
    };

    const updatedProject = {
      ...activeProject,
      spec: updatedSpec,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    };

    storageService.updateActiveProject(updatedProject);
    setActiveProject(updatedProject);
    setProjects(storageService.getProjects());
    setActiveTab('spec');
  };

  const handleSelectVersion = (version: string) => {
    if (!activeProject) return;
    const updated = { ...activeProject, version, updatedAt: new Date().toISOString() };
    storageService.updateActiveProject(updated);
  };

  // Count unmapped tasks
  const unmappedTasks = activeProject.tasks.tasks.filter((t) => !t.mappedRequirementId).length;

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden theme-canvas font-sans antialiased flex flex-col selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Clean Single-Row Top Navigation Bar */}
      <Navbar
        projects={projects}
        activeProject={activeProject}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onSelectProject={handleSelectProject}
        onCreateProject={() => setIsNewProjectModalOpen(true)}
        onOpenImportStudio={() => setActiveTab('import')}
        onOpenFeatureImport={() => setIsFeatureImportModalOpen(true)}
        onOpenIntegrations={() => setIsIntegrationsModalOpen(true)}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onOpenAiSpecModal={() => setIsAiSpecModalOpen(true)}
        isDarkMode={isDark}
        onToggleTheme={() => {}}
        onResetSampleData={handleResetSampleData}
        onSelectVersion={handleSelectVersion}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Studio Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-w-0 overflow-hidden">
        {/* Left Workflow Menu Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          auditScore={activeProject.audit?.overallScore || 94}
          unmappedTaskCount={unmappedTasks}
          isCollapsed={!isSidebarOpen}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'overview' && (
                <OverviewDashboard
                  project={activeProject}
                  onNavigateTab={setActiveTab}
                  onTriggerAiSpecModal={() => setIsAiSpecModalOpen(true)}
                  onSelectVersion={handleSelectVersion}
                  onOpenFeatureImport={() => setIsFeatureImportModalOpen(true)}
                />
              )}

              {activeTab === 'import' && (
                <RepoImportStudio
                  onImportComplete={handleImportRepoComplete}
                  isDarkMode={isDark}
                />
              )}

              {activeTab === 'spec' && (
                <SpecEditor
                  spec={activeProject.spec}
                  onSaveSpec={handleSaveSpec}
                  onTriggerAiGenerate={() => setIsAiSpecModalOpen(true)}
                  onOpenFeatureImport={() => setIsFeatureImportModalOpen(true)}
                />
              )}

              {activeTab === 'plan' && (
                <PlanEditor
                  plan={activeProject.plan}
                  onSavePlan={handleSavePlan}
                  onTriggerAiGenerate={() => setIsAiSpecModalOpen(true)}
                  isDarkMode={isDark}
                />
              )}

              {activeTab === 'tasks' && (
                <TaskBoard
                  taskBreakdown={activeProject.tasks}
                  spec={activeProject.spec}
                  onSaveTasks={handleSaveTasks}
                  onTriggerAiGenerate={() => setIsAiSpecModalOpen(true)}
                  onSelectTaskForPrompt={handleSelectTaskForPrompt}
                />
              )}

              {activeTab === 'constitution' && (
                <ConstitutionEditor
                  constitution={activeProject.constitution}
                  onSaveConstitution={handleSaveConstitution}
                />
              )}

              {activeTab === 'prompt' && (
                <PromptStudio
                  project={activeProject}
                  initialTaskId={targetPromptTaskId}
                />
              )}

              {activeTab === 'audit' && (
                <AuditDashboard
                  project={activeProject}
                  onUpdateAudit={handleUpdateAudit}
                />
              )}

              {activeTab === 'export' && (
                <CliExporter
                  project={activeProject}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Quick Search Modal */}
      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        project={activeProject}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsQuickSearchOpen(false);
        }}
      />

      {/* AI Spec Generation Modal */}
      <AiSpecModal
        isOpen={isAiSpecModalOpen}
        onClose={() => setIsAiSpecModalOpen(false)}
        project={activeProject}
        onApplySpecData={handleApplyAiSpecData}
      />

      {/* Feature Import & User Stories Generator Modal */}
      <FeatureImportModal
        isOpen={isFeatureImportModalOpen}
        onClose={() => setIsFeatureImportModalOpen(false)}
        onImportComplete={(newProject) => {
          storageService.updateActiveProject(newProject);
          setProjects(storageService.getProjects());
          setActiveProject(newProject);
          setActiveTab('spec');
        }}
        activeProject={activeProject}
        onMergeIntoActiveProject={handleMergeIntoActiveProject}
      />

      {/* GitHub & Jira Integration Sync Modal */}
      <IntegrationsModal
        isOpen={isIntegrationsModalOpen}
        onClose={() => setIsIntegrationsModalOpen(false)}
        specData={activeProject.spec}
        planData={activeProject.plan}
        tasksData={activeProject.tasks}
        rulesData={activeProject.constitution}
      />

      {/* Create New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100">Create New Spec Workspace</h3>
              <button onClick={() => setIsNewProjectModalOpen(false)} className="p-1 text-zinc-500 hover:text-zinc-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="space-y-3">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI Code Reviewer Service"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Brief description of the specification scope..."
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
