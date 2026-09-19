import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Workflow,
  CheckSquare,
  ShieldCheck,
  Bot,
  Activity,
  Terminal,
  FolderGit2,
  HardDrive,
  Sparkles
} from 'lucide-react';
import { ViewTab } from '../../types/speckit';

interface SidebarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  auditScore?: number;
  unmappedTaskCount?: number;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  auditScore = 94,
  unmappedTaskCount = 0,
  isCollapsed = false,
}) => {
  if (isCollapsed) return null;

  const navItems: { id: ViewTab; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: 'overview',
      label: 'Workspace Hub',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'import',
      label: 'Import Project / Repo',
      icon: <FolderGit2 className="w-4 h-4 text-sky-600 dark:text-cyan-400" />,
      badge: 'Import',
      badgeColor: 'text-sky-700 bg-sky-100 border-sky-300 dark:text-cyan-400 dark:bg-cyan-500/10 dark:border-cyan-500/20 font-bold',
    },
    {
      id: 'workspace',
      label: 'Connected Workspace',
      icon: <HardDrive className="w-4 h-4 text-emerald-500" />,
      badge: 'Local',
      badgeColor: 'text-emerald-800 bg-emerald-100 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/30 font-bold',
    },
    {
      id: 'spec',
      label: 'Feature Spec',
      icon: <FileText className="w-4 h-4" />,
      badge: 'spec.md',
    },
    {
      id: 'plan',
      label: 'Architecture Plan',
      icon: <Workflow className="w-4 h-4" />,
      badge: 'plan.md',
    },
    {
      id: 'tasks',
      label: 'Phased Task Board',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: unmappedTaskCount > 0 ? `${unmappedTaskCount} unmapped` : 'tasks.md',
      badgeColor: unmappedTaskCount > 0 ? 'text-amber-800 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-500/20 dark:border-amber-500/30 font-semibold' : undefined,
    },
    {
      id: 'constitution',
      label: 'Constitution Rules',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: 'rules',
    },
    {
      id: 'prompt',
      label: 'AI Agent Prompts',
      icon: <Bot className="w-4 h-4" />,
      badge: 'AI',
      badgeColor: 'text-purple-800 bg-purple-100 border-purple-300 dark:text-purple-300 dark:bg-purple-500/20 dark:border-purple-500/30 font-semibold',
    },
    {
      id: 'audit',
      label: 'Spec Quality Audit',
      icon: <Activity className="w-4 h-4" />,
      badge: `${auditScore}%`,
      badgeColor: auditScore >= 90 ? 'text-emerald-800 bg-emerald-100 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/30 font-semibold' : 'text-amber-800 bg-amber-100 border-amber-300 dark:text-amber-300 dark:bg-amber-500/20 dark:border-amber-500/30 font-semibold',
    },
    {
      id: 'export',
      label: 'CLI & Repo Exporter',
      icon: <Terminal className="w-4 h-4" />,
      badge: 'specify.sh',
    },
  ];

  return (
    <aside className="hidden md:flex md:w-64 border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/70 p-3 flex-col justify-between shrink-0 overflow-y-auto select-none">
      <div className="flex flex-col gap-1 w-full">
        <div className="px-3 py-2 text-[11px] font-black tracking-wider text-slate-500 dark:text-zinc-400 uppercase">
          Spec Workflow Modules
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                isActive
                  ? 'bg-sky-100 text-sky-950 dark:bg-zinc-800/90 dark:text-cyan-300 border border-sky-300 dark:border-cyan-500/40 shadow-xs'
                  : 'text-slate-800 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-sky-700 dark:text-cyan-400' : 'text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    item.badgeColor || 'text-slate-700 dark:text-zinc-300 bg-slate-200/80 dark:bg-zinc-900 border-slate-300 dark:border-zinc-800 font-semibold'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer Info */}
      <div className="hidden md:block pt-4 border-t border-zinc-200 dark:border-zinc-900 mt-6 px-3">
        <div className="rounded-xl bg-white dark:bg-gradient-to-b dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800/80 p-3 space-y-2 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-200">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
            <span>Spec-Driven AI</span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Specify logic before generating code. Eliminate hallucination with structured specs.
          </p>
        </div>
      </div>
    </aside>
  );
};
