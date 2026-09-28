import React, { useRef, useEffect, useMemo, memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileText,
  Workflow,
  CheckSquare,
  ShieldCheck,
  Bot,
  Activity,
  Terminal,
  FolderGit2,
  Sparkles
} from 'lucide-react';
import { ViewTab, SpecKitProject } from '../../../types/speckit';
import { HeaderMenuItem } from './types';
import { AllMenusDropdown } from './AllMenusDropdown';
import { useHorizontalScrollNavigation } from '../../../hooks/useHorizontalScrollNavigation';

interface HorizontalMenuBarProps {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  project: SpecKitProject;
  onOpenAiSpecModal?: () => void;
  onOpenQuickSearch: () => void;
}

export const HorizontalMenuBar: React.FC<HorizontalMenuBarProps> = memo(({
  activeTab,
  onSelectTab,
  project,
  onOpenAiSpecModal,
  onOpenQuickSearch,
}) => {
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Compute live contextual badges from active project
  const menuItems = useMemo<HeaderMenuItem[]>(() => {
    const totalTasks = project.tasks?.tasks?.length || 0;
    const completedTasks = project.tasks?.tasks?.filter((t) => t.status === 'done').length || 0;
    const unmappedTasks = project.tasks?.tasks?.filter((t) => !t.mappedRequirementId).length || 0;
    const totalReqs = project.spec?.functionalRequirements?.length || 0;
    const totalTech = project.plan?.techStack?.length || 0;
    const totalRules = project.constitution?.rules?.length || 0;
    const auditScore = project.audit?.overallScore || 94;

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
  }, [project]);
  const activeElement = tabButtonRefs.current[activeTab];
  const navigation = useHorizontalScrollNavigation(activeElement);

  // Keyboard shortcut listener: Alt+1 through Alt+9
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const digit = parseInt(e.key, 10);
        if (digit >= 1 && digit <= 9) {
          const matchedItem = menuItems.find((item) => item.shortcutDigit === digit);
          if (matchedItem) {
            e.preventDefault();
            onSelectTab(matchedItem.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuItems, onSelectTab]);

  const handleTabClick = (id: ViewTab) => {
    if (navigation.wasDragged()) return;
    onSelectTab(id);
  };

  return (
    <nav
      className="relative border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-md select-none"
      aria-label="Workflow Modules"
    >
      <div className="max-w-full flex items-center justify-between px-2 sm:px-4 md:px-6 relative h-11">
        {/* Left Edge Gradient Mask & Smooth Scroll Chevron */}
        <div
          className={`absolute left-0 top-0 bottom-0 z-20 flex items-center pl-1 sm:pl-2 pointer-events-none transition-opacity duration-300 ${
            navigation.canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={!navigation.canScrollLeft}
        >
          <div className="w-16 h-full bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none absolute left-0" />
          <button
            type="button"
            onClick={() => navigation.scrollBy('left')}
            disabled={!navigation.canScrollLeft}
            aria-label="Scroll navigation menus left"
            className="relative z-10 w-7 h-7 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-700/80 shadow-md flex items-center justify-center pointer-events-auto transition-all transform hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* The Scrollable Horizontal Tab Track */}
        <div
          ref={navigation.containerRef}
          onWheel={navigation.onWheel}
          onMouseDown={navigation.onMouseDown}
          onMouseMove={navigation.onMouseMove}
          onMouseUp={navigation.onMouseUpOrLeave}
          onMouseLeave={navigation.onMouseUpOrLeave}
          className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full h-full py-1 ${
            navigation.isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
          }`}
          role="tablist"
        >
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabButtonRefs.current[item.id] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabClick(item.id)}
                title={`${item.label} (${item.shortcutKey}) - ${item.description}`}
                className={`group relative shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? `bg-zinc-900/90 text-cyan-300 shadow-sm border border-zinc-700/80 ${item.activeColor}`
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                }`}
              >
                {/* Menu Icon */}
                <Icon
                  className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                    isActive ? item.iconColor : 'text-zinc-400 group-hover:text-zinc-300'
                  }`}
                />

                {/* Label (never wrap) */}
                <span className="whitespace-nowrap font-medium text-xs tracking-tight">
                  {item.label}
                </span>

                {/* Live Contextual Badge */}
                {item.badge && (
                  <span
                    className={`whitespace-nowrap text-[9px] font-mono px-1.5 py-0.2 rounded border transition-colors ${
                      isActive
                        ? 'bg-zinc-950 text-cyan-300 border-zinc-700 font-bold'
                        : 'bg-zinc-950/70 text-zinc-500 border-zinc-800/80 group-hover:text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Active Indicator Underline / Glow */}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 shadow-xs" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Edge Gradient Mask & Smooth Scroll Chevron */}
        <div
          className={`absolute right-14 sm:right-28 top-0 bottom-0 z-20 flex items-center pr-1 pointer-events-none transition-opacity duration-300 ${
            navigation.canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden={!navigation.canScrollRight}
        >
          <div className="w-16 h-full bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent pointer-events-none absolute right-0" />
          <button
            type="button"
            onClick={() => navigation.scrollBy('right')}
            disabled={!navigation.canScrollRight}
            aria-label="Scroll navigation menus right"
            className="relative z-10 w-7 h-7 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 border border-zinc-700/80 shadow-md flex items-center justify-center pointer-events-auto transition-all transform hover:scale-105 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* All Menus Dropdown & Navigation Helpers */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 ml-1 relative z-30 border-l border-zinc-800/80 bg-zinc-950/90">
          <AllMenusDropdown
            menuItems={menuItems}
            activeTab={activeTab}
            onSelectTab={onSelectTab}
            onOpenAiSpecModal={onOpenAiSpecModal}
            onOpenQuickSearch={onOpenQuickSearch}
          />
        </div>
      </div>

      {/* Micro Scroll-Progress Track */}
      <div className="w-full h-[1.5px] bg-zinc-900/40 relative overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-100"
          style={{ width: `${Math.max(5, navigation.scrollProgress)}%` }}
        />
      </div>
    </nav>
  );
});

HorizontalMenuBar.displayName = 'HorizontalMenuBar';
