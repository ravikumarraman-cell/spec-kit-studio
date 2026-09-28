import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Eye, FileDiff, Play, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import type { FeatureInboxItem, OutcomeRefineryRun, SpecKitProject } from '../../types/speckit';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { connectorPreflightProject, configuredConnectorClient, ConnectorJob } from '../../lib/connector';
import { waitForConnectorJob } from '../../lib/connectorJobPolling';
import { featureImplementationBlocker, featureImplementationWorkspace } from '../../lib/featureWorktree';
import { LocalAgentStatus, recommendedLocalAgent } from '../../lib/agentAvailability';
import { beginOutcomeRefineryRun, createOutcomeRefineryRun, finishOutcomeRefineryAutopilotAttempt, OUTCOME_REFINERY_MAX_ATTEMPTS, outcomeRefineryAutopilotPrompt, startOutcomeRefineryAutopilotAttempt, type OutcomeRefineryDraft } from '../../lib/outcomeRefinery';

interface Props {
  project: SpecKitProject;
  onSave: (featureId: string, run: OutcomeRefineryRun) => void;
  onApplyContract: (featureId: string, run: OutcomeRefineryRun) => void;
  onOpenJourney: () => void;
}

const fieldClass = 'mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500';

function contractFromFeature(feature?: FeatureInboxItem): OutcomeRefineryDraft {
  return {
    expectedOutcome: feature?.sourceContent?.slice(0, 3_000) || feature?.summary || '',
    deliveredOutcome: '',
  };
}

export function OutcomeRefinery({ project, onSave, onApplyContract, onOpenJourney }: Props) {
  const feature = activeFeatureForProject(project);
  const persisted = feature?.outcomeRefinery;
  const [draft, setDraft] = useState<OutcomeRefineryDraft>(() => persisted ? { expectedOutcome: persisted.expectedOutcome, deliveredOutcome: persisted.deliveredOutcome } : contractFromFeature(feature));
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false);
  const [autopilotError, setAutopilotError] = useState('');
  const [autopilotJob, setAutopilotJob] = useState<ConnectorJob | null>(null);
  const cancelRequested = useRef(false);

  useEffect(() => { setDraft(persisted ? { expectedOutcome: persisted.expectedOutcome, deliveredOutcome: persisted.deliveredOutcome } : contractFromFeature(feature)); }, [feature?.id, persisted?.id]);
  const status = persisted?.status || 'idle';
  const blockingFindings = useMemo(() => persisted?.findings.filter((item) => item.requiresDecision) || [], [persisted]);
  if (!feature) return <EmptyState onOpenJourney={onOpenJourney} />;

  const diagnose = () => onSave(feature.id, createOutcomeRefineryRun(feature, draft));
  const availableAgent = useMemo(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem('speckit_local_agents') || '[]');
      return recommendedLocalAgent(Array.isArray(parsed) ? parsed as LocalAgentStatus[] : [], 'auto', 'implementation');
    } catch { return undefined; }
  }, []);
  const repairWorkspace = featureImplementationWorkspace(feature);
  const repairBlocker = featureImplementationBlocker(project, feature);

  const startBoundedRepair = async () => {
    if (!persisted) return;
    if (!repairWorkspace || repairBlocker || !availableAgent) {
      setAutopilotError(repairBlocker || (!availableAgent ? 'Scan Connected Workspace and install a compatible local implementation agent before starting autopilot.' : 'A linked feature worktree is required.'));
      return;
    }
    if (!window.confirm(`Start Outcome Refinery autopilot with ${availableAgent.label}? It may edit only the linked feature worktree, runs at most ${OUTCOME_REFINERY_MAX_ATTEMPTS} repair attempts, never commits or pushes, and never approves handoff.`)) return;
    cancelRequested.current = false;
    setIsAutopilotRunning(true); setAutopilotError(''); setAutopilotJob(null);
    const executeAttempt = async (candidate: OutcomeRefineryRun, priorFailure?: string): Promise<void> => {
      const started = candidate.status === 'running' ? candidate : beginOutcomeRefineryRun(candidate);
      if (started.status !== 'running') { onSave(feature.id, started); return; }
      const run = startOutcomeRefineryAutopilotAttempt(started, availableAgent.id);
      onSave(feature.id, run);
      try {
        const client = configuredConnectorClient();
        let agentJob = await client.startLocalAgentTask(repairWorkspace, availableAgent.id, 'T900', feature.title, outcomeRefineryAutopilotPrompt(feature, started, priorFailure), connectorPreflightProject(project, feature.id), feature.id);
        setAutopilotJob(agentJob);
        agentJob = await waitForConnectorJob(agentJob, client, setAutopilotJob);
        if (!agentJob.ok) {
          const failed = finishOutcomeRefineryAutopilotAttempt(run, { status: cancelRequested.current ? 'stopped' : 'agent-failed', agentJobId: agentJob.id, changedFiles: agentJob.evidence?.changedFiles, summary: cancelRequested.current ? 'Stopped by the user. No automatic retry was started.' : agentJob.output.slice(-4_000) || 'The repair agent failed before returning evidence.' });
          onSave(feature.id, failed);
          if (!cancelRequested.current && failed.attemptCount < OUTCOME_REFINERY_MAX_ATTEMPTS) await executeAttempt(failed, failed.stopReason);
          return;
        }
        let verification = await client.startFeatureVerification(repairWorkspace);
        setAutopilotJob(verification);
        verification = await waitForConnectorJob(verification, client, setAutopilotJob);
        if (!verification.ok) {
          const failed = finishOutcomeRefineryAutopilotAttempt(run, { status: cancelRequested.current ? 'stopped' : 'verification-failed', agentJobId: agentJob.id, verificationJobId: verification.id, changedFiles: agentJob.evidence?.changedFiles, summary: cancelRequested.current ? 'Stopped by the user. No automatic retry was started.' : verification.output.slice(-4_000) || 'Repository verification failed.' });
          onSave(feature.id, failed);
          if (!cancelRequested.current && failed.attemptCount < OUTCOME_REFINERY_MAX_ATTEMPTS) await executeAttempt(failed, failed.stopReason);
          return;
        }
        onSave(feature.id, finishOutcomeRefineryAutopilotAttempt(run, { status: 'evidence-ready', agentJobId: agentJob.id, verificationJobId: verification.id, changedFiles: agentJob.evidence?.changedFiles, summary: 'Repair agent completed and repository verification passed. Retain independent visual and outcome evidence before requesting human handoff approval.' }));
      } catch (error) {
        const summary = error instanceof Error ? error.message : 'Studio could not start the bounded repair.';
        const failed = finishOutcomeRefineryAutopilotAttempt(run, { status: cancelRequested.current ? 'stopped' : 'agent-failed', summary: cancelRequested.current ? 'Stopped by the user. No automatic retry was started.' : summary });
        onSave(feature.id, failed);
        if (!cancelRequested.current && failed.attemptCount < OUTCOME_REFINERY_MAX_ATTEMPTS) await executeAttempt(failed, summary);
      }
    };
    const begun = beginOutcomeRefineryRun(persisted);
    // Retain the contract and invalidate downstream approvals before any agent
    // receives it. The worktree remains the only write boundary.
    onApplyContract(feature.id, begun);
    await executeAttempt(begun);
    setIsAutopilotRunning(false);
  };
  const stopAutopilot = async () => {
    cancelRequested.current = true;
    if (!autopilotJob || autopilotJob.status !== 'running') return;
    try { setAutopilotJob(await configuredConnectorClient().cancelJob(autopilotJob.id)); }
    catch (error) { setAutopilotError(error instanceof Error ? error.message : 'Studio could not stop the active autopilot job.'); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 pb-12">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300"><Sparkles className="h-4 w-4" />Outcome Refinery</div><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-zinc-50">Turn a missed outcome into a repeatable repair</h1><p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">Compare expectation with delivery, create a binding source and visual contract, then continue safely in the feature’s isolated workflow. Token-light diagnosis runs locally first.</p></div><StatusPill status={status} /></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3"><Promise icon={<Eye className="h-4 w-4" />} title="Evidence first" text="Every finding links an observed gap to a repair." /><Promise icon={<ShieldCheck className="h-4 w-4" />} title="Feature scoped" text="Never writes the primary checkout or approves a stage." /><Promise icon={<RotateCcw className="h-4 w-4" />} title="Bounded retries" text={`A repair run is capped at ${OUTCOME_REFINERY_MAX_ATTEMPTS} attempts.`} /></div>
    </section>

    <section className="grid gap-5 lg:grid-cols-2">
      <label className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100"><ClipboardCheck className="h-4 w-4 text-cyan-600" />Expected outcome</span><span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">Describe the screen, behavior, data, grouping, theme, and acceptance criteria that must be true.</span><textarea className={fieldClass} value={draft.expectedOutcome} onChange={(event) => setDraft((value) => ({ ...value, expectedOutcome: event.target.value }))} maxLength={8_000} placeholder="Example: Render six named infrastructure groups with category totals and leading service counts; preserve Tenant Compass hierarchy and show No Source for absent data." /></label>
      <label className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100"><FileDiff className="h-4 w-4 text-rose-600" />Delivered outcome</span><span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">State the observable mismatch. Kit Guide can also analyze a reference and current screenshot pair.</span><textarea className={fieldClass} value={draft.deliveredOutcome} onChange={(event) => setDraft((value) => ({ ...value, deliveredOutcome: event.target.value }))} maxLength={8_000} placeholder="Example: The implementation renders an ungrouped raw asset list, omits components and counts, and uses generic cards instead of the existing theme." /></label>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">1. Diagnose the gap</h2><p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">This creates a local, evidence-backed repair proposal. It does not call an agent or change a file.</p></div><button type="button" onClick={diagnose} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"><Sparkles className="h-4 w-4" />Diagnose outcome</button></div></section>

    {persisted && <>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><div className="border-b border-slate-200 p-5 dark:border-zinc-800"><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">2. Evidence-linked repair proposal</h2><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Observed findings are safe to automate; inferred and unknown findings are clearly labeled.</p></div><ul className="divide-y divide-slate-100 dark:divide-zinc-800">{persisted.findings.map((item) => <li key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{item.title}</h3><ConfidenceBadge value={item.confidence} /></div><p className="mt-2 text-sm text-slate-600 dark:text-zinc-300"><strong>Evidence:</strong> {item.evidence}</p><p className="mt-2 text-sm text-slate-700 dark:text-zinc-200"><strong>Repair:</strong> {item.repair}</p></div>{item.requiresDecision && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200"><AlertTriangle className="h-3.5 w-3.5" />Decision needed</span>}</div></li>)}</ul></section>
      <section className="rounded-2xl border border-cyan-400/35 bg-cyan-500/5 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">3. Binding repair contract</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-zinc-300">Autopilot runs this contract in the linked worktree, then retries only a failed agent or repository-verification step. It cannot commit, push, approve, or treat a passing test as visual acceptance.</p></div>{blockingFindings.length === 0 && (status === 'ready-to-run' || status === 'failed') && <button type="button" disabled={isAutopilotRunning} onClick={() => void startBoundedRepair()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"><Play className="h-4 w-4" />{isAutopilotRunning ? 'Autopilot is running…' : `Run bounded autopilot${availableAgent ? ` with ${availableAgent.label}` : ''}`}</button>}{isAutopilotRunning && <button type="button" onClick={() => void stopAutopilot()} className="rounded-xl border border-rose-400/45 px-4 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-500/10 dark:text-rose-200">Stop autopilot</button>}</div><pre className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100 dark:border-zinc-700">{persisted.contractMarkdown}</pre>{autopilotError && <p role="alert" className="mt-4 rounded-lg border border-rose-400/35 bg-rose-500/10 p-3 text-sm text-rose-900 dark:text-rose-100">{autopilotError}</p>}{autopilotJob && <p className="mt-4 rounded-lg border border-cyan-400/30 bg-white/70 p-3 text-xs font-semibold text-slate-700 dark:bg-zinc-950/60 dark:text-zinc-200">Autopilot job: {autopilotJob.label} · {autopilotJob.status}</p>}{status === 'needs-decision' && <p className="mt-4 rounded-lg border border-amber-400/35 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">{persisted.stopReason} Update the outcome above, then diagnose again. Studio will not guess.</p>}{status === 'verifying' && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3"><p className="text-sm text-amber-900 dark:text-amber-100"><AlertTriangle className="mr-1 inline h-4 w-4" />Automated checks are not human acceptance. Retain independent source, responsive, and visual evidence before handoff.</p><button type="button" onClick={onOpenJourney} className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-100">Open Feature Journey</button></div>}</section>
      <RunHistory run={persisted} />
    </>}
  </div>;
}

function EmptyState({ onOpenJourney }: { onOpenJourney: () => void }) { return <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Start with a feature</h1><p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-zinc-300">Outcome Refinery repairs a selected feature or user story. Import or select one first so Studio can preserve its evidence, contract, and worktree boundaries.</p><button type="button" onClick={onOpenJourney} className="mt-5 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950">Open Feature Journey</button></div>; }
function Promise({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"><div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100">{icon}{title}</div><p className="mt-1 text-xs text-slate-700 dark:text-zinc-300">{text}</p></div>; }
function ConfidenceBadge({ value }: { value: string }) { const styles: Record<string, string> = { observed: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200', inferred: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-200', unknown: 'bg-amber-500/10 text-amber-800 dark:text-amber-200' }; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${styles[value] || styles.unknown}`}>{value}</span>; }
function StatusPill({ status }: { status: string }) { const labels: Record<string, string> = { idle: 'Ready to diagnose', diagnosed: 'Diagnosed', 'ready-to-run': 'Repair ready', running: 'Repair running', verifying: 'Verifying', repaired: 'Contract retained', 'needs-decision': 'Decision needed', failed: 'Retry available' }; return <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-900 dark:border-cyan-400/35 dark:bg-cyan-500/10 dark:text-cyan-100">{labels[status] || status}</span>; }
function RunHistory({ run }: { run: OutcomeRefineryRun }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Run history</h2><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Attempt {run.attemptCount}/{OUTCOME_REFINERY_MAX_ATTEMPTS} · retained with the feature · no hidden retries</p><ol className="mt-4 space-y-3">{run.receipts.map((item) => <li key={item.id} className="flex gap-3 text-sm"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.outcome === 'succeeded' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'}`}>{item.outcome === 'succeeded' ? '✓' : '!'}</span><div><strong className="capitalize text-slate-800 dark:text-zinc-100">{item.step.replace('-', ' ')}</strong><p className="text-slate-600 dark:text-zinc-300">{item.summary}</p></div></li>)}</ol></section>; }
