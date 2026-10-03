import { useState } from 'react';
import { CircleAlert, FileCheck2, ShieldCheck } from 'lucide-react';
import { SecurityResearchPackage, SpecKitProject } from '../../types/speckit';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { deliveryScope } from '../../lib/deliveryItems';
import { createSecurityResearchDraft, securityResearchIssue } from '../../lib/personas/securityResearchArtifacts';
import { engineProjectionIssue } from '../../lib/personas/specKitProjection';
import { PersonaLifecycleCard } from './PersonaLifecycleCard';
import { PersonaScopeChooser } from './PersonaScopeChooser';
import { PersonaInputSummary } from './PersonaInputSummary';
import { PersonaDraftActions } from './PersonaDraftActions';

interface Props { project: SpecKitProject; onSave: (featureId: string, artifact: SecurityResearchPackage) => void; onImport: (scope: 'feature' | 'user-story') => void; }
const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

export function SecurityResearcherPanel({ project, onSave, onImport }: Props) {
  const feature = activeFeatureForProject(project); const [draft, setDraft] = useState<SecurityResearchPackage | null>(null); const [error, setError] = useState('');
  if (!feature) return <PersonaScopeChooser personaLabel="Security Researcher" title="Choose the scope to assess" description="Security findings are always attached to a bounded feature or one user story." onChoose={onImport} />;
  const existing = feature.securityResearch; const prepare = () => setDraft(createSecurityResearchDraft(feature.title, deliveryScope(feature), `studio/${feature.slug || feature.id}/security-research.md`, new Date().toISOString()));
  const accept = () => { if (!draft) return; const issue = securityResearchIssue(draft) || engineProjectionIssue(project, feature, draft.specKitProjection); if (issue) { setError(issue); return; } onSave(feature.id, { ...draft, acceptedAt: new Date().toISOString() }); setDraft(null); setError(''); };
  return <PersonaLifecycleCard label="Security Researcher" title={existing?.acceptedAt ? 'Security review ready for design review' : 'Expose security boundaries before delivery'} description="Capture security constraints, required controls, and proof without scanning, changing, or exposing repository content." creates={['Security boundary review', 'Required-control evidence', 'Security verification handoff']} actionBrief={{ summary: 'Creates a local security-review draft for the active delivery scope.', creates: ['Security boundaries, required controls, and verification handoff'], uses: ['The active feature or user-story boundary', 'Accepted relevant persona evidence'], doesNot: ['Scan or expose repository content', 'Change code', 'Claim a compliance assessment or approve release'], next: 'Review, edit, accept, or discard the security research package.' }} primaryAction={!draft && !existing?.acceptedAt ? <button type="button" onClick={prepare} className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-violet-300"><ShieldCheck className="h-4 w-4" />Prepare security review</button> : undefined}>
    <PersonaInputSummary feature={feature} consumer="security-researcher" />
    {error && <p role="alert" className="mt-3 flex gap-2 text-xs text-rose-200"><CircleAlert className="h-4 w-4" />{error}</p>}
    {draft && <div className="mt-4 space-y-3 rounded-xl border border-violet-400/30 bg-zinc-950/45 p-4"><label className="grid gap-1 text-xs font-bold text-zinc-200">Security boundary<textarea value={draft.securityBoundary} onChange={(event) => setDraft({ ...draft, securityBoundary: event.target.value })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label><label className="grid gap-1 text-xs font-bold text-zinc-200">Required controls <span className="font-normal text-zinc-400">One per line</span><textarea value={draft.requiredControls.join('\n')} onChange={(event) => setDraft({ ...draft, requiredControls: lines(event.target.value) })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label><label className="grid gap-1 text-xs font-bold text-zinc-200">Verification <span className="font-normal text-zinc-400">One per line</span><textarea value={draft.verification.join('\n')} onChange={(event) => setDraft({ ...draft, verification: lines(event.target.value) })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label><PersonaDraftActions acceptLabel="Prepare security handoff" onAccept={accept} onDiscard={() => setDraft(null)} /></div>}
  </PersonaLifecycleCard>;
}
