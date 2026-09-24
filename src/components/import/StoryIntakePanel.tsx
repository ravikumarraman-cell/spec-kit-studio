import { useMemo, useState } from 'react';
import { AlertCircle, BookOpenCheck, Check, FileUp, Search, Sparkles } from 'lucide-react';
import { importApi, StoryExtractionPackage } from '../../lib/api/imports';
import { deliveryScope } from '../../lib/deliveryItems';
import { FeatureImportSource, FunctionalRequirement, Priority, SpecKitProject, UserStory } from '../../types/speckit';

type IntakeMode = 'compose' | 'existing';

interface Props {
  project: SpecKitProject;
  initialStoryId?: string;
  isSaving?: boolean;
  onSubmit: (story: UserStory, requirements: FunctionalRequirement[], source: FeatureImportSource, parentFeatureId?: string) => void;
  onError: (message: string | null) => void;
}

function nextId(prefix: 'US' | 'FR', existing: string[]): string {
  const highest = existing.reduce((max, value) => {
    const match = value.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 100);
  return `${prefix}-${highest + 1}`;
}

export function StoryIntakePanel({ project, initialStoryId, isSaving = false, onSubmit, onError }: Props) {
  const [mode, setMode] = useState<IntakeMode>(initialStoryId ? 'existing' : 'compose');
  const [query, setQuery] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState(initialStoryId || '');
  const [selectedRequirementIds, setSelectedRequirementIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [asA, setAsA] = useState('');
  const [iWantTo, setIWantTo] = useState('');
  const [soThat, setSoThat] = useState('');
  const [priority, setPriority] = useState<Priority>('High');
  const [criteria, setCriteria] = useState('');
  const [sourceContent, setSourceContent] = useState('');
  const [extracted, setExtracted] = useState<StoryExtractionPackage | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const stories = useMemo(() => project.spec.userStories.filter((story) => {
    const needle = query.trim().toLowerCase();
    return !needle || `${story.id} ${story.title} ${story.asA} ${story.iWantTo}`.toLowerCase().includes(needle);
  }), [project.spec.userStories, query]);
  const selectedStory = project.spec.userStories.find((story) => story.id === selectedStoryId);
  const parentFeature = selectedStory ? (project.featureInbox || []).find((item) => deliveryScope(item) === 'feature' && item.userStoryIds.includes(selectedStory.id)) : undefined;
  const availableRequirements = parentFeature
    ? project.spec.functionalRequirements.filter((requirement) => parentFeature.requirementIds.includes(requirement.id))
    : project.spec.functionalRequirements;

  const chooseStory = (story: UserStory) => {
    setSelectedStoryId(story.id);
    setSelectedRequirementIds(story.requirementIds?.filter((id) => project.spec.functionalRequirements.some((requirement) => requirement.id === id)) || []);
    onError(null);
  };

  const extractStory = async () => {
    if (!sourceContent.trim()) { onError('Paste a ticket, story draft, or source text first.'); return; }
    setIsExtracting(true); onError(null);
    try {
      const response = await importApi.extractStory({ storyContent: sourceContent, storyTitle: title, sourceType: 'text' });
      const value = response.data;
      if (!value?.story?.title || !value.story.acceptanceCriteria?.length || !value.functionalRequirements?.length) throw new Error('The extractor did not return one complete, testable story.');
      setExtracted(value);
      setTitle(value.story.title); setAsA(value.story.asA); setIWantTo(value.story.iWantTo); setSoThat(value.story.soThat);
      setPriority(value.story.priority); setCriteria(value.story.acceptanceCriteria.join('\n'));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Studio could not extract this user story.');
    } finally { setIsExtracting(false); }
  };

  const submitComposed = () => {
    const acceptanceCriteria = criteria.split('\n').map((item) => item.trim()).filter(Boolean);
    if (!title.trim() || !asA.trim() || !iWantTo.trim() || !soThat.trim() || !acceptanceCriteria.length) {
      onError('Complete the story outcome and add at least one acceptance criterion.'); return;
    }
    const storyId = extracted?.story.id || nextId('US', project.spec.userStories.map((story) => story.id));
    const requirements = extracted?.functionalRequirements?.length ? extracted.functionalRequirements : [{
      id: nextId('FR', project.spec.functionalRequirements.map((requirement) => requirement.id)),
      title: title.trim(), description: `The system must let ${asA.trim()} ${iWantTo.trim()} so that ${soThat.trim()}.`, category: 'Core' as const, priority,
    }];
    const story: UserStory = { id: storyId, title: title.trim(), priority, asA: asA.trim(), iWantTo: iWantTo.trim(), soThat: soThat.trim(), acceptanceCriteria, requirementIds: requirements.map((requirement) => requirement.id) };
    onSubmit(story, requirements, sourceContent.trim() ? 'text' : 'unknown');
  };

  const submitExisting = () => {
    if (!selectedStory) { onError('Choose one user story to continue.'); return; }
    const requirements = project.spec.functionalRequirements.filter((requirement) => selectedRequirementIds.includes(requirement.id));
    if (!requirements.length) { onError('Select at least one requirement that this story must deliver.'); return; }
    onSubmit({ ...selectedStory, requirementIds: requirements.map((requirement) => requirement.id) }, requirements, 'repository', parentFeature?.id);
  };

  return <div className="space-y-5">
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1" role="tablist" aria-label="User story intake method">
      <button type="button" role="tab" aria-selected={mode === 'compose'} onClick={() => { setMode('compose'); onError(null); }} className={`rounded-lg px-3 py-2.5 text-xs font-bold ${mode === 'compose' ? 'bg-zinc-800 text-cyan-200' : 'text-zinc-400 hover:text-zinc-200'}`}><Sparkles className="mr-1.5 inline h-3.5 w-3.5" />Write or import</button>
      <button type="button" role="tab" aria-selected={mode === 'existing'} onClick={() => { setMode('existing'); onError(null); }} className={`rounded-lg px-3 py-2.5 text-xs font-bold ${mode === 'existing' ? 'bg-zinc-800 text-cyan-200' : 'text-zinc-400 hover:text-zinc-200'}`}><BookOpenCheck className="mr-1.5 inline h-3.5 w-3.5" />Choose existing</button>
    </div>

    {mode === 'compose' ? <div className="space-y-4">
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div><p className="text-xs font-bold text-zinc-100">Have a ticket or rough draft?</p><p className="mt-1 text-[11px] text-zinc-400">Paste it here and Studio will shape one focused story. You can review every field before saving.</p></div>
          <label className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"><FileUp className="h-3.5 w-3.5" />Upload text<input type="file" accept=".md,.txt,.json" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (file) { setSourceContent(await file.text()); if (!title) setTitle(file.name.replace(/\.[^.]+$/, '')); } }} /></label>
        </div>
        <textarea value={sourceContent} onChange={(event) => setSourceContent(event.target.value)} rows={4} placeholder="Paste one Jira story, GitHub issue, or user-story draft..." className="mt-3 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-100 outline-none focus:border-cyan-500/60" />
        <button type="button" disabled={isExtracting || !sourceContent.trim()} onClick={extractStory} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-3 py-2.5 text-xs font-black text-zinc-950 hover:bg-cyan-400 disabled:opacity-50 sm:w-auto"><Sparkles className={`h-3.5 w-3.5 ${isExtracting ? 'animate-pulse' : ''}`} />{isExtracting ? 'Extracting one story...' : 'Extract one story'}</button>
      </section>

      <section className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 sm:grid-cols-2">
        <Field label="Story title" value={title} onChange={setTitle} placeholder="Export inventory as CSV" />
        <label className="space-y-1 text-xs"><span className="font-bold text-zinc-200">Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-100 outline-none focus:border-cyan-500/60"><option>High</option><option>Medium</option><option>Low</option></select></label>
        <Field label="As a" value={asA} onChange={setAsA} placeholder="Cloud analyst" />
        <Field label="I want to" value={iWantTo} onChange={setIWantTo} placeholder="export the filtered inventory" />
        <div className="sm:col-span-2"><Field label="So that" value={soThat} onChange={setSoThat} placeholder="I can review and share it offline" /></div>
        <label className="space-y-1 text-xs sm:col-span-2"><span className="font-bold text-zinc-200">Acceptance criteria <span className="font-normal text-zinc-500">(one per line)</span></span><textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} rows={4} placeholder={'CSV includes the currently filtered rows.\nThe exported columns match the visible inventory.'} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 outline-none focus:border-cyan-500/60" /></label>
      </section>
      <button type="button" disabled={isSaving} onClick={submitComposed} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-60"><Check className="h-4 w-4" />{isSaving ? 'Creating story journey...' : 'Create story journey'}</button>
    </div> : <div className="space-y-4">
      <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by story ID, title, role, or outcome" className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-10 pr-3 text-xs text-zinc-100 outline-none focus:border-cyan-500/60" /></div>
      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">{stories.length ? stories.map((story) => <button key={story.id} type="button" onClick={() => chooseStory(story)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedStoryId === story.id ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'}`}><div className="flex items-start gap-3"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selectedStoryId === story.id ? 'border-cyan-400 bg-cyan-400 text-zinc-950' : 'border-zinc-700 text-transparent'}`}><Check className="h-3 w-3" /></span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="font-mono text-[11px] text-cyan-300">{story.id}</strong><strong className="text-xs text-zinc-100">{story.title}</strong></span><span className="mt-1 line-clamp-2 block text-[11px] text-zinc-400">As a {story.asA}, I want to {story.iWantTo}, so that {story.soThat}.</span></span></div></button>) : <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center text-xs text-zinc-400">No stories match your search.</div>}</div>
      {selectedStory && <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="text-xs font-bold text-zinc-100">Requirements this story will deliver</p><p className="mt-1 text-[11px] text-zinc-400">Select only the requirements needed for this use case. This prevents sibling work from entering the journey.</p><div className="mt-3 space-y-2">{availableRequirements.length ? availableRequirements.map((requirement) => <label key={requirement.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-800 p-2.5 hover:bg-zinc-900"><input type="checkbox" checked={selectedRequirementIds.includes(requirement.id)} onChange={() => setSelectedRequirementIds((current) => current.includes(requirement.id) ? current.filter((id) => id !== requirement.id) : [...current, requirement.id])} className="mt-0.5 accent-cyan-400" /><span><span className="font-mono text-[10px] font-bold text-cyan-300">{requirement.id}</span><span className="ml-2 text-xs font-bold text-zinc-200">{requirement.title}</span><span className="mt-0.5 block text-[11px] text-zinc-400">{requirement.description}</span></span></label>) : <p className="flex items-center gap-2 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-[11px] text-amber-100"><AlertCircle className="h-4 w-4 shrink-0" />Add a functional requirement to the specification before starting this story.</p>}</div></section>}
      <button type="button" disabled={isSaving || !selectedStory} onClick={submitExisting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"><Check className="h-4 w-4" />{isSaving ? 'Starting journey...' : 'Start with this story'}</button>
    </div>}
  </div>;
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="space-y-1 text-xs"><span className="font-bold text-zinc-200">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-100 outline-none focus:border-cyan-500/60" /></label>;
}