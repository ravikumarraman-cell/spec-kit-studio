import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight, FileText, CheckSquare, Workflow, ShieldCheck, Bot, Activity } from 'lucide-react';
import { SpecKitProject, ViewTab } from '../../types/speckit';
import { Modal } from './Modal';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: SpecKitProject;
  onNavigateTab: (tab: ViewTab) => void;
  onStartStoryDelivery?: (storyId: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  project,
  onNavigateTab,
  onStartStoryDelivery,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter items based on query
  const matchingStories = project.spec.userStories.filter(
    (s) => s.title.toLowerCase().includes(query.toLowerCase()) || s.id.toLowerCase().includes(query.toLowerCase())
  );

  const matchingReqs = project.spec.functionalRequirements.filter(
    (r) => r.title.toLowerCase().includes(query.toLowerCase()) || r.id.toLowerCase().includes(query.toLowerCase())
  );

  const matchingTasks = project.tasks.tasks.filter(
    (t) => t.title.toLowerCase().includes(query.toLowerCase()) || t.id.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Quick search" className="items-start justify-center px-4 pt-20">
      <div className="w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Search Input Bar */}
        <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search specs, requirements, tasks, or AI commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-xs"
          />
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Quick Navigation Section */}
          {!query && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Quick Navigation
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => {
                    onNavigateTab('spec');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 text-left flex items-center gap-2 text-zinc-200"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Feature Spec (spec.md)</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('plan');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 text-left flex items-center gap-2 text-zinc-200"
                >
                  <Workflow className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Architecture Plan (plan.md)</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('tasks');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 text-left flex items-center gap-2 text-zinc-200"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Task Breakdown (tasks.md)</span>
                </button>
                <button
                  onClick={() => {
                    onNavigateTab('prompt');
                    onClose();
                  }}
                  className="p-2.5 rounded-xl hover:bg-zinc-800 text-left flex items-center gap-2 text-zinc-200"
                >
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                  <span>AI Prompt Studio</span>
                </button>
              </div>
            </div>
          )}

          {/* User Stories Matches */}
          {matchingStories.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                User Stories
              </div>
              {matchingStories.map((story) => (
                <div
                  key={story.id}
                  className="flex w-full items-center gap-1 rounded-xl hover:bg-zinc-800"
                >
                  <button type="button" onClick={() => { onNavigateTab('spec'); onClose(); }} className="flex min-w-0 flex-1 items-center justify-between p-2.5 text-left text-zinc-200">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-cyan-400 font-bold">{story.id}</span>
                    <span className="truncate">{story.title}</span>
                  </span>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                  </button>
                  {onStartStoryDelivery && <button type="button" onClick={() => onStartStoryDelivery(story.id)} className="mr-2 rounded-md border border-cyan-400/25 px-2 py-1 text-[10px] font-bold text-cyan-200 hover:bg-cyan-500/10">Start</button>}
                </div>
              ))}
            </div>
          )}

          {/* Requirements Matches */}
          {matchingReqs.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Functional Requirements
              </div>
              {matchingReqs.map((req) => (
                <button
                  key={req.id}
                  onClick={() => {
                    onNavigateTab('spec');
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-zinc-800 text-left flex items-center justify-between text-zinc-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-emerald-400 font-bold">{req.id}</span>
                    <span>{req.title}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                </button>
              ))}
            </div>
          )}

          {/* Tasks Matches */}
          {matchingTasks.length > 0 && (
            <div className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Tasks
              </div>
              {matchingTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    onNavigateTab('tasks');
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl hover:bg-zinc-800 text-left flex items-center justify-between text-zinc-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-purple-400 font-bold">{task.id}</span>
                    <span>{task.title}</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-zinc-500" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
