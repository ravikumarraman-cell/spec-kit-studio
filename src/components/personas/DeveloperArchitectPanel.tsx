import { useMemo, useState } from 'react';
import { CircleAlert, FileCheck2, HardDrive } from 'lucide-react';
import { DeveloperArchitecturePackage, SpecKitProject, TechnicalRole } from '../../types/speckit';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { deliveryScope, requirementsForDeliveryItem } from '../../lib/deliveryItems';
import { createDeveloperArchitectureDraft, developerArchitectureIssue } from '../../lib/personas/developerArchitectureArtifacts';
import { engineProjectionIssue } from '../../lib/personas/specKitProjection';
import { PersonaLifecycleCard } from './PersonaLifecycleCard';
import { PersonaScopeChooser } from './PersonaScopeChooser';
import { PersonaInputSummary } from './PersonaInputSummary';
import { PersonaDraftActions } from './PersonaDraftActions';
import { featureHandoffContinuation } from '../../lib/personas/handoffContinuation';
import { technicalRoleDefinition } from '../../lib/personas/technicalRoles';
import { TechnicalRoleSelector } from './TechnicalRoleSelector';

interface Props {
  project: SpecKitProject;
  onSave: (featureId: string, artifact: DeveloperArchitecturePackage) => void;
  onImport: (scope: 'feature' | 'user-story') => void;
  onConnectWorkspace: () => void;
  technicalRole: TechnicalRole;
  onTechnicalRoleChange: (role: TechnicalRole) => void;
  onOpenJourney: () => void;
}

const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

/** A deliberately local, component-scoped editor. It has no connector or
 * agent dependency: an Architect can prepare a reviewable handoff everywhere. */
export function DeveloperArchitectPanel({ project, onSave, onImport, onConnectWorkspace, technicalRole, onTechnicalRoleChange, onOpenJourney }: Props) {
  const feature = activeFeatureForProject(project);
  const requirements = useMemo(() => feature ? requirementsForDeliveryItem(project, feature) : [], [project, feature]);
  const [draft, setDraft] = useState<DeveloperArchitecturePackage | null>(null);
  const [error, setError] = useState('');
  const repositoryConnected = Boolean(project.importedRepo?.repoUrl);
  const continuation = feature ? featureHandoffContinuation(feature) : undefined;
  if (!repositoryConnected) return <><TechnicalRoleSelector value={technicalRole} onChange={onTechnicalRoleChange} /><section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-zinc-900 p-6"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{continuation?.creditedStages.length ? 'Resume technical delivery' : 'Step 1 of 3 · Connect and baseline'}</p><h2 className="mt-1 text-xl font-bold text-zinc-100">{continuation?.creditedStages.length ? 'Product definition is already complete' : 'Start with repository evidence'}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">{continuation?.creditedStages.length ? `Studio restored the accepted ${continuation.title} handoff as this feature’s Spec-Kit definition. Do not repeat product discovery: connect the target repository once, then continue at Stage ${continuation.nextEngineeringStage}.` : 'Architectural decisions need a real codebase, detected stack, and a clean baseline—not just a request. Connect the local repository first; Studio will then let you create, import, or choose delivery scope with that evidence in view.'}</p><button type="button" onClick={onConnectWorkspace} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-cyan-300"><HardDrive className="h-4 w-4" />Connect target repository</button><p className="mt-3 text-xs text-zinc-400">Connection is read-only until you explicitly approve a later repository action. No feature, story, source file, or decision is created here.</p></section></>;
  if (!feature) return <PersonaScopeChooser personaLabel="Developer / Architect · Step 2 of 3" title="Choose the delivery scope" description="Repository evidence is connected. Create, import, or select a feature or independently deliverable user story; Studio will preserve that boundary through the Architect/Tech Lead handoff and developer planning." onChoose={onImport} />;
  const scope = deliveryScope(feature);
  const create = () => {
    setError('');
    setDraft(createDeveloperArchitectureDraft(feature.title, feature.summary, scope, requirements.map((requirement) => requirement.id), `studio/${feature.slug || feature.id}/technical-decision.md`, new Date().toISOString()));
  };
  const update = (next: Partial<DeveloperArchitecturePackage>) => setDraft((current) => current ? { ...current, ...next } : current);
  const prepare = () => {
    if (!draft) return;
    const issue = developerArchitectureIssue(draft) || engineProjectionIssue(project, feature, draft.specKitProjection);
    if (issue) { setError(issue); return; }
    onSave(feature.id, { ...draft, acceptedAt: new Date().toISOString() });
    setDraft(null); setError('');
  };
  const existing = feature.developerArchitecture;

  const role = technicalRoleDefinition(technicalRole);
  const stageFourComplete = Boolean(project.journey?.completedStages.includes(4));
  return <><TechnicalRoleSelector value={technicalRole} onChange={onTechnicalRoleChange} /><PersonaLifecycleCard label={role.label} title={existing?.acceptedAt ? (technicalRole === 'architect' ? 'Technical decision accepted — finish the architecture plan' : 'Technical decision ready for delivery planning') : role.title} description={scope === 'user-story' ? 'This decision is strictly limited to the selected user story and its requirements.' : role.summary} creates={technicalRole === 'architect' ? ['Technical decision', 'Architecture plan input', 'Developer handoff'] : ['Versioned technical decision', 'Delivery guardrails', 'Verification evidence']} actionBrief={{ summary: 'Creates a local technical-decision draft for review.', creates: ['Technical decision, guardrails, and developer handoff draft'], uses: ['The selected delivery boundary', 'Connected repository evidence and accepted persona inputs when available'], doesNot: ['Write code or create a branch', 'Approve architecture or implementation'], next: technicalRole === 'architect' ? 'Accept the decision, approve Stage 4 architecture, then publish the developer handoff.' : 'Review, edit, accept, or discard the technical decision.' }} primaryAction={!draft && !existing?.acceptedAt ? <button type="button" onClick={create} className="inline-flex items-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-violet-300"><FileCheck2 className="h-4 w-4" />Prepare technical decision</button> : undefined}>
    <div className="mt-4 grid gap-3 text-xs md:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-zinc-200">Delivery scope</p><p className="mt-1 text-zinc-400">{scope === 'user-story' ? 'One independently deliverable user story' : 'Feature and its selected requirements'}</p></div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-zinc-200">Requirements in context</p><p className="mt-1 text-zinc-400">{requirements.length ? requirements.map((requirement) => requirement.id).join(', ') : 'No mapped requirements yet — capture assumptions clearly.'}</p></div>
    </div>
    <PersonaInputSummary feature={feature} consumer="developer" />
    {error && <p role="alert" className="mt-3 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p>}
    {draft && <div className="mt-4 space-y-4 rounded-xl border border-violet-400/30 bg-zinc-950/45 p-4">
      <p className="text-xs leading-relaxed text-violet-100">Architect/Tech Lead draft. It remains local and advisory until you prepare the developer handoff. It cannot modify code, create a worktree, or authorize delivery.</p>
      <label className="grid gap-1 text-xs font-bold text-zinc-200">Technical outcome<textarea value={draft.outcome} onChange={(event) => update({ outcome: event.target.value })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label>
      <div className="grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-xs font-bold text-zinc-200">Affected area<input value={draft.changeSurface[0]?.area || ''} onChange={(event) => update({ changeSurface: [{ ...(draft.changeSurface[0] || { id: 'CS-1', change: '', confidence: 'assumption' as const }), area: event.target.value }] })} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label><label className="grid gap-1 text-xs font-bold text-zinc-200">Expected change<input value={draft.changeSurface[0]?.change || ''} onChange={(event) => update({ changeSurface: [{ ...(draft.changeSurface[0] || { id: 'CS-1', area: '', confidence: 'assumption' as const }), change: event.target.value }] })} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label></div>
      <label className="grid gap-1 text-xs font-bold text-zinc-200">Chosen approach and rationale<textarea value={draft.rationale} onChange={(event) => update({ rationale: event.target.value })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label>
      <label className="grid gap-1 text-xs font-bold text-zinc-200">Developer guardrails <span className="font-normal text-zinc-400">One per line</span><textarea value={draft.guardrails.join('\n')} onChange={(event) => update({ guardrails: lines(event.target.value) })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label>
      <label className="grid gap-1 text-xs font-bold text-zinc-200">Required verification <span className="font-normal text-zinc-400">One per line</span><textarea value={draft.verification.join('\n')} onChange={(event) => update({ verification: lines(event.target.value) })} rows={3} className="rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-sm font-normal text-zinc-100" /></label>
      <PersonaDraftActions acceptLabel="Prepare developer handoff" onAccept={prepare} onDiscard={() => setDraft(null)} discardLabel="Discard local draft" />
    </div>}
    {existing?.acceptedAt && technicalRole === 'architect' && !stageFourComplete && <section className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4"><p className="text-xs font-bold text-cyan-100">Architect stop point: approve the architecture plan</p><p className="mt-1 text-xs leading-5 text-zinc-300">Your decision is accepted. Complete the remaining shared review stages and approve Stage 4: Design safely. Only then does Studio publish an architecture handoff for a Developer.</p><button type="button" onClick={onOpenJourney} className="mt-3 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-cyan-300">Open the next required Journey stage</button></section>}
  </PersonaLifecycleCard></>;
}
