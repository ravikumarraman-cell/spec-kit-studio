import { useState } from 'react';
import { CircleAlert, FileCheck2 } from 'lucide-react';
import { BusinessAnalysisPackage, SpecKitProject } from '../../types/speckit';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { deliveryScope } from '../../lib/deliveryItems';
import { businessAnalysisIssue, createBusinessAnalysisDraft } from '../../lib/personas/businessAnalysisArtifacts';
import { engineProjectionIssue } from '../../lib/personas/specKitProjection';
import { PersonaLifecycleCard } from './PersonaLifecycleCard';
import { PersonaScopeChooser } from './PersonaScopeChooser';
import { PersonaInputSummary } from './PersonaInputSummary';
import { PersonaDraftActions } from './PersonaDraftActions';

interface Props { project: SpecKitProject; onSave: (featureId: string, artifact: BusinessAnalysisPackage) => void; onImport: (scope: 'feature' | 'user-story') => void; }
const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

export function BusinessAnalystPanel({ project, onSave, onImport }: Props) {
  const feature = activeFeatureForProject(project);
  const [draft, setDraft] = useState<BusinessAnalysisPackage | null>(null); const [error, setError] = useState('');
  if (!feature) return <PersonaScopeChooser personaLabel="Business Analyst" title="Choose the work to analyze" description="Attach this advisory package to a feature or one independently deliverable user story." onChoose={onImport} />;
  const scope = deliveryScope(feature); const existing = feature.businessAnalysis;
  const prepare = () => setDraft(createBusinessAnalysisDraft(feature.title, feature.summary, scope, `studio/${feature.slug || feature.id}/business-analysis.md`, new Date().toISOString()));
  const accept = () => { if (!draft) return; const issue = businessAnalysisIssue(draft) || engineProjectionIssue(project, feature, draft.specKitProjection); if (issue) { setError(issue); return; } onSave(feature.id, { ...draft, acceptedAt: new Date().toISOString() }); setDraft(null); setError(''); };
  return <PersonaLifecycleCard label="Business Analyst" title={existing?.acceptedAt ? 'Business analysis ready for delivery review' : 'Clarify the outcome before implementation'} description="Turn the active delivery scope into explicit boundaries and testable acceptance evidence. This is advisory and never alters the specification automatically." creates={['Scope evidence', 'Acceptance evidence', 'Open-question handoff']} actionBrief={{ summary: 'Creates a local analysis draft from the active delivery scope.', creates: ['Business analysis draft with scope and acceptance evidence'], uses: ['The active feature or user-story boundary', 'Accepted Product Manager input when available'], doesNot: ['Scan a repository', 'Change the specification automatically', 'Approve delivery'], next: 'Review, edit, accept, or discard the analysis.' }} primaryAction={!draft && !existing?.acceptedAt ? <button type="button" onClick={prepare} className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-violet-300"><FileCheck2 className="h-4 w-4" />Prepare analysis</button> : undefined}>
    <PersonaInputSummary feature={feature} consumer="business-analyst" />
    {error && <p role="alert" className="mt-3 flex gap-2 text-xs text-rose-200"><CircleAlert className="h-4 w-4" />{error}</p>}
    {draft && <div className="mt-4 space-y-3 rounded-xl border border-violet-400/30 bg-zinc-950/45 p-4"><label className="grid gap-1 text-xs font-bold text-zinc-200">Business problem<textarea value={draft.problem} onChange={(event) => setDraft({ ...draft, problem: event.target.value })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label><label className="grid gap-1 text-xs font-bold text-zinc-200">In scope <span className="font-normal text-zinc-400">One outcome per line</span><textarea value={draft.inScope.join('\n')} onChange={(event) => setDraft({ ...draft, inScope: lines(event.target.value) })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label><label className="grid gap-1 text-xs font-bold text-zinc-200">Acceptance evidence <span className="font-normal text-zinc-400">One item per line</span><textarea value={draft.acceptanceEvidence.join('\n')} onChange={(event) => setDraft({ ...draft, acceptanceEvidence: lines(event.target.value) })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label><PersonaDraftActions acceptLabel="Prepare delivery handoff" onAccept={accept} onDiscard={() => setDraft(null)} /></div>}
  </PersonaLifecycleCard>;
}
