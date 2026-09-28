import React from 'react';
import { StudioHeader, StudioHeaderProps } from './header/StudioHeader';
import { SpecKitProject, ViewTab } from '../../types/speckit';

export interface NavbarProps {
  projects: SpecKitProject[];
  activeProject: SpecKitProject;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => boolean;
  onOpenImportStudio?: () => void;
  onOpenFeatureImport?: () => void;
  onOpenIntegrations?: () => void;
  onOpenQuickSearch: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onResetSampleData: () => void;
  onSelectVersion: (version: string) => void;
  activeTab?: ViewTab;
  onSelectTab?: (tab: ViewTab) => void;
  onOpenAiSpecModal?: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onOpenImportStudio,
  onOpenFeatureImport,
  onOpenIntegrations,
  onOpenQuickSearch,
  onResetSampleData,
  onSelectVersion,
  activeTab = 'overview',
  onSelectTab = () => {},
  onOpenAiSpecModal,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  return (
    <StudioHeader
      projects={projects}
      activeProject={activeProject}
      activeTab={activeTab}
      onSelectTab={onSelectTab}
      onSelectProject={onSelectProject}
      onCreateProject={onCreateProject}
      onDeleteProject={onDeleteProject}
      onOpenImportStudio={onOpenImportStudio}
      onOpenFeatureImport={onOpenFeatureImport}
      onOpenIntegrations={onOpenIntegrations}
      onOpenQuickSearch={onOpenQuickSearch}
      onOpenAiSpecModal={onOpenAiSpecModal}
      onResetSampleData={onResetSampleData}
      onSelectVersion={onSelectVersion}
      onToggleSidebar={onToggleSidebar}
      isSidebarOpen={isSidebarOpen}
    />
  );
};
