import { useEffect, useState } from 'react';
import { CheckCircle2, CircleAlert, Play } from 'lucide-react';
import { configuredConnectorClient } from '../../lib/connector';
import { refreshRuntimeAgentAvailability, selectedRuntimeAgent } from '../../lib/runtimeAgents';
import { localAgentLabel } from '../../lib/agentAvailability';
import { PersonaDecisionReceipt, ProductOutcomePackage, SpecKitProject } from '../../types/speckit';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { createProductOutcomeDraft, productManagerArtifactAdapter, productManagerPrompt } from '../../lib/personas/productManagerArtifacts';
import { productManagerRecommendation } from '../../lib/personas/productManagerPolicy';
import { engineProjectionIssue } from '../../lib/personas/specKitProjection';
import { PersonaLifecycleCard } from './PersonaLifecycleCard';
import { PersonaInputSummary } from './PersonaInputSummary';
import { PersonaDraftActions } from './PersonaDraftActions';
import { PersonaAgentOption } from './PersonaAgentOption';

interface Props {
  project: SpecKitProject;
  onSaveOutcome: (featureId: string, outcome: ProductOutcomePackage) => void;
  onSaveDecision: (featureId: string, decision: PersonaDecisionReceipt) => void;
  onOpenJourney: () => void;
  onOpenFeatureReview: () => void;
  onReopenPlanning?: () => void;
}

function OutcomeSummary({ outcome }: { outcome: ProductOutcomePackage }) {
  return <div className="mt-4 grid gap-3 md:grid-cols-2">
    <article className="rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">Outcome</p><p className="mt-1 text-sm font-semibold text-zinc-100">{outcome.desiredOutcome}</p><p className="mt-2 text-xs leading-relaxed text-zinc-300">{outcome.problem}</p></article>
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Acceptance anchors</p><ul className="mt-2 space-y-1 text-xs text-zinc-200">{outcome.acceptanceAnchors.length ? outcome.acceptanceAnchors.map((anchor) => <li key={anchor.id}><span className="mr-1 font-mono text-cyan-200">{anchor.id}</span>{anchor.statement}</li>) : <li>No acceptance anchors were recorded.</li>}</ul></article>
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Scope boundaries</p><ul className="mt-2 space-y-1 text-xs text-zinc-200">{outcome.nonGoals.length ? outcome.nonGoals.map((item) => <li key={item}>• {item}</li>) : <li>No non-goals were recorded.</li>}</ul></article>
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">Developer handoff</p><p className="mt-2 text-xs leading-relaxed text-zinc-300">Approved outcome, boundaries, acceptance anchors, success measures, and open decisions will be included automatically in impact and architecture planning.</p></article>
  </div>;
}

/** Product Manager is a reusable persona surface: read-only preparation,
 * human review, durable feature-owned evidence, and no hidden configuration. */
export function ProductManagerPanel({ project, onSaveOutcome, onSaveDecision, onOpenJourney, onOpenFeatureReview, onReopenPlanning }: Props) {
  const feature = activeFeatureForProject(project);
  const recommendation = productManagerRecommendation(feature);
  const [agent, setAgent] = useState(() => selectedRuntimeAgent('planning'));
  const [isAgentDrafting, setIsAgentDrafting] = useState(false);
  const [draft, setDraft] = useState<ProductOutcomePackage | null>(null);
  const [error, setError] = useState('');
  const [skipOpen, setSkipOpen] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const planningWasApproved = Boolean(project.journey?.completedStages.some((stageId) => stageId >= 4));

  useEffect(() => {
    let cancelled = false;
    void refreshRuntimeAgentAvailability().then((scan) => {
      if (!cancelled) setAgent(selectedRuntimeAgent('planning', scan));
    }).catch(() => { /* The deterministic local draft remains available. */ });
    return () => { cancelled = true; };
  }, []);

  if (!feature || recommendation.engagement === 'not-applicable') return null;
  // A structured import already has a reviewable delivery source. Product
  // discovery may still add value, but it must not distract from the shared
  // Journey that now owns the next required action.
  const deliveryIsReadyForJourney = feature.userStoryIds.length > 0 && feature.requirementIds.length > 0;
  const prepareLocally = () => {
    setError(''); setDraft(null);
    // Product discovery is workspace-optional. This path is intentionally
    // deterministic, instant, and never asks a PM to configure an agent.
    setDraft(createProductOutcomeDraft(feature.title, feature.summary, `studio/${feature.slug || feature.id}/product-brief.md`, new Date().toISOString()));
  };
  const enrichWithAgent = async () => {
    if (!agent) return;
    setError(''); setDraft(null); setIsAgentDrafting(true);
    try {
      const prompt = productManagerPrompt(feature.title, feature.summary);
      const next = await configuredConnectorClient().preparePersonaDraft(agent.id, 'product-manager', prompt);
      const parsed = productManagerArtifactAdapter.parse(next.output, { title: feature.title, path: `studio/${feature.slug || feature.id}/product-brief.md`, now: new Date().toISOString() });
      if (parsed) setDraft(parsed); else setError('The Product Manager draft was not in the required reviewable format. No product evidence was saved.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Studio could not start Product Manager agent enrichment.'); }
    finally { setIsAgentDrafting(false); }
  };
  const accept = () => { if (!draft) return; const issue = engineProjectionIssue(project, feature, draft.specKitProjection); if (issue) { setError(`Engine validation: ${issue}`); return; } onSaveOutcome(feature.id, { ...draft, acceptedAt: new Date().toISOString() }); setDraft(null); };
  const skip = () => { if (!skipReason.trim()) return; onSaveDecision(feature.id, { personaId: 'product-manager', status: 'skipped', reason: skipReason.trim(), recordedAt: new Date().toISOString() }); setSkipOpen(false); };

  const agentAvailable = Boolean(agent);
  const handoffReviewedDelivery = () => {
    onSaveDecision(feature.id, { personaId: 'product-manager', status: 'accepted', reason: 'Reviewed the imported delivery; no additional Product Brief is needed before technical planning.', recordedAt: new Date().toISOString() });
  };
  return <PersonaLifecycleCard label={deliveryIsReadyForJourney ? 'Product Manager review · ready for handoff' : 'Product Manager · Product discovery'} title={recommendation.engagement === 'complete' ? 'Product Brief ready for handoff' : deliveryIsReadyForJourney ? 'Review this delivery before preparing its handoff' : 'Turn this request into a Product Brief'} description={recommendation.engagement === 'complete' ? 'The complete, reviewable delivery package is shown below. It includes the actual feature scope, user stories, requirements, Product Brief, and engine projection.' : deliveryIsReadyForJourney ? 'The imported source is now a structured delivery package. Review or edit its stories and requirements, then prepare the shared handoff. A Product Brief is optional when those details are already clear.' : 'Your job is to make the product decision clear: who benefits, what success means, what is in scope, and what needs a decision before technical planning.'} creates={deliveryIsReadyForJourney ? [] : recommendation.creates} actionBrief={recommendation.engagement === 'complete' ? undefined : deliveryIsReadyForJourney ? { summary: 'Records your Product Manager review and opens the shared handoff screen.', creates: ['A Product Manager handoff decision'], uses: ['The imported source, user stories, and requirements'], doesNot: ['Change code or repository files', 'Start an engineering stage'], next: 'Review the full handoff contents, then explicitly send them to Developer / Architect.' } : { summary: 'Creates a Product Brief draft from this feature request.', creates: ['Target users, desired outcome, success measures, scope boundaries, and decisions'], uses: ['Feature title and current summary'], doesNot: ['Connect to or modify a repository', 'Change code or advance the Journey'], next: 'Review the brief, accept it, then hand it to the next role.' }} primaryAction={<>
    {deliveryIsReadyForJourney && <button type="button" onClick={handoffReviewedDelivery} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-cyan-300">Prepare reviewed-delivery handoff</button>}
    {recommendation.engagement === 'recommended' && !deliveryIsReadyForJourney && <button type="button" onClick={prepareLocally} disabled={isAgentDrafting} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-violet-300 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-3.5 w-3.5" />Start Product Brief</button>}
    {recommendation.engagement === 'complete' && <span className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200"><CheckCircle2 className="h-4 w-4" />Approved for developer planning</span>}
  </>}>
    {planningWasApproved && <p className="mt-3 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 text-xs text-amber-100">This is an optional retrospective product brief. It informs future revisions; accepted plans stay unchanged unless you reopen planning.</p>}
    {deliveryIsReadyForJourney && <section className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4"><p className="text-xs font-bold text-cyan-100">Imported delivery package</p><p className="mt-1 text-xs leading-relaxed text-zinc-300">This package contains {feature.userStoryIds.length} user stor{feature.userStoryIds.length === 1 ? 'y' : 'ies'} and {feature.requirementIds.length} requirement{feature.requirementIds.length === 1 ? '' : 's'}. Open it to inspect or edit the retained source before handoff.</p><button type="button" onClick={onOpenFeatureReview} className="mt-3 rounded-lg border border-cyan-400/45 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/10">Review and edit delivery package</button></section>}
    {recommendation.engagement === 'recommended' && !draft && <div className="mt-4 space-y-3">
      {deliveryIsReadyForJourney ? <details className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-3">
        <summary className="cursor-pointer text-xs font-bold text-violet-100">Add a Product Brief before continuing (optional)</summary>
        <p className="mt-3 text-xs leading-relaxed text-zinc-300">Use this only when the imported stories still need a shared product decision: who benefits, how success is measured, or what is explicitly out of scope.</p>
        <div className="mt-3"><button type="button" onClick={prepareLocally} disabled={isAgentDrafting} className="inline-flex items-center gap-2 rounded-lg border border-violet-300/45 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/10 disabled:opacity-50"><Play className="h-3.5 w-3.5" />Create Product Brief</button></div>
        <PersonaAgentOption compact agentLabel={agentAvailable ? localAgentLabel(agent!) : undefined} isRunning={isAgentDrafting} onRun={() => void enrichWithAgent()} description="Ask the agent to create a fuller Product Brief from this delivery source. It does not read or modify the repository." unavailableHint="Start the optional connector on an approved agent host, then make a planning agent available. No repository, clone, development tools, or test run is required for Product Manager drafting." />
      </details> : <>
        <PersonaAgentOption compact agentLabel={agentAvailable ? localAgentLabel(agent!) : undefined} isRunning={isAgentDrafting} onRun={() => void enrichWithAgent()} description="Ask the agent to turn this request into a fuller review draft. It uses only this delivery source, not a repository." unavailableHint="Start the optional connector on an approved agent host, then make a planning agent available. No repository, clone, development tools, or test run is required for Product Manager drafting." />
        <div>
          <button type="button" onClick={() => setSkipOpen((open) => !open)} className="text-xs font-semibold text-violet-200 underline">Continue without a Product Brief</button>
          {skipOpen && <div className="mt-2 flex flex-col gap-2 rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 sm:flex-row"><input value={skipReason} onChange={(event) => setSkipReason(event.target.value)} placeholder="Why existing product evidence is sufficient" className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100" /><button type="button" onClick={skip} disabled={!skipReason.trim()} className="rounded-lg border border-violet-300/40 px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-50">Record decision</button></div>}
        </div>
      </>}
    </div>}
    {isAgentDrafting && <p role="status" className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-xs text-cyan-100">Preparing a repository-free outcome package with {agent ? localAgentLabel(agent) : 'your local agent'}. No source files, tests, or development tools are involved.</p>}
    <PersonaInputSummary feature={feature} consumer="product-manager" />
    {error && <p role="alert" className="mt-3 flex gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100"><CircleAlert className="h-4 w-4 shrink-0" />{error}</p>}
    {draft && <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4"><p className="text-xs font-bold text-emerald-100">Product outcome ready for your decision</p><p className="mt-1 text-xs text-zinc-300">Review this package. Accepting it makes it the approved context for developer planning; it does not change code.</p><OutcomeSummary outcome={draft} /><div className="mt-4"><PersonaDraftActions acceptLabel="Accept product outcome" onAccept={accept} onDiscard={() => { setDraft(null); }} /></div></div>}
    {feature.productOutcome?.acceptedAt && planningWasApproved && onReopenPlanning && <button type="button" onClick={onReopenPlanning} className="mt-4 rounded-lg border border-violet-300/40 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/10">Review product-driven architecture plan</button>}
  </PersonaLifecycleCard>;
}
