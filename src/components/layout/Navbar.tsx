import React, { useState, useRef, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Download,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Layers,
  FolderGit2,
  RotateCcw,
  MoreVertical,
  Cpu,
  X,
  FileCode2,
  Check,
  Github
} from 'lucide-react';
import { SpecKitProject } from '../../types/speckit';
import { generateSpecKitZip, downloadBlob } from '../../lib/export';
import { ThemeSwitcher } from '../common/ThemeSwitcher';
import { SpecKitVersionSelector } from '../common/SpecKitVersionSelector';

interface NavbarProps {
  projects: SpecKitProject[];
  activeProject: SpecKitProject;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onOpenImportStudio?: () => void;
  onOpenFeatureImport?: () => void;
  onOpenIntegrations?: () => void;
  onOpenQuickSearch: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onResetSampleData: () => void;
  onSelectVersion: (version: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onOpenImportStudio,
  onOpenFeatureImport,
  onOpenIntegrations,
  onOpenQuickSearch,
  isDarkMode,
  onToggleTheme,
  onResetSampleData,
  onSelectVersion,
}) => {
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const workspaceDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        workspaceDropdownRef.current &&
        !workspaceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsWorkspaceDropdownOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 px-3 sm:px-5 md:px-6 flex items-center justify-between gap-3 select-none">
      {/* LEFT ZONE: Brand & Workspace Selector */}
      <div className="flex items-center gap-3 shrink-0 min-w-0">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-cyan-500 to-emerald-500 p-0.5 shadow-md shadow-indigo-500/10 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="hidden lg:block">
            <span className="font-extrabold text-sm tracking-tight text-zinc-100 dark:text-zinc-100">
              Spec-Kit Studio
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <span>GitHub SDD Layer</span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-zinc-800 mx-0.5 hidden lg:block" />

        {/* Unified Workspace Selector Dropdown */}
        <div className="relative" ref={workspaceDropdownRef}>
          <button
            onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/60 dark:border-zinc-800 text-xs font-semibold text-zinc-200 transition-all max-w-[210px] sm:max-w-[280px]"
            title="Switch Spec-Kit Workspace"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate font-medium">{activeProject.name}</span>
            <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0 ml-1">
              v{activeProject.version || '1.0.7'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-auto" />
          </button>

          {/* Workspace Switcher Menu */}
          {isWorkspaceDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  Active Workspaces ({projects.length})
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Synced
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                {projects.map((proj) => {
                  const isActive = proj.id === activeProject.id;
                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        onSelectProject(proj.id);
                        setIsWorkspaceDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-indigo-600/20 text-indigo-200 font-bold border border-indigo-500/30'
                          : 'hover:bg-zinc-800/60 text-zinc-300'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate text-xs font-semibold">{proj.name}</div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          v{proj.version || '1.0.7'} • {proj.spec.userStories?.length || 0} Stories
                        </div>
                      </div>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-zinc-800 pt-2 space-y-1.5 mt-1">
                {onOpenFeatureImport && (
                  <button
                    onClick={() => {
                      onOpenFeatureImport();
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-2 transition-all text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Import Feature & User Stories</span>
                  </button>
                )}
                {onOpenImportStudio && (
                  <button
                    onClick={() => {
                      onOpenImportStudio();
                      setIsWorkspaceDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 font-semibold flex items-center gap-2 transition-all text-xs"
                  >
                    <FolderGit2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Import Existing Repo / Project</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onCreateProject();
                    setIsWorkspaceDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 transition-all text-xs shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Blank Workspace</span>
                </button>
                <button
                  onClick={() => {
                    onResetSampleData();
                    setIsWorkspaceDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex items-center gap-2 transition-all text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Template</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sleek Compact Version Switcher */}
        <div className="hidden xl:block">
          <SpecKitVersionSelector
            currentVersion={activeProject.version || '1.0.7'}
            onSelectVersion={onSelectVersion}
            variant="compact"
          />
        </div>
      </div>

      {/* CENTER ZONE: Search Bar Trigger (Responsive) */}
      <div className="flex-1 max-w-md mx-2 hidden md:block">
        <button
          onClick={onOpenQuickSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-700/60 dark:border-zinc-800 text-xs text-zinc-400 transition-all group shadow-xs"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 text-zinc-400 group-hover:text-cyan-400 transition-colors shrink-0" />
            <span className="truncate font-medium text-zinc-400">Search spec, tasks, or AI command...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded-md text-[10px] bg-zinc-950 text-zinc-400 border border-zinc-800 font-mono font-bold shrink-0 ml-2">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* RIGHT ZONE: Desktop Actions & Mobile Menu Trigger */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile Search Button (< md screens) */}
        <button
          onClick={onOpenQuickSearch}
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 md:hidden hover:bg-zinc-800 transition-colors"
          title="Search"
        >
          <Search className="w-4 h-4 text-cyan-400" />
        </button>

        {/* GitHub & Jira Sync Integration Button */}
        {onOpenIntegrations && (
          <button
            onClick={onOpenIntegrations}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all shadow-xs"
            title="Configure GitHub PAT & Jira Cloud integrations"
          >
            <Github className="w-3.5 h-3.5 text-purple-400" />
            <span>GitHub & Jira Sync</span>
          </button>
        )}

        {/* Export Zip Button (Desktop) */}
        <button
          onClick={handleExportZip}
          disabled={isExporting}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 dark:border-zinc-800 text-xs font-semibold transition-all disabled:opacity-50 shadow-xs"
          title="Export complete Spec-Kit repository zip"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isExporting ? 'Packaging...' : 'Export .spec-kit'}</span>
        </button>

        {/* Central Theme Switcher */}
        <ThemeSwitcher />

        {/* Offline Ready Status Badge (Compact Dot or Full Pill depending on screen width) */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Offline Ready</span>
        </div>

        {/* Mobile Overflow Menu Button (< lg screens) */}
        <div className="relative lg:hidden" ref={mobileMenuRef}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
            title="More Options"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
          </button>

          {/* Mobile Drawer Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 text-xs space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-zinc-400 uppercase border-b border-zinc-800">
                Quick Actions
              </div>

              <button
                onClick={() => {
                  handleExportZip();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl bg-zinc-800 text-zinc-200 font-semibold flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export .spec-kit Zip</span>
              </button>

              <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2 font-semibold text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Offline Engine Ready</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

