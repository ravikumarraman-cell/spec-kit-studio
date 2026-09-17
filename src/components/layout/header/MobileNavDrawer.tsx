import React, { memo } from 'react';
import {
  X,
  FolderKanban,
  Search,
  Sparkles,
  Github,
  Download,
  CheckCircle2,
  Plus,
  RotateCcw,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { ViewTab, SpecKitProject } from '../../../types/speckit';
import { HeaderMenuItem } from './types';
import { ThemeSwitcher } from '../../common/ThemeSwitcher';
import { SpecKitVersionSelector } from '../../common/SpecKitVersionSelector';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: SpecKitProject[];
  activeProject: SpecKitProject;
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onOpenQuickSearch: () => void;
  onOpenAiSpecModal?: () => void;
  onOpenIntegrations?: () => void;
  onExportZip: () => void;
  isExporting: boolean;
  onResetSampleData: () => void;
  onSelectVersion: (version: string) => void;
  menuItems: HeaderMenuItem[];
}

export const MobileNavDrawer: React.FC<MobileNavDrawerProps> = memo(({
  isOpen,
  onClose,
  projects,
  activeProject,
  activeTab,
  onSelectTab,
  onSelectProject,
  onCreateProject,
  onOpenQuickSearch,
  onOpenAiSpecModal,
  onOpenIntegrations,
  onExportZip,
  isExporting,
  onResetSampleData,
  onSelectVersion,
  menuItems,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative ml-auto w-full max-w-xs sm:max-w-sm h-full bg-zinc-950 border-l border-zinc-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200 text-xs">
        {/* Drawer Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[6px] flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="font-bold text-zinc-100 text-sm">Spec-Kit Studio</div>
              <div className="text-[10px] text-zinc-500 font-mono">Mobile Navigation</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Quick Search Trigger */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenQuickSearch();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              <span>Omnibox Search</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-950 text-[10px] font-mono border border-zinc-800 text-zinc-400">
              ⌘K
            </kbd>
          </button>

          {/* Active Workspace Selector Card */}
          <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase font-mono font-bold text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Current Workspace</span>
              </span>
              <span className="text-emerald-400">Active</span>
            </div>
            <div className="text-xs font-semibold text-zinc-100 truncate">
              {activeProject.name}
            </div>
            <div className="text-[10px] text-zinc-500">
              Version {activeProject.version || '1.0.7'} • {activeProject.spec.userStories?.length || 0} Stories
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
              <SpecKitVersionSelector
                currentVersion={activeProject.version || '1.0.7'}
                onSelectVersion={onSelectVersion}
                variant="compact"
              />
              <button
                type="button"
                onClick={() => {
                  onCreateProject();
                  onClose();
                }}
                className="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>
          </div>

          {/* Workflow Modules Navigation List */}
          <div className="space-y-1">
            <div className="px-1 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Workflow Modules (9)
            </div>
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-2 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-300 font-bold border border-cyan-500/30'
                      : 'hover:bg-zinc-900 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-cyan-400' : 'text-zinc-400'
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 truncate font-normal">
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Action Tools */}
          <div className="pt-2 border-t border-zinc-800 space-y-2">
            <div className="px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
              Studio Tools
            </div>

            {onOpenAiSpecModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenAiSpecModal();
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Spec Generator</span>
              </button>
            )}

            {onOpenIntegrations && (
              <button
                type="button"
                onClick={() => {
                  onOpenIntegrations();
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold flex items-center gap-2"
              >
                <Github className="w-3.5 h-3.5 text-purple-400" />
                <span>GitHub & Jira Sync</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onExportZip();
                onClose();
              }}
              disabled={isExporting}
              className="w-full text-left px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 font-semibold flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isExporting ? 'Packaging...' : 'Export .spec-kit Zip'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onResetSampleData();
                onClose();
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Demo Template</span>
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between bg-zinc-950/80">
          <ThemeSwitcher />
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Offline Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
});

MobileNavDrawer.displayName = 'MobileNavDrawer';
