import React, { memo } from 'react';
import { Workflow, Terminal } from 'lucide-react';
import { ViewTab } from '../../types/speckit';

interface WorkflowActionCardsProps {
  onNavigateTab: (tab: ViewTab) => void;
}

export const WorkflowActionCards: React.FC<WorkflowActionCardsProps> = memo(({ onNavigateTab }) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Focused workspaces">
      <button
        type="button"
        onClick={() => onNavigateTab('plan')}
        className="group rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-indigo-400/50 dark:hover:bg-indigo-500/10"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <Workflow className="w-4 h-4" />
        </div>
        <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-700 dark:text-zinc-100 dark:group-hover:text-cyan-200">
          Architecture & ADRs
        </div>
        <p className="line-clamp-2 text-[11px] text-slate-600 dark:text-zinc-400">
          Tech stack, Mermaid.js diagrams, API contracts, and schema design.
        </p>
      </button>

      <button
        type="button"
        onClick={() => onNavigateTab('prompt')}
        className="group rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-purple-300 hover:bg-purple-50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-purple-400/50 dark:hover:bg-purple-500/10"
      >
        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
          <Terminal className="w-4 h-4" />
        </div>
        <div className="text-xs font-semibold text-slate-900 group-hover:text-purple-700 dark:text-zinc-100 dark:group-hover:text-purple-200">
          Agent Prompt Studio
        </div>
        <p className="line-clamp-2 text-[11px] text-slate-600 dark:text-zinc-400">
          Prepare reusable task prompts for the agent you selected.
        </p>
      </button>

      <button
        type="button"
        onClick={() => onNavigateTab('export')}
        className="group rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-emerald-400/50 dark:hover:bg-emerald-500/10"
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <Terminal className="w-4 h-4" />
        </div>
        <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 dark:text-zinc-100 dark:group-hover:text-emerald-200">
          specify.sh CLI Exporter
        </div>
        <p className="line-clamp-2 text-[11px] text-slate-600 dark:text-zinc-400">
          Download official GitHub Spec-Kit shell scripts and repo bundle.
        </p>
      </button>
    </div>
  );
});

WorkflowActionCards.displayName = 'WorkflowActionCards';
