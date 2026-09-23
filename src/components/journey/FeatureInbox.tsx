import React from 'react';
import { ArrowRight, FileText, Inbox, ListTodo, Plus, Sparkles } from 'lucide-react';
import { FeatureInboxItem, SpecKitProject, ViewTab } from '../../types/speckit';

interface Props {
  project: SpecKitProject;
  onImport: () => void;
  onNavigate: (tab: ViewTab) => void;
  activeFeatureId?: string;
  onSelectFeature: (featureId: string) => void;
}

const sourceLabels: Record<FeatureInboxItem['source'], string> = {
  text: 'Pasted text', file: 'Uploaded document', github: 'GitHub issue', preset: 'Feature preset', repository: 'Repository workflow', unknown: 'Imported feature',
};

/** Reusable feature-level inventory for any project that can receive imports. */
export function FeatureInbox({ project, onImport, onNavigate, activeFeatureId, onSelectFeature }: Props) {
  const items = project.featureInbox || [];
  return <section className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><div className="rounded-xl bg-violet-500/15 p-2 text-violet-300"><Inbox className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Feature Inbox</p><h2 className="mt-1 font-bold text-zinc-100">{items.length ? `${items.length} imported feature${items.length === 1 ? '' : 's'} ready to review` : 'No imported features yet'}</h2><p className="mt-1 text-xs text-zinc-400">Each import stays visible here, even after its stories and tasks are merged into the shared workspace.</p></div></div><button type="button" onClick={onImport} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-bold text-white hover:bg-violet-400"><Plus className="h-3.5 w-3.5" />Import feature</button></div>
    {items.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-4 text-xs text-zinc-400"><Sparkles className="mb-2 h-4 w-4 text-violet-300" />Import a PRD, ticket, document, or pasted brief. Studio will retain the feature as a reviewable item and link its generated artifacts below.</div> : <div className="mt-4 grid gap-3 md:grid-cols-2">{items.slice().reverse().map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.id === activeFeatureId ? 'border-cyan-400/50 bg-cyan-500/5' : 'border-zinc-800 bg-zinc-950/60'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-zinc-100">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.summary}</p></div><span className="shrink-0 rounded border border-violet-400/20 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-200">{sourceLabels[item.source]}</span></div><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-400"><span className="rounded bg-zinc-900 px-2 py-1">{item.userStoryIds.length} stories</span><span className="rounded bg-zinc-900 px-2 py-1">{item.requirementIds.length} requirements</span><span className="rounded bg-zinc-900 px-2 py-1">{item.taskIds.length} tasks</span></div><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onSelectFeature(item.id)} className={`text-xs font-bold ${item.id === activeFeatureId ? 'text-cyan-200' : 'text-violet-200 hover:text-violet-100'}`}>{item.id === activeFeatureId ? 'Feature in focus' : 'Work on this feature'}</button><button type="button" onClick={() => { onSelectFeature(item.id); onNavigate('spec'); }} className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200"><FileText className="h-3.5 w-3.5" />Review spec</button><button type="button" onClick={() => { onSelectFeature(item.id); onNavigate('tasks'); }} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 hover:text-emerald-200"><ListTodo className="h-3.5 w-3.5" />Review tasks</button><span className="ml-auto inline-flex items-center gap-1 text-[10px] text-zinc-500">Continue <ArrowRight className="h-3 w-3" /></span></div></article>)}</div>}
  </section>;
}
