import { useState } from 'react';
import { BookOpenCheck, FileText, Inbox, Layers3, ListTodo, Plus, Sparkles } from 'lucide-react';
import { deliveryItemLabel, deliveryScope } from '../../lib/deliveryItems';
import { FeatureInboxItem, SpecKitProject, ViewTab } from '../../types/speckit';

interface Props {
  project: SpecKitProject;
  onImport: () => void;
  onNavigate: (tab: ViewTab) => void;
  activeFeatureId?: string;
  onSelectFeature: (featureId: string) => void;
}

type Filter = 'all' | 'feature' | 'user-story';

const sourceLabels: Record<FeatureInboxItem['source'], string> = {
  text: 'Pasted text', file: 'Uploaded document', github: 'GitHub issue', preset: 'Feature preset', repository: 'Workspace story', unknown: 'Studio intake',
};

/** Mixed delivery-item inventory. The persisted collection keeps its legacy name for compatibility. */
export function FeatureInbox({ project, onImport, onNavigate, activeFeatureId, onSelectFeature }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const items = project.featureInbox || [];
  const visibleItems = items.filter((item) => filter === 'all' || deliveryScope(item) === filter).slice().reverse();
  const featureCount = items.filter((item) => deliveryScope(item) === 'feature').length;
  const storyCount = items.length - featureCount;

  return <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-300"><Inbox className="h-4 w-4" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Delivery items</p><h2 className="mt-1 font-bold text-zinc-100">{items.length ? `${items.length} outcome${items.length === 1 ? '' : 's'} ready to work on` : 'Start with a feature or user story'}</h2><p className="mt-1 max-w-2xl text-xs text-zinc-400">Each item keeps its own scope, artifacts, approvals, tasks, and implementation evidence.</p></div></div>
      <button type="button" onClick={onImport} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-zinc-950 hover:bg-cyan-300"><Plus className="h-3.5 w-3.5" />Start delivery work</button>
    </div>

    {items.length > 0 && <div className="mt-4 flex w-full gap-1 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-1 sm:w-fit" role="tablist" aria-label="Filter delivery items">
      {([['all', `All ${items.length}`], ['feature', `Features ${featureCount}`], ['user-story', `Stories ${storyCount}`]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={filter === value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] font-bold ${filter === value ? 'bg-zinc-800 text-cyan-200' : 'text-zinc-400 hover:text-zinc-200'}`}>{label}</button>)}
    </div>}

    {items.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-5 text-xs text-zinc-400"><Sparkles className="mb-2 h-4 w-4 text-cyan-300" />Import a complete feature, write one focused story, or select a story already in this workspace.</div>
      : visibleItems.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-zinc-700 p-5 text-center text-xs text-zinc-400">No items match this filter.</div>
      : <div className="mt-4 grid gap-3 md:grid-cols-2">{visibleItems.map((item) => {
        const storyScope = deliveryScope(item) === 'user-story';
        const Icon = storyScope ? BookOpenCheck : Layers3;
        const active = item.id === activeFeatureId;
        return <article key={item.id} className={`rounded-xl border p-4 ${active ? 'border-cyan-400/55 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/60'}`}>
          <div className="flex items-start gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${storyScope ? 'bg-emerald-500/15 text-emerald-300' : 'bg-cyan-500/15 text-cyan-300'}`}><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${storyScope ? 'border-emerald-400/25 text-emerald-200' : 'border-cyan-400/25 text-cyan-200'}`}>{deliveryItemLabel(item)}</span><span className="text-[10px] text-zinc-500">{sourceLabels[item.source]}</span></div><h3 className="mt-1.5 truncate font-bold text-zinc-100">{storyScope && item.primaryStoryId ? `${item.primaryStoryId} - ` : ''}{item.title}</h3><p className="mt-1 line-clamp-2 text-xs text-zinc-400">{item.summary}</p></div></div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-zinc-400">{!storyScope && <span className="rounded bg-zinc-900 px-2 py-1">{item.userStoryIds.length} stories</span>}<span className="rounded bg-zinc-900 px-2 py-1">{item.requirementIds.length} requirements</span><span className="rounded bg-zinc-900 px-2 py-1">{item.taskIds.length} tasks</span></div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2"><button type="button" onClick={() => onSelectFeature(item.id)} className={`text-xs font-bold ${active ? 'text-cyan-200' : 'text-zinc-200 hover:text-cyan-200'}`}>{active ? `${deliveryItemLabel(item)} in focus` : `Work on this ${storyScope ? 'story' : 'feature'}`}</button><button type="button" onClick={() => { onSelectFeature(item.id); onNavigate('spec'); }} className="inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200"><FileText className="h-3.5 w-3.5" />Review spec</button><button type="button" onClick={() => { onSelectFeature(item.id); onNavigate('tasks'); }} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 hover:text-emerald-200"><ListTodo className="h-3.5 w-3.5" />Review tasks</button></div>
        </article>;
      })}</div>}
  </section>;
}
