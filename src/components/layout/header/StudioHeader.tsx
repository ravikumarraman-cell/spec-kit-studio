import React, { useState, useMemo, memo } from 'react';
import {
  LayoutDashboard,
  FileText,
  Workflow,
  CheckSquare,
  ShieldCheck,
  Bot,
  Activity,
  FolderGit2,
  Terminal
} from 'lucide-react';
import { SpecKitProject, ViewTab } from '../../../types/speckit';
import { generateSpecKitZip, downloadBlob } from '../../../lib/export';
import { TopUtilityBar } from './TopUtilityBar';
import { MobileNavDrawer } from './MobileNavDrawer';
import { HeaderMenuItem } from './types';

export interface StudioHeaderProps {
  projects: SpecKitProject[];
  activeProject: SpecKitProject;
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onOpenImportStudio?: () => void;
  onOpenFeatureImport?: () => void;
  onOpenIntegrations?: () => void;
  onOpenQuickSearch: () => void;
  onOpenAiSpecModal?: () => void;
  onResetSampleData: () => void;
  onSelectVersion: (version: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const StudioHeader: React.FC<StudioHeaderProps> = memo(({
  projects,
  activeProject,
  activeTab,
  onSelectTab,
  onSelectProject,
  onCreateProject,
  onOpenImportStudio,
  onOpenFeatureImport,
  onOpenIntegrations,
  onOpenQuickSearch,
  onOpenAiSpecModal,
  onResetSampleData,
  onSelectVersion,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      const blob = await generateSpecKitZip(activeProject);
      const filename = `${activeProject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-spec-kit.zip`;
      downloadBlob(blob, filename);
    } catch (err) {
      console.error('Failed to export zip:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const menuItems = useMemo<HeaderMenuItem[]>(() => {
    const totalTasks = activeProject.tasks?.tasks?.length || 0;
    const completedTasks = activeProject.tasks?.tasks?.filter((t) => t.status === 'done').length || 0;
    const unmappedTasks = activeProject.tasks?.tasks?.filter((t) => !t.mappedRequirementId).length || 0;
    const totalReqs = activeProject.spec?.functionalRequirements?.length || 0;
    const totalTech = activeProject.plan?.techStack?.length || 0;
    const totalRules = activeProject.constitution?.rules?.length || 0;
    const auditScore = activeProject.audit?.overallScore || 94;

    return [
      {
        id: 'overview',
        label: 'Workspace Hub',
        shortLabel: 'Hub',
        description: 'Global specification overview, metrics, and traceability matrix',
        category: 'Core Specification',
        icon: LayoutDashboard,
        iconColor: 'text-indigo-400',
        activeColor: 'from-indigo-500/20 to-cyan-500/20 text-indigo-300 border-indigo-500/40',
        badge: 'Hub',
        badgeVariant: 'indigo',
        shortcutKey: '⌥1',
        shortcutDigit: 1,
      },
      {
        id: 'spec',
        label: 'Feature Spec',
        shortLabel: 'Spec',
        description: 'User stories, acceptance criteria, and functional requirements (spec.md)',
        category: 'Core Specification',
        icon: FileText,
        iconColor: 'text-cyan-400',
        activeColor: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/40',
        badge: `${totalReqs} FRs`,
        badgeVariant: 'cyan',
        shortcutKey: '⌥2',
        shortcutDigit: 2,
      },
      {
        id: 'plan',
        label: 'Architecture Plan',
        shortLabel: 'Plan',
        description: 'Technology stack, Mermaid diagrams, API contracts & ADRs (plan.md)',
        category: 'Core Specification',
        icon: Workflow,
        iconColor: 'text-indigo-400',
        activeColor: 'from-indigo-500/20 to-purple-500/20 text-indigo-300 border-indigo-500/40',
        badge: `${totalTech} Tech`,
        badgeVariant: 'indigo',
        shortcutKey: '⌥3',
        shortcutDigit: 3,
      },
      {
        id: 'tasks',
        label: 'Phased Task Board',
        shortLabel: 'Tasks',
        description: 'Executable task breakdown mapped to requirements (tasks.md)',
        category: 'Execution & Tasks',
        icon: CheckSquare,
        iconColor: 'text-emerald-400',
        activeColor: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40',
        badge: unmappedTasks > 0 ? `${unmappedTasks} unmapped` : `${completedTasks}/${totalTasks}`,
        badgeVariant: unmappedTasks > 0 ? 'amber' : 'emerald',
        shortcutKey: '⌥4',
        shortcutDigit: 4,
      },
      {
        id: 'constitution',
        label: 'Constitution Rules',
        shortLabel: 'Constitution',
        description: 'Non-negotiable security, architecture, and coding rules (constitution.md)',
        category: 'Governance & AI',
        icon: ShieldCheck,
        iconColor: 'text-emerald-400',
        activeColor: 'from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-500/40',
        badge: `${totalRules} Rules`,
        badgeVariant: 'emerald',
        shortcutKey: '⌥5',
        shortcutDigit: 5,
      },
      {
        id: 'prompt',
        label: 'AI Agent Prompts',
        shortLabel: 'AI Prompts',
        description: 'Compiled multi-file context prompts for Claude, Gemini, Copilot & Cursor',
        category: 'Governance & AI',
        icon: Bot,
        iconColor: 'text-purple-400',
        activeColor: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/40',
        badge: 'AI Studio',
        badgeVariant: 'purple',
        shortcutKey: '⌥6',
        shortcutDigit: 6,
      },
      {
        id: 'audit',
        label: 'Spec Quality Audit',
        shortLabel: 'Audit',
        description: 'Automated completeness, testability, and clarity verification score',
        category: 'Governance & AI',
        icon: Activity,
        iconColor: 'text-rose-400',
        activeColor: 'from-rose-500/20 to-orange-500/20 text-rose-300 border-rose-500/40',
        badge: `${auditScore}% Score`,
        badgeVariant: auditScore >= 90 ? 'emerald' : 'amber',
        shortcutKey: '⌥7',
        shortcutDigit: 7,
      },
      {
        id: 'import',
        label: 'Repo Import Studio',
        shortLabel: 'Import Repo',
        description: 'Analyze existing GitHub repository and synthesize spec-kit architecture',
        category: 'Governance & AI',
        icon: FolderGit2,
        iconColor: 'text-cyan-400',
        activeColor: 'from-cyan-500/20 to-indigo-500/20 text-cyan-300 border-cyan-500/40',
        badge: 'Repo Studio',
        badgeVariant: 'cyan',
        shortcutKey: '⌥8',
        shortcutDigit: 8,
      },
      {
        id: 'export',
        label: 'CLI & Repo Exporter',
        shortLabel: 'CLI Exporter',
        description: 'Download specify.sh CLI helper scripts and full repo ZIP hierarchy',
        category: 'Execution & Tasks',
        icon: Terminal,
        iconColor: 'text-emerald-400',
        activeColor: 'from-emerald-500/20 to-cyan-500/20 text-emerald-300 border-emerald-500/40',
        badge: 'specify.sh',
        badgeVariant: 'emerald',
        shortcutKey: '⌥9',
        shortcutDigit: 9,
      },
    ];
  }, [activeProject]);

  return (
    <header className="sticky top-0 z-50 w-full max-w-full overflow-visible shadow-lg shadow-black/20">
      {/* Clean Single-Row Top Navigation Bar (No horizontal menu strip or horizontal scrollbars) */}
      <TopUtilityBar
        projects={projects}
        activeProject={activeProject}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onSelectProject={onSelectProject}
        onCreateProject={onCreateProject}
        onOpenImportStudio={onOpenImportStudio}
        onOpenFeatureImport={onOpenFeatureImport}
        onOpenIntegrations={onOpenIntegrations}
        onOpenQuickSearch={onOpenQuickSearch}
        onOpenAiSpecModal={onOpenAiSpecModal}
        onExportZip={handleExportZip}
        isExporting={isExporting}
        onResetSampleData={onResetSampleData}
        onSelectVersion={onSelectVersion}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onToggleSidebar={onToggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Mobile Navigation Drawer for small screens */}
      <MobileNavDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        projects={projects}
        activeProject={activeProject}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onSelectProject={onSelectProject}
        onCreateProject={onCreateProject}
        onOpenQuickSearch={onOpenQuickSearch}
        onOpenAiSpecModal={onOpenAiSpecModal}
        onOpenIntegrations={onOpenIntegrations}
        onExportZip={handleExportZip}
        isExporting={isExporting}
        onResetSampleData={onResetSampleData}
        onSelectVersion={onSelectVersion}
        menuItems={menuItems}
      />
    </header>
  );
});

StudioHeader.displayName = 'StudioHeader';
