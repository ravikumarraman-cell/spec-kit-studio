import React, { memo } from 'react';
import { Workflow, Terminal } from 'lucide-react';
import { ViewTab } from '../../types/speckit';

interface WorkflowActionCardsProps {
  onNavigateTab: (tab: ViewTab) => void;
}

export const WorkflowActionCards: React.FC<WorkflowActionCardsProps> = memo(({ onNavigateTab }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <button
        type="button"
        onClick={() => onNavigateTab('plan')}
        className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-left transition-all space-y-2 group"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
          <Workflow className="w-4 h-4" />
        </div>
        <div className="font-semibold text-xs text-zinc-200 group-hover:text-cyan-300">
          Architecture & ADRs
        </div>
        <p className="text-[11px] text-zinc-400 line-clamp-2">
          Tech stack, Mermaid.js diagrams, API contracts, and schema design.
        </p>
      </button>

      <button
        type="button"
        onClick={() => onNavigateTab('prompt')}
        className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-left transition-all space-y-2 group"
      >
        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
          <Terminal className="w-4 h-4" />
        </div>
        <div className="font-semibold text-xs text-zinc-200 group-hover:text-purple-300">
          AI Agent Prompt Studio
        </div>
        <p className="text-[11px] text-zinc-400 line-clamp-2">
          Generate prompt templates for Claude, Gemini, Cursor & Windsurf.
        </p>
      </button>

      <button
        type="button"
        onClick={() => onNavigateTab('export')}
        className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800 text-left transition-all space-y-2 group"
      >
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <Terminal className="w-4 h-4" />
        </div>
        <div className="font-semibold text-xs text-zinc-200 group-hover:text-emerald-300">
          specify.sh CLI Exporter
        </div>
        <p className="text-[11px] text-zinc-400 line-clamp-2">
          Download official GitHub Spec-Kit shell scripts and repo bundle.
        </p>
      </button>
    </div>
  );
});

WorkflowActionCards.displayName = 'WorkflowActionCards';
