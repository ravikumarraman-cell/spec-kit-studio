import React from 'react';
import { Check, CircleDot, Sparkles } from 'lucide-react';
import { UserStory } from '../../types/speckit';

const priorityStyles: Record<UserStory['priority'], string> = {
  High: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  Medium: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  Low: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
};

/** A consistent, review-first representation used for stories from any importer. */
export function UserStoryPreview({ story, index }: { story: UserStory; index: number }) {
  const criteria = story.acceptanceCriteria || [];
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/75 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-indigo-950/30">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-400 via-cyan-400 to-emerald-400" />
      <div className="p-5 pl-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-300"><Sparkles className="h-3.5 w-3.5" /> Story {String(index + 1).padStart(2, '0')} <span className="text-zinc-600">•</span> {story.id}</div><h4 className="mt-2 text-base font-bold leading-snug text-zinc-50">{story.title}</h4></div>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${priorityStyles[story.priority || 'Medium']}`}>{story.priority || 'Medium'} priority</span>
        </header>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StoryFacet label="Who" value={story.asA} tone="text-cyan-200" />
          <StoryFacet label="Needs" value={story.iWantTo} tone="text-zinc-100" />
          <StoryFacet label="Outcome" value={story.soThat} tone="text-emerald-200" />
        </div>

        <section className="mt-4 rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-200"><CircleDot className="h-3.5 w-3.5 text-emerald-400" /> Acceptance criteria <span className="ml-auto rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{criteria.length}</span></div>
          {criteria.length ? <ol className="mt-3 space-y-2">{criteria.map((criterion, criterionIndex) => <li key={`${story.id}-${criterionIndex}`} className="flex gap-2.5 text-xs leading-relaxed text-zinc-300"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-[10px] font-bold text-emerald-300">{criterionIndex + 1}</span><span>{criterion}</span></li>)}</ol> : <p className="mt-2 text-xs text-amber-200">No acceptance criteria were found. Add them before approving this story.</p>}
        </section>
      </div>
    </article>
  );
}

function StoryFacet({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">{label}</p><p className={`mt-1 text-xs font-medium leading-relaxed ${tone}`}>{value || 'Not specified'}</p></div>;
}
