import React from 'react';
import { CheckCircle2, FileText, Layers, ListTodo, Plus, PlusCircle, Workflow } from 'lucide-react';
import { FeatureExtractionPackage } from '../../lib/api/imports';
import { UserStoryPreview } from './UserStoryPreview';

export type FeaturePreviewTab = 'stories' | 'requirements' | 'plan' | 'tasks' | 'constitution';

interface FeatureExtractionPreviewProps {
  result: FeatureExtractionPackage;
  activeProjectName?: string;
  canMerge: boolean;
  tab: FeaturePreviewTab;
  onTabChange: (tab: FeaturePreviewTab) => void;
  onReExtract: () => void;
  onCreateProject: () => void;
  onMerge: () => void;
}

/** Read-only Spec-Kit output preview plus an explicit destination decision. */
export function FeatureExtractionPreview({
  result,
  activeProjectName,
  canMerge,
  tab,
  onTabChange,
  onReExtract,
  onCreateProject,
  onMerge,
}: FeatureExtractionPreviewProps) {
  const tabClass = (name: FeaturePreviewTab, activeClass: string) =>
    `flex-1 py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${tab === name ? `bg-zinc-800 ${activeClass} shadow-xs` : 'text-zinc-400 hover:text-zinc-200'}`;

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-zinc-900 to-cyan-950/80 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-1"><div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-400" /><h3 className="text-base font-bold text-zinc-100">{result.title}</h3></div><p className="text-zinc-300 max-w-2xl">{result.summary}</p></div>
        <button type="button" onClick={onReExtract} className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium shrink-0 self-start sm:self-auto">Edit Input / Re-Extract</button>
      </div>

      <div className="p-1 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center text-xs">
        <button type="button" onClick={() => onTabChange('stories')} className={tabClass('stories', 'text-indigo-300')}><Layers className="w-3.5 h-3.5 text-indigo-400" /><span>User Stories ({result.userStories?.length || 0})</span></button>
        <button type="button" onClick={() => onTabChange('requirements')} className={tabClass('requirements', 'text-cyan-300')}><FileText className="w-3.5 h-3.5 text-cyan-400" /><span>Requirements ({result.functionalRequirements?.length || 0})</span></button>
        <button type="button" onClick={() => onTabChange('plan')} className={tabClass('plan', 'text-purple-300')}><Workflow className="w-3.5 h-3.5 text-purple-400" /><span>Tech Stack & Plan</span></button>
        <button type="button" onClick={() => onTabChange('tasks')} className={tabClass('tasks', 'text-emerald-300')}><ListTodo className="w-3.5 h-3.5 text-emerald-400" /><span>Task Breakdown ({result.tasks?.length || 0})</span></button>
      </div>

      {tab === 'stories' && <div className="space-y-4"><div className="flex items-center justify-between px-1 text-xs"><p className="font-medium text-zinc-400">Review each story’s audience, need, outcome, and testable behavior.</p><span className="rounded-full bg-indigo-500/10 px-2.5 py-1 font-bold text-indigo-200">{result.userStories?.length || 0} stories</span></div>{result.userStories?.map((story, index) => <UserStoryPreview key={story.id || index} story={story} index={index} />)}</div>}

      {tab === 'requirements' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">{result.functionalRequirements?.map((requirement) => <div key={requirement.id} className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1.5"><div className="flex items-center justify-between"><span className="font-mono text-xs font-bold text-cyan-400">{requirement.id}</span><span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">{requirement.category}</span></div><h4 className="font-bold text-zinc-100">{requirement.title}</h4><p className="text-zinc-400">{requirement.description}</p></div>)}</div>}

      {tab === 'plan' && <div className="space-y-4 text-xs"><div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2"><h4 className="font-bold text-zinc-200">Recommended Technology Stack</h4><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{result.techStack?.map((stack, index) => <div key={`${stack.category}-${stack.technology}-${index}`} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800/80"><div className="font-bold text-cyan-300">{stack.technology}</div><div className="text-[10px] text-zinc-400">{stack.category} — {stack.justification}</div></div>)}</div></div></div>}

      {tab === 'tasks' && <div className="space-y-2.5 text-xs">{result.tasks?.map((task) => <div key={task.id} className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-start justify-between gap-3"><div className="space-y-1"><div className="flex items-center gap-2"><span className="font-mono font-bold text-emerald-400">{task.id}</span><span className="font-bold text-zinc-100">{task.title}</span><span className="text-[10px] px-2 py-0.2 rounded bg-zinc-900 text-zinc-400">{task.phase}</span></div><p className="text-zinc-400">{task.description}</p></div><span className="text-[11px] font-mono text-zinc-400 shrink-0">{task.estimatedHours || 3}h</span></div>)}</div>}

      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 pt-4">
        <div className="text-xs font-bold text-zinc-300">Feature destination:</div>
        {canMerge && activeProjectName && <p className="text-xs leading-relaxed text-cyan-100">This feature will be added to <strong>{activeProjectName}</strong> and continue its current Journey.</p>}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {canMerge && activeProjectName
            ? <button type="button" onClick={onMerge} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"><Plus className="w-4 h-4" /><span>Add feature to this workspace</span></button>
            : <button type="button" onClick={onCreateProject} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"><PlusCircle className="w-4 h-4" /><span>Create Spec-Kit Project ({result.title})</span></button>}
        </div>
      </div>
    </div>
  );
}
