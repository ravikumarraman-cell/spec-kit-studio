import React, { useState, useRef, useCallback, memo } from 'react';
import {
  FolderKanban,
  Search,
  Plus,
  Sparkles,
  Github,
  Download,
  CheckCircle2,
  ChevronDown,
  Layers,
  RotateCcw,
  Menu,
  ChevronRight,
  FolderGit2,
  PanelLeft,
  PanelLeftClose,
  MoreHorizontal,
  Workflow,
  Radio,
  Palette,
  Check,
  Moon,
  Sun,
  Feather,
  Laptop,
  Settings
  , Trash2
} from 'lucide-react';
import { SpecKitProject, ViewTab } from '../../../types/speckit';
import { useTheme, THEME_PRESETS, ThemeId } from '../../../context/ThemeContext';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { SPECKIT_VERSION } from '../../../lib/specKitCompliance';

interface TopUtilityBarProps {
  projects: SpecKitProject[];
  activeProject: SpecKitProject;
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => boolean;
  onOpenImportStudio?: () => void;
  onOpenFeatureImport?: () => void;
  onOpenIntegrations?: () => void;
  onOpenQuickSearch: () => void;
  onOpenAiSpecModal?: () => void;
  onExportZip: () => void;
  isExporting: boolean;
  onResetSampleData: () => void;
  onSelectVersion: (version: string) => void;
  onOpenMobileDrawer: () => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const TAB_TITLES: Record<ViewTab, string> = {
  overview: 'Workspace Hub',
  workflows: 'Workflows',
  workspace: 'Connected Workspace',
  spec: 'Feature Spec',
  plan: 'Architecture Plan',
  tasks: 'Task Breakdown',
  constitution: 'Constitution Rules',
  prompt: 'AI Agent Prompts',
  audit: 'Spec Quality Audit',
  import: 'Repo Import Studio',
  export: 'CLI Exporter',
  settings: 'Studio Settings',
};

export const TopUtilityBar: React.FC<TopUtilityBarProps> = memo(({
  projects,
  activeProject,
  activeTab,
  onSelectTab,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onOpenImportStudio,
  onOpenFeatureImport,
  onOpenIntegrations,
  onOpenQuickSearch,
  onOpenAiSpecModal,
  onExportZip,
  isExporting,
  onResetSampleData,
  onSelectVersion,
  onOpenMobileDrawer,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState('');
  
  const { theme, setTheme, currentThemeMeta } = useTheme();

  const workspaceDropdownRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const closeMenus = useCallback(() => { setIsWorkspaceDropdownOpen(false); setIsMoreMenuOpen(false); }, []);
  useClickOutside([workspaceDropdownRef, moreMenuRef], closeMenus);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(workspaceSearchQuery.toLowerCase())
  );

  return (
    <div className="h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md px-3 sm:px-4 md:px-5 flex items-center justify-between gap-2 select-none w-full max-w-full overflow-visible relative z-50">
      {/* 1. LEFT ZONE: Brand & Workspace Switcher */}
      <div className="flex items-center gap-2 shrink min-w-0">
        {/* Brand Icon & Title */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs transition-colors border ${
                isSidebarOpen
                  ? 'bg-zinc-800 text-cyan-300 border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-zinc-800/80'
              }`}
              title={isSidebarOpen ? 'Collapse left menu' : 'Expand left menu'}
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-3.5 h-3.5" />
              ) : (
                <PanelLeft className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-emerald-500 p-0.5 shadow-md shadow-indigo-500/10 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-zinc-950 rounded-[9px] flex items-center justify-center">
              <FolderKanban className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <span className="font-extrabold text-xs sm:text-sm tracking-tight text-zinc-100 hidden sm:inline truncate">
            Spec-Kit Studio
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-zinc-800 mx-0.5 hidden sm:block shrink-0" />

        {/* Workspace Switcher Popover */}
        <div className="relative hidden sm:block shrink min-w-0 z-[100]" ref={workspaceDropdownRef}>
          <button
            type="button"
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-100/90 dark:bg-zinc-900/90 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-300/80 dark:border-zinc-700/60 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-all max-w-[130px] sm:max-w-[170px] md:max-w-[210px] truncate shadow-xs"
            title="Switch Active Workspace"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="truncate font-medium">{activeProject.name}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0 ml-auto" />
          </button>

          {isWorkspaceDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-2 z-[9999] text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
                  Workspaces ({projects.length})
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Synced
                </span>
              </div>

              {/* Instant Workspace Search Filter */}
              <div className="p-1.5">
                <input
                  type="text"
                  value={workspaceSearchQuery}
                  onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                  placeholder="Find workspace..."
                  className="w-full px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="max-h-56 overflow-y-auto py-1 space-y-1">
                {filteredProjects.map((proj) => {
                  const isActive = proj.id === activeProject.id;
                  return (
                    <div key={proj.id} className={`group flex items-center rounded-xl transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-200 font-bold border border-indigo-500/30'
                        : 'hover:bg-zinc-800/60 text-zinc-300'
                    }`}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(proj.id);
                          setIsWorkspaceDropdownOpen(false);
                        }}
                        className="min-w-0 flex-1 px-3 py-2 text-left"
                      >
                        <div className="truncate pr-2">
                          <div className="truncate text-xs font-semibold">{proj.name}</div>
                          <div className="text-[10px] text-zinc-500 truncate">
                            v{proj.version || SPECKIT_VERSION} • {proj.spec.userStories?.length || 0} Stories
                          </div>
                        </div>
                      </button>
                      <div className="flex shrink-0 items-center gap-1 pr-2">
                        {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                        {projects.length > 1 && <button
                          type="button"
                          aria-label={`Delete workspace ${proj.name}`}
                          title={`Delete ${proj.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!window.confirm(`Delete workspace “${proj.name}”? A recoverable local snapshot will be retained. Its repository files will not be deleted.`)) return;
                            onDeleteProject(proj.id);
                            setIsWorkspaceDropdownOpen(false);
                          }}
                          className="rounded-md p-1 text-zinc-500 hover:bg-rose-500/15 hover:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/60"
                        ><Trash2 className="h-3.5 w-3.5" /></button>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-zinc-800 pt-2 space-y-1.5 mt-1">
                {onOpenFeatureImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFeatureImport();
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-2 transition-all text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Import Feature & Stories</span>
                  </button>
                )}
                {onOpenImportStudio && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenImportStudio();
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-2 transition-all text-xs"
                  >
                    <FolderGit2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Import Existing Repo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onCreateProject();
                    setIsWorkspaceDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 transition-all text-xs shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Blank Workspace</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetSampleData();
                    setIsWorkspaceDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-all text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Template</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Current Active Tab Label */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-500 shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600" />
          <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold truncate max-w-[120px]">
            {TAB_TITLES[activeTab] || activeTab}
          </span>
        </div>
      </div>

      {/* 2. CENTER ZONE: Omnibox Global Search */}
      <div className="flex-1 max-w-xs sm:max-w-sm mx-1 sm:mx-2 min-w-[120px]">
        <button
          type="button"
          onClick={onOpenQuickSearch}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200/80 dark:hover:bg-zinc-800/90 border border-zinc-300 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-300 transition-all group shadow-xs"
          title="Search specs, tasks, architecture, or ⌘K"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Search className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 group-hover:text-sky-600 dark:group-hover:text-cyan-400 transition-colors shrink-0" />
            <span className="truncate font-medium text-zinc-600 dark:text-zinc-300 text-[11px] sm:text-xs">
              Search or ⌘K...
            </span>
          </div>
          <kbd className="hidden sm:inline px-1 py-0.5 rounded text-[9px] bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border border-zinc-300 dark:border-zinc-800 font-mono font-bold shrink-0 ml-1">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* 3. RIGHT ZONE: Exactly 3 Priority Actions + 'More' Dropdown */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Priority Action 1: AI Spec Gen - High Contrast in both Light & Dark modes */}
        {onOpenAiSpecModal && (
          <button
            type="button"
            onClick={onOpenAiSpecModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 dark:bg-purple-600/90 dark:hover:bg-purple-600 text-white border border-purple-700/50 text-xs font-bold transition-all shadow-xs shrink-0"
            title="Generate spec requirements & user stories with AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-200 shrink-0" />
            <span className="hidden sm:inline">AI Spec Gen</span>
          </button>
        )}

        {/* Priority Action 2: Export .spec-kit - High Contrast in both Light & Dark modes */}
        <button
          type="button"
          onClick={onExportZip}
          disabled={isExporting}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 text-xs font-semibold transition-all disabled:opacity-50 shadow-xs shrink-0"
          title="Export complete Spec-Kit zip"
        >
          <Download className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400 shrink-0" />
          <span className="hidden md:inline">
            {isExporting ? 'Packaging...' : 'Export'}
          </span>
        </button>

        {/* Direct Theme Switcher Button */}
        <button
          type="button"
          onClick={() => {
            if (theme === 'system') setTheme('github-light');
            else if (theme === 'github-light') setTheme('github-dark');
            else if (theme === 'github-dark') setTheme('warm-paper');
            else setTheme('system');
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 text-xs font-semibold transition-all shadow-xs shrink-0"
          title={`Current Theme: ${currentThemeMeta.name} (${theme === 'system' ? 'OS Mode' : currentThemeMeta.mode}). Click to cycle.`}
        >
          {theme === 'system' ? (
            <Laptop className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
          ) : theme === 'github-dark' ? (
            <Moon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          ) : theme === 'github-light' ? (
            <Sun className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          ) : (
            <Feather className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          )}
          <span className="hidden lg:inline text-[11px] font-bold">
            {theme === 'system' ? 'System' : theme === 'github-dark' ? 'Dark' : theme === 'github-light' ? 'Light' : 'Warm'}
          </span>
        </button>

        {/* Priority Action 3: "More" Dropdown (Containing Theme Switcher, GitHub/Jira Sync, Exporter, Version, Reset) */}
        <div className="relative shrink-0 z-[100]" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
              isMoreMenuOpen
                ? 'bg-sky-50 dark:bg-zinc-800 text-sky-900 dark:text-cyan-300 border-sky-400 dark:border-zinc-700 ring-2 ring-sky-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border-slate-300 dark:border-zinc-700'
            }`}
            title="More actions, theme switcher, and settings"
          >
            <MoreHorizontal className="w-4 h-4 text-slate-700 dark:text-zinc-300 shrink-0" />
            <span className="hidden sm:inline">More</span>
            <ChevronDown className="w-3 h-3 text-slate-600 dark:text-zinc-400 shrink-0 ml-0.5" />
          </button>

          {isMoreMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-76 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] p-3 z-[9999] text-xs animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
              {/* Theme Switcher Header Section */}
              <div>
                <div className="px-1 py-1 text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Theme & Appearance</span>
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5 p-1 bg-slate-100 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = theme === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setTheme(preset.id)}
                        className={`flex items-center gap-2 py-2 px-2.5 rounded-lg text-[11px] font-semibold transition-all ${
                          isSelected
                            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-zinc-700 font-bold'
                            : 'text-slate-700 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-200 hover:bg-slate-200/50 dark:hover:bg-zinc-900'
                        }`}
                        title={preset.description}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: preset.bgHex }}
                        />
                        <span className="truncate text-left text-[11px] font-bold">{preset.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-1">
                <div className="px-2.5 py-1 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Quick Tools
                </div>

                <button
                  type="button"
                  onClick={() => { onSelectTab('settings'); setIsMoreMenuOpen(false); }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                >
                  <Settings className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <div><div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Studio Settings</div><div className="text-[10px] text-zinc-500">Engine, version, appearance, connector</div></div>
                </button>

                {/* GitHub & Jira Sync */}
                {onOpenIntegrations && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenIntegrations();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                  >
                    <Github className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">GitHub & Jira Sync</div>
                      <div className="text-[10px] text-zinc-500">Cloud issue tracking</div>
                    </div>
                  </button>
                )}

                {/* Mobile Export Option */}
                <button
                  type="button"
                  onClick={() => {
                    onExportZip();
                    setIsMoreMenuOpen(false);
                  }}
                  disabled={isExporting}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors sm:hidden"
                >
                  <Download className="w-4 h-4 text-sky-600 dark:text-cyan-400 shrink-0" />
                  <div>
                    <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Export .spec-kit</div>
                    <div className="text-[10px] text-zinc-500">Download zip bundle</div>
                  </div>
                </button>

                {/* Feature Import Option */}
                {onOpenFeatureImport && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenFeatureImport();
                      setIsMoreMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">Import Feature Spec</div>
                      <div className="text-[10px] text-zinc-500">From Markdown or Jira</div>
                    </div>
                  </button>
                )}

                {/* Reset Sample Demo Data */}
                <button
                  type="button"
                  onClick={() => {
                    onResetSampleData();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2.5 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-zinc-500 shrink-0" />
                  <div>
                    <div className="font-medium text-xs">Reset Sample Data</div>
                    <div className="text-[10px] text-zinc-500">Restore starter template</div>
                  </div>
                </button>
              </div>

              {/* Engine Status */}
              <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-2 px-2.5 pb-1 flex items-center justify-between text-[10px] text-zinc-500">
                <span>Spec-Kit Engine</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-mono font-semibold">v{activeProject.version || SPECKIT_VERSION}</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Navigation Drawer Trigger (< md screens) */}
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 md:hidden transition-colors shrink-0"
          title="Open Menu"
          aria-label="Open Menu"
        >
          <Menu className="w-4 h-4 text-zinc-300" />
        </button>
      </div>
    </div>
  );
});

TopUtilityBar.displayName = 'TopUtilityBar';
