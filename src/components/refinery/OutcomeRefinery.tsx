import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileDiff, ImagePlus, LoaderCircle, Sparkles, Square } from 'lucide-react';
import type { FeatureInboxItem, OutcomeRefineryRun, PersonaId, ReferenceImage, SpecKitProject } from '../../types/speckit';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { connectorPreflightProject, configuredConnectorClient, ConnectorJob, startFeatureVisualPreparation, startFeatureVisualVerification } from '../../lib/connector';
import { waitForConnectorJob } from '../../lib/connectorJobPolling';
import { reconcileExecutionActivity, RepositoryExecutionBusyError, startRepositoryExecution } from '../../lib/repositoryExecution';
import { featureImplementationBlocker, featureImplementationWorkspace } from '../../lib/featureWorktree';
import { useSelectedRuntimeAgent } from '../../hooks/useRuntimeAgents';
import { beginOutcomeRefineryRun, blockOutcomeRefineryAutopilotStart, createOutcomeRefineryRun, finishOutcomeRefineryAutopilotAttempt, isOutcomeRefineryExecutionBlocked, OUTCOME_REFINERY_MAX_ATTEMPTS, outcomeRefineryAutopilotPrompt, startOutcomeRefineryAutopilotAttempt, type OutcomeRefineryDraft } from '../../lib/outcomeRefinery';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { consumeOutcomeRefineryMismatch, OUTCOME_REFINERY_MISMATCH_EVENT, prepareStudioGuideImage, requestStudioGuide } from '../../lib/studioGuide';
import { confirmStudioAction } from '../../lib/confirmation';
import { outcomeRefineryAccess } from '../../lib/outcomeRefineryAccess';

interface Props {
  project: SpecKitProject;
  onSave: (featureId: string, run: OutcomeRefineryRun) => void;
  onAttachReferenceImage: (featureId: string, image: ReferenceImage) => void;
  onApplyContract: (featureId: string, run: OutcomeRefineryRun) => void;
  onOpenJourney: () => void;
  actorPersona?: PersonaId;
  onOpenDeveloper: () => void;
}

const fieldClass = 'mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500';

function contractFromFeature(feature?: FeatureInboxItem): OutcomeRefineryDraft {
  return {
    expectedOutcome: feature?.sourceContent?.slice(0, 3_000) || feature?.summary || '',
    deliveredOutcome: '',
  };
}

export function OutcomeRefinery({ project, onSave, onAttachReferenceImage, onApplyContract, onOpenJourney, actorPersona, onOpenDeveloper }: Props) {
  const feature = activeFeatureForProject(project);
  const persisted = feature?.outcomeRefinery;
  const [draft, setDraft] = useState<OutcomeRefineryDraft>(() => persisted ? { expectedOutcome: persisted.expectedOutcome, deliveredOutcome: persisted.deliveredOutcome } : contractFromFeature(feature));
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false);
  const [autopilotStartedAt, setAutopilotStartedAt] = useState<string | null>(null);
  const [stopRequested, setStopRequested] = useState(false);
  const [autopilotError, setAutopilotError] = useState('');
  const [diagnosisNotice, setDiagnosisNotice] = useState('');
  const [iterationNotice, setIterationNotice] = useState('');
  const [autopilotJob, setAutopilotJob] = useState<ConnectorJob | null>(null);
  const cancelRequested = useRef(false);
  const deliveredOutcomeRef = useRef<HTMLTextAreaElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const repairContractRef = useRef<HTMLElement>(null);
  const repairCycleRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDraft(persisted ? { expectedOutcome: persisted.expectedOutcome, deliveredOutcome: persisted.deliveredOutcome } : contractFromFeature(feature)); }, [feature?.id, persisted?.id]);
  const status = persisted?.status || 'idle';
  const blockingFindings = useMemo(() => persisted?.findings.filter((item) => item.requiresDecision) || [], [persisted]);
  const launchBlocked = useMemo(() => persisted?.receipts.some((item) => isOutcomeRefineryExecutionBlocked(item.summary)) || false, [persisted]);
  const availableAgent = useSelectedRuntimeAgent('implementation');

  useEffect(() => {
    const applyMismatch = (value: string) => {
      const mismatch = String(value || '').trim();
      if (!mismatch || !feature) return;
      const next = { expectedOutcome: persisted?.expectedOutcome || draft.expectedOutcome, deliveredOutcome: mismatch };
      setDraft(next);
      onSave(feature.id, createOutcomeRefineryRun(feature, next));
      setDiagnosisNotice('Kit Guide added its screenshot mismatch and refreshed the local repair proposal. Review the contract, then start autopilot when ready.');
    };
    const receiveMismatch = (event: Event) => applyMismatch((event as CustomEvent<string>).detail || consumeOutcomeRefineryMismatch() || '');
    const pending = consumeOutcomeRefineryMismatch();
    if (pending) applyMismatch(pending);
    window.addEventListener(OUTCOME_REFINERY_MISMATCH_EVENT, receiveMismatch);
    return () => window.removeEventListener(OUTCOME_REFINERY_MISMATCH_EVENT, receiveMismatch);
  }, [feature?.id]);

  if (!feature) return <EmptyState onOpenJourney={onOpenJourney} />;

  const access = outcomeRefineryAccess(actorPersona, feature.technicalRole);

  const diagnose = () => {
    try {
      onSave(feature.id, createOutcomeRefineryRun(feature, draft));
      setIterationNotice('');
      setDiagnosisNotice('Diagnosis saved. Your evidence-linked repair proposal is shown below.');
    } catch (error) {
      setDiagnosisNotice(error instanceof Error ? `Studio could not save the diagnosis: ${error.message}` : 'Studio could not save the diagnosis. Refresh and try again.');
    }
  };
  const attachReference = async (file?: File) => {
    if (!file) return;
    try {
      const prepared = await prepareStudioGuideImage(file, 'reference');
      onAttachReferenceImage(feature.id, { alt: prepared.name, url: prepared.dataUrl });
      setAutopilotError('');
    } catch (error) { setAutopilotError(error instanceof Error ? error.message : 'Studio could not attach that reference image.'); }
  };
  const repairWorkspace = featureImplementationWorkspace(feature);
  const repairBlocker = featureImplementationBlocker(project, feature);
  const executionActivity = reconcileExecutionActivity({ durableStatus: status, localRunning: isAutopilotRunning, job: autopilotJob });
  const hasLiveAutopilotJob = executionActivity === 'active';
  const staleRunningRecord = executionActivity === 'interrupted';
  const effectiveStatus = staleRunningRecord ? 'failed' : status;
  const repairCanStart = Boolean(
    persisted
      && blockingFindings.length === 0
      && (effectiveStatus === 'ready-to-run' || effectiveStatus === 'failed')
      && !hasLiveAutopilotJob
      && repairWorkspace
      && !repairBlocker
      && availableAgent
      && access.canExecuteRepair,
  );

  const startBoundedRepair = async () => {
    if (!persisted) return;
    if (!access.canExecuteRepair) {
      setAutopilotError(`${access.actorLabel} can retain the outcome evidence, but a Developer must start a worktree repair.`);
      return;
    }
    if (!repairWorkspace || repairBlocker || !availableAgent) {
      setAutopilotError(repairBlocker || (!availableAgent ? 'Scan Connected Workspace and install a compatible local implementation agent before starting autopilot.' : 'A linked feature worktree is required.'));
      return;
    }
    if (!await confirmStudioAction({ title: `Start Outcome Refinery with ${availableAgent.label}?`, description: `It may edit only the linked feature worktree, runs at most ${OUTCOME_REFINERY_MAX_ATTEMPTS} repair attempts, never commits or pushes, and never approves handoff.`, confirmLabel: 'Start Outcome Refinery', tone: 'caution' })) return;
    cancelRequested.current = false;
    setIterationNotice('');
    setStopRequested(false);
    setAutopilotStartedAt(new Date().toISOString());
    setIsAutopilotRunning(true); setAutopilotError(''); setAutopilotJob(null);
    const requiresVisualAcceptance = /## Visual acceptance/i.test(persisted.contractMarkdown || '');
    if (requiresVisualAcceptance) {
      try {
        const client = configuredConnectorClient();
        let preparation = await startRepositoryExecution(client, repairWorkspace, () => startFeatureVisualPreparation(repairWorkspace));
        setAutopilotJob(preparation);
        preparation = await waitForConnectorJob(preparation, client, setAutopilotJob);
        if (!preparation.ok) {
          setAutopilotError(`Visual verification setup could not be prepared. No repair attempt was consumed. ${preparation.output.slice(-1_200) || 'Review the declared package dependencies and retry.'}`);
          setIsAutopilotRunning(false);
          setAutopilotJob(null);
          return;
        }
      } catch (error) {
        const summary = error instanceof Error ? error.message : 'Studio could not prepare visual verification dependencies.';
        setAutopilotError(`Visual verification setup could not be prepared. No repair attempt was consumed. ${summary}`);
        setIsAutopilotRunning(false);
        setAutopilotJob(null);
        return;
      }
    }
    const executeAttempt = async (candidate: OutcomeRefineryRun, priorFailure?: string): Promise<void> => {
      const started = candidate.status === 'running' ? candidate : beginOutcomeRefineryRun(candidate);
      if (started.status !== 'running') { onSave(feature.id, started); return; }
      const run = startOutcomeRefineryAutopilotAttempt(started, availableAgent.id);
      onSave(feature.id, run);
      if (cancelRequested.current) {
        onSave(feature.id, finishOutcomeRefineryAutopilotAttempt(run, { status: 'stopped', summary: 'Stopped by the user before the local process began. No automatic retry was started.' }));
        return;
      }
      try {
        const client = configuredConnectorClient();
        let agentJob = await startRepositoryExecution(client, repairWorkspace, () => client.startLocalAgentTask(repairWorkspace, availableAgent.id, 'T900', feature.title, outcomeRefineryAutopilotPrompt(feature, started, priorFailure), connectorPreflightProject(project, feature.id), feature.id));
        setAutopilotJob(agentJob);
        if (cancelRequested.current && agentJob.status === 'running') {
          agentJob = await client.cancelJob(agentJob.id);
          setAutopilotJob(agentJob);
        }
        agentJob = await waitForConnectorJob(agentJob, client, setAutopilotJob);
        if (!agentJob.ok) {
          const summary = cancelRequested.current ? 'Stopped by the user. No automatic retry was started.' : agentJob.output.slice(-4_000) || 'The repair agent failed before returning evidence.';
          if (!cancelRequested.current && isOutcomeRefineryExecutionBlocked(summary)) {
            const blocked = blockOutcomeRefineryAutopilotStart(run, summary);
            onSave(feature.id, blocked);
            setAutopilotError(blocked.stopReason || summary);
            return;
          }
          const failed = finishOutcomeRefineryAutopilotAttempt(run, { status: cancelRequested.current ? 'stopped' : 'agent-failed', agentJobId: agentJob.id, changedFiles: agentJob.evidence?.changedFiles, summary });
          onSave(feature.id, failed);
          if (!cancelRequested.current && !isOutcomeRefineryExecutionBlocked(summary) && failed.attemptCount < OUTCOME_REFINERY_MAX_ATTEMPTS) await executeAttempt(failed, failed.stopReason);
          return;
        }
        let verification = await startRepositoryExecution(client, repairWorkspace, () => client.startFeatureVerification(repairWorkspace));
        setAutopilotJob(verification);
        verification = await waitForConnectorJob(verification, client, setAutopilotJob);
        if (!verification.ok) {
          const failed = finishOutcomeRefineryAutopilotAttempt(run, { status: cancelRequested.current ? 'stopped' : 'verification-failed', agentJobId: agentJob.id, verificationJobId: verification.id, changedFiles: agentJob.evidence?.changedFiles, summary: cancelRequested.current ? 'Stopped by the user. No automatic retry was started.' : verification.output.slice(-4_000) || 'Repository verification failed.' });
          onSave(feature.id, failed);
          if (!cancelRequested.current && !isOutcomeRefineryExecutionBlocked(failed.stopReason) && failed.attemptCount < OUTCOME_REFINERY_MAX_ATTEMPTS) await executeAttempt(failed, failed.stopReason);
          return;
        }
        if (/## Visual acceptance/i.test(run.contractMarkdown || '')) {
          let visualVerification = await startRepositoryExecution(client, repairWorkspace, () => startFeatureVisualVerification(repairWorkspace, { expectedOutcome: run.expectedOutcome, referenceImages: feature.referenceImages }));
          setAutopilotJob(visualVerification);
          visualVerification = await waitForConnectorJob(visualVerification, client, setAutopilotJob);
          if (!visualVerification.ok) {
            const failed = finishOutcomeRefineryAutopilotAttempt(run, { status: cancelRequested.current ? 'stopped' : 'visual-verification-failed', agentJobId: agentJob.id, verificationJobId: verification.id, visualVerificationJobId: visualVerification.id, changedFiles: agentJob.evidence?.changedFiles, summary: cancelRequested.current ? 'Stopped by the user. No automatic retry was started.' : visualVerification.output.slice(-4_000) || 'Visual acceptance verification failed.' });
            onSave(feature.id, failed);
            if (!cancelRequested.current && !isOutcomeRefineryExecutionBlocked(failed.stopReason) && failed.attemptCount < OUTCOME_REFINERY_MAX_ATTEMPTS) await executeAttempt(failed, failed.stopReason);
            return;
          }
          onSave(feature.id, finishOutcomeRefineryAutopilotAttempt(run, { status: 'evidence-ready', agentJobId: agentJob.id, verificationJobId: verification.id, visualVerificationJobId: visualVerification.id, changedFiles: agentJob.evidence?.changedFiles, summary: 'Repair agent completed. Repository and declared desktop/narrow visual acceptance verification passed; final human handoff approval remains deliberate.' }));
          return;
        }
        onSave(feature.id, finishOutcomeRefineryAutopilotAttempt(run, { status: 'evidence-ready', agentJobId: agentJob.id, verificationJobId: verification.id, changedFiles: agentJob.evidence?.changedFiles, summary: 'Repair agent completed and repository verification passed. Final human handoff approval remains deliberate.' }));
      } catch (error) {
        const summary = error instanceof Error ? error.message : 'Studio could not start the bounded repair.';
        if (!cancelRequested.current && isOutcomeRefineryExecutionBlocked(summary)) {
          if (error instanceof RepositoryExecutionBusyError) {
            setAutopilotJob(error.job);
            setAutopilotStartedAt(null);
          }
          const blocked = blockOutcomeRefineryAutopilotStart(run, summary);
          onSave(feature.id, blocked);
          setAutopilotError(blocked.stopReason || summary);
          return;
        }
        const failed = finishOutcomeRefineryAutopilotAttempt(run, { status: cancelRequested.current ? 'stopped' : 'agent-failed', summary: cancelRequested.current ? 'Stopped by the user. No automatic retry was started.' : summary });
        onSave(feature.id, failed);
        if (!cancelRequested.current && !isOutcomeRefineryExecutionBlocked(summary) && failed.attemptCount < OUTCOME_REFINERY_MAX_ATTEMPTS) await executeAttempt(failed, summary);
      }
    };
    const begun = beginOutcomeRefineryRun(persisted);
    // Retain the contract and invalidate downstream approvals before any agent
    // receives it. The worktree remains the only write boundary.
    onApplyContract(feature.id, begun);
    await executeAttempt(begun);
    setIsAutopilotRunning(false);
    setStopRequested(false);
  };
  const stopAutopilot = async () => {
    cancelRequested.current = true;
    setStopRequested(true);
    if (!autopilotJob || autopilotJob.status !== 'running') return;
    try { setAutopilotJob(await configuredConnectorClient().cancelJob(autopilotJob.id)); }
    catch (error) { setAutopilotError(error instanceof Error ? error.message : 'Studio could not stop the active autopilot job.'); }
  };
  const clearBlockedLaunch = () => {
    onSave(feature.id, createOutcomeRefineryRun(feature, draft));
    setAutopilotJob(null);
    setAutopilotStartedAt(null);
    setAutopilotError('Blocked launch cleared. Studio will check worktree availability before it starts a new run.');
  };
  const beginAnotherRepairIteration = () => {
    if (isAutopilotRunning || autopilotJob?.status === 'running') return;
    onSave(feature.id, createOutcomeRefineryRun(feature, draft));
    setAutopilotJob(null);
    setAutopilotStartedAt(null);
    setAutopilotError('');
    setIterationNotice('New iteration ready. Your feature scope, reference, and mismatch were retained. Your next action is Start bounded repair below.');
    window.requestAnimationFrame(() => {
      repairCycleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      repairCycleRef.current?.focus();
    });
  };
  const focusMismatch = () => {
    deliveredOutcomeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    deliveredOutcomeRef.current?.focus();
  };
  const showRepairContract = () => repairContractRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return <div className="mx-auto max-w-6xl space-y-6 pb-12">
    <section className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-white to-violet-500/5 p-6 shadow-sm dark:via-zinc-900 dark:to-zinc-900/60">
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300"><Sparkles className="h-4 w-4" />Outcome Refinery · feature in focus</div><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-zinc-50">{feature.title}</h1><p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-zinc-300">Turn a visible outcome gap into a bounded repair contract. Studio preserves the evidence, edits only the linked feature worktree, and leaves approval to you.</p></div><StatusPill status={effectiveStatus} /></div>
      <p className="mt-4 text-xs text-slate-600 dark:text-zinc-300">Local diagnosis first · up to {OUTCOME_REFINERY_MAX_ATTEMPTS} repair attempts · no commit, push, or automatic handoff approval</p>
    </section>
    <OutcomeRefineryAccessNotice access={access} onOpenDeveloper={onOpenDeveloper} />
    <div ref={repairCycleRef} tabIndex={-1} className="scroll-mt-6 outline-none">
    <RepairCycle
      status={effectiveStatus}
      hasMismatch={Boolean(draft.deliveredOutcome.trim())}
      canStart={repairCanStart}
      canExecuteRepair={access.canExecuteRepair}
      executionGuidance={access.executionGuidance}
      onDiagnose={diagnose}
      onFocusMismatch={focusMismatch}
      onStart={() => void startBoundedRepair()}
      onShowProgress={showRepairContract}
      onOpenJourney={onOpenJourney}
      onOpenDeveloper={onOpenDeveloper}
      onOpenGuide={() => requestStudioGuide('Compare the expected reference screen and the current worktree screen. Attach both screenshots, analyze the visible mismatch, then use the generated Delivered outcome in Outcome Refinery.')}
      onRestart={persisted && !hasLiveAutopilotJob ? beginAnotherRepairIteration : undefined}
    />
    {iterationNotice && <p role="status" className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-50 p-3 text-sm font-medium text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-50">{iterationNotice}</p>}
    </div>

    <section className="grid gap-5 lg:grid-cols-2">
      <label className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100"><ClipboardCheck className="h-4 w-4 text-cyan-600" />Expected outcome</span><span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">Describe the screen, behavior, data, grouping, theme, and acceptance criteria that must be true.</span><textarea className={fieldClass} value={draft.expectedOutcome} onChange={(event) => setDraft((value) => ({ ...value, expectedOutcome: event.target.value }))} maxLength={8_000} placeholder="Example: Render six named infrastructure groups with category totals and leading service counts; preserve Tenant Compass hierarchy and show No Source for absent data." /></label>
      <label className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-zinc-100"><FileDiff className="h-4 w-4 text-rose-600" />Delivered outcome</span><span className="mt-1 block text-xs text-slate-500 dark:text-zinc-400">State the observable mismatch. Kit Guide can also analyze a reference and current screenshot pair.</span><textarea ref={deliveredOutcomeRef} className={fieldClass} value={draft.deliveredOutcome} onChange={(event) => setDraft((value) => ({ ...value, deliveredOutcome: event.target.value }))} maxLength={8_000} placeholder="Example: The implementation renders an ungrouped raw asset list, omits components and counts, and uses generic cards instead of the existing theme." /></label>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Reference image</h2><p className="mt-1 text-xs text-slate-600 dark:text-zinc-300">Upload the expected screen. Studio creates a compact local copy and passes it to the visual gate; it is never copied into your worktree.</p></div><button type="button" onClick={() => referenceInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 px-4 py-2.5 text-sm font-bold text-cyan-800 hover:bg-cyan-50 dark:text-cyan-100"><ImagePlus className="h-4 w-4" />Upload reference</button><input ref={referenceInputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { void attachReference(event.target.files?.[0]); event.currentTarget.value = ''; }} /></div>{feature.referenceImages?.length ? <div className="mt-4 flex flex-wrap gap-3">{feature.referenceImages.map((image) => <figure key={image.url} className="max-w-40"><img src={image.url} alt={image.alt} className="h-20 w-36 rounded-lg border border-slate-200 object-cover" /><figcaption className="mt-1 truncate text-xs text-slate-600 dark:text-zinc-300">{image.alt}</figcaption></figure>)}</div> : <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">No reference image attached yet. Upload the screenshot before running a visual repair.</p>}</section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">1. Diagnose the gap</h2><p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">This creates a local, evidence-backed repair proposal. It does not call an agent or change a file.</p></div><button type="button" onClick={diagnose} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"><Sparkles className="h-4 w-4" />Diagnose outcome</button></div>{diagnosisNotice && <p role="status" className="mt-3 rounded-lg border border-cyan-300 bg-cyan-50 p-3 text-sm text-cyan-950 dark:border-cyan-400/35 dark:bg-cyan-500/10 dark:text-cyan-50">{diagnosisNotice}</p>}</section>

    {persisted && <>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><div className="border-b border-slate-200 p-5 dark:border-zinc-800"><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">2. Evidence-linked repair proposal</h2><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Observed findings are safe to automate; inferred and unknown findings are clearly labeled.</p></div><ul className="divide-y divide-slate-100 dark:divide-zinc-800">{persisted.findings.map((item) => <li key={item.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{item.title}</h3><ConfidenceBadge value={item.confidence} /></div><p className="mt-2 text-sm text-slate-600 dark:text-zinc-300"><strong>Evidence:</strong> {item.evidence}</p><p className="mt-2 text-sm text-slate-700 dark:text-zinc-200"><strong>Repair:</strong> {item.repair}</p></div>{item.requiresDecision && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-200"><AlertTriangle className="h-3.5 w-3.5" />Decision needed</span>}</div></li>)}</ul></section>
      <section ref={repairContractRef} className="rounded-2xl border border-cyan-400/35 bg-cyan-500/5 p-5"><div><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Repair contract and evidence</h2><p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-zinc-300">The next action above is the only way to start a repair. If you choose it, Studio runs this contract in the linked worktree, then verifies repository and declared visual acceptance. A passing unit test is never treated as visual acceptance.</p></div>
        {(isAutopilotRunning || autopilotJob) && <AutopilotControlCenter job={autopilotJob} startedAt={autopilotStartedAt} stopRequested={stopRequested} onStop={() => void stopAutopilot()} />}
        <details className="mt-4 rounded-xl border border-slate-300 bg-white dark:border-zinc-700 dark:bg-zinc-950/40"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-cyan-900 dark:text-cyan-100">Review the binding contract <span className="ml-1 text-xs font-normal text-slate-600 dark:text-zinc-300">Optional detail before repair</span></summary><div data-outcome-contract role="document" aria-label="Binding repair contract" style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text)' }} className="max-h-80 overflow-auto whitespace-pre-wrap break-words border-t border-slate-300 p-4 font-mono text-sm leading-6 shadow-inner dark:border-zinc-700">{persisted.contractMarkdown}</div></details>{autopilotError && <p role="alert" className="mt-4 rounded-lg border border-rose-400/35 bg-rose-500/10 p-3 text-sm text-rose-900 dark:text-rose-100">{autopilotError}</p>}{launchBlocked && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-500/10 p-3"><p className="text-sm text-amber-900 dark:text-amber-100"><AlertTriangle className="mr-1 inline h-4 w-4" />This run was blocked before a repair began. It should not count against your repair budget.</p><button type="button" onClick={clearBlockedLaunch} className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-100">Clear blocked launch</button></div>}{autopilotJob?.evidence?.visual && <section aria-label="Retained visual evidence" className="mt-4 rounded-xl border border-emerald-400/35 bg-emerald-50 p-4 text-sm text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-50"><h3 className="font-bold">Visual evidence retained</h3><p className="mt-1 text-xs">{autopilotJob.evidence.visual.tool} checked {autopilotJob.evidence.visual.target} against the attached reference at both required viewports.</p><ul className="mt-3 grid gap-2 sm:grid-cols-2">{autopilotJob.evidence.visual.artifacts.map((artifact) => <li key={artifact.name} className="rounded-lg border border-emerald-300/50 bg-white/70 px-3 py-2 text-xs dark:bg-zinc-950/40"><strong className="capitalize">{artifact.name}</strong> · {artifact.bytes.toLocaleString()} bytes · mismatch {artifact.mismatchRatio}</li>)}</ul></section>}{status === 'needs-decision' && !launchBlocked && <p className="mt-4 rounded-lg border border-amber-400/35 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">{persisted.stopReason} Update the outcome above, then diagnose again. Studio will not guess.</p>}{status === 'verifying' && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3"><p className="text-sm text-amber-900 dark:text-amber-100"><AlertTriangle className="mr-1 inline h-4 w-4" />Configured automated gates have passed. Review the retained evidence and make the final human handoff decision.</p><button type="button" onClick={onOpenJourney} className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-100">Open Feature Journey</button></div>}</section>
      <RunHistory run={persisted} />
    </>}
  </div>;
}

function EmptyState({ onOpenJourney }: { onOpenJourney: () => void }) { return <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><h1 className="text-xl font-bold text-slate-900 dark:text-zinc-100">Start with a feature</h1><p className="mx-auto mt-2 max-w-xl text-sm text-slate-600 dark:text-zinc-300">Outcome Refinery repairs a selected feature or user story. Import or select one first so Studio can preserve its evidence, contract, and worktree boundaries.</p><button type="button" onClick={onOpenJourney} className="mt-5 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950">Open Feature Journey</button></div>; }
function OutcomeRefineryAccessNotice({ access, onOpenDeveloper }: { access: ReturnType<typeof outcomeRefineryAccess>; onOpenDeveloper: () => void }) {
  if (access.canExecuteRepair) return null;
  return <section aria-label="Outcome Refinery role access" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-400/30 bg-violet-500/5 px-4 py-3">
    <p className="text-sm text-slate-700 dark:text-zinc-200"><strong className="text-violet-800 dark:text-violet-200">{access.actorLabel}:</strong> {access.executionGuidance} Final approval remains in Feature Journey.</p>
    <button type="button" onClick={onOpenDeveloper} className="shrink-0 rounded-lg border border-violet-400/45 px-3 py-2 text-xs font-bold text-violet-800 hover:bg-violet-50 dark:text-violet-200 dark:hover:bg-violet-500/10">Open Developer workspace</button>
  </section>;
}

function RepairCycle({ status, hasMismatch, canStart, canExecuteRepair, executionGuidance, onDiagnose, onFocusMismatch, onStart, onShowProgress, onOpenJourney, onOpenDeveloper, onOpenGuide, onRestart }: {
  status: string;
  hasMismatch: boolean;
  canStart: boolean;
  canExecuteRepair: boolean;
  executionGuidance: string;
  onDiagnose: () => void;
  onFocusMismatch: () => void;
  onStart: () => void;
  onShowProgress: () => void;
  onOpenJourney: () => void;
  onOpenDeveloper: () => void;
  onOpenGuide: () => void;
  onRestart?: () => void;
}) {
  const complete = status === 'verifying' || status === 'repaired';
  const next = status === 'needs-decision'
    ? { title: 'Describe the mismatch', detail: 'Studio needs an observable difference before it can make a safe repair contract.', action: onFocusMismatch }
    : status === 'running'
      ? { title: 'View live repair status', detail: 'Autopilot is active in the linked worktree. Its current phase and safe stop control are below.', action: onShowProgress }
      : complete
        ? { title: 'Review final handoff', detail: 'Automated evidence is retained. Feature Journey is the single place for the deliberate human decision.', action: onOpenJourney }
        : !canExecuteRepair && hasMismatch
          ? { title: 'Hand repair to a Developer', detail: executionGuidance, action: onOpenDeveloper }
        : canStart
          ? { title: 'Start bounded repair', detail: 'The contract is ready. Studio will repair only the linked worktree, then verify the result.', action: onStart }
          : hasMismatch
            ? { title: 'Diagnose this mismatch', detail: 'Refresh the local proposal so the latest observed gap becomes the binding repair contract.', action: onDiagnose }
            : { title: 'Compare the screens', detail: 'Use Kit Guide to turn a reference/current screen comparison into a concise repairable mismatch.', action: onOpenGuide };
  return <section aria-label="Repair cycle" className="rounded-2xl border border-cyan-400/35 bg-cyan-500/5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-800 dark:text-cyan-200">Your one next action</p><h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-zinc-50">{next.title}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700 dark:text-zinc-300">{next.detail}</p><p className="mt-3 text-xs text-slate-600 dark:text-zinc-400">Compare → diagnose → repair → verify. Studio keeps the proof with this feature.</p></div><div className="flex shrink-0 flex-col gap-2"><button type="button" onClick={next.action} className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400">{next.title}</button>{onRestart && <button type="button" onClick={onRestart} className="rounded-xl border border-cyan-500/45 px-3 py-2 text-xs font-bold text-cyan-800 hover:bg-cyan-50 dark:text-cyan-100">Prepare another iteration</button>}</div></div>
    <details className="mt-4 border-t border-cyan-400/20 pt-3"><summary className="cursor-pointer text-xs font-bold text-cyan-800 dark:text-cyan-200">How the repair stays safe</summary><p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-zinc-300">Kit Guide can help capture the observed mismatch. Autopilot changes only the linked worktree, then runs repository and declared visual checks; it never commits, pushes, or approves the handoff.</p></details>
  </section>;
}
function ConfidenceBadge({ value }: { value: string }) { const styles: Record<string, string> = { observed: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200', inferred: 'bg-cyan-500/10 text-cyan-800 dark:text-cyan-200', unknown: 'bg-amber-500/10 text-amber-800 dark:text-amber-200' }; return <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${styles[value] || styles.unknown}`}>{value}</span>; }
function StatusPill({ status }: { status: string }) { const labels: Record<string, string> = { idle: 'Ready to diagnose', diagnosed: 'Diagnosed', 'ready-to-run': 'Repair ready', running: 'Repair running', verifying: 'Verifying', repaired: 'Contract retained', 'needs-decision': 'Decision needed', failed: 'Retry available' }; return <span className="rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-900 dark:border-cyan-400/35 dark:bg-cyan-500/10 dark:text-cyan-100">{labels[status] || status}</span>; }
function AutopilotControlCenter({ job, startedAt, stopRequested, onStop }: { job: ConnectorJob | null; startedAt: string | null; stopRequested: boolean; onStop: () => void }) {
  const [now, setNow] = useState(Date.now());
  const existingRun = !startedAt && Boolean(job);
  const running = !stopRequested && (!job || job.status === 'running');
  useEffect(() => {
    if (!running) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [running]);
  const elapsed = startedAt ? Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1_000)) : 0;
  const elapsedLabel = elapsed >= 60 ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s` : `${elapsed}s`;
  const phase = !job ? 'Starting secure local session' : /visual/i.test(job.label) ? 'Comparing desktop and mobile screenshots' : /verif/i.test(job.label) ? 'Running repository verification' : 'Repairing the linked worktree';
  const steps = ['Repair', 'Verify', 'Visual check'];
  const activeStep = !job ? 0 : /visual/i.test(job.label) ? 2 : /verif/i.test(job.label) ? 1 : 0;
  return <section aria-live="polite" aria-label="Autopilot control center" className="mt-5 rounded-2xl border border-cyan-400/45 bg-white/90 p-4 shadow-sm dark:bg-zinc-950/70">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 gap-3"><span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-200">{running && <span className="absolute inset-0 animate-ping rounded-xl bg-cyan-400/25" />}{running ? <LoaderCircle className="relative h-5 w-5 animate-spin" /> : stopRequested ? <Square className="h-4 w-4" /> : <CheckCircle2 className="h-5 w-5" />}</span><div><p className="text-sm font-bold text-slate-900 dark:text-zinc-100">{stopRequested ? 'Stopping autopilot safely…' : existingRun ? 'Another Studio run is using this worktree' : running ? 'Autopilot is working in the linked worktree' : 'Autopilot result is ready'}</p><p className="mt-1 text-xs text-slate-600 dark:text-zinc-300">{stopRequested ? 'Studio will stop the current local process and will not start another retry.' : existingRun ? `${phase} · Job ${job?.id.slice(-6)} · started ${job ? new Date(job.startedAt).toLocaleTimeString() : 'recently'}` : running ? `${phase} · ${job ? `Job ${job.id.slice(-6)}` : 'Preparing job'} · ${elapsedLabel} elapsed` : 'The run finished. Review the retained evidence below before continuing.'}</p></div></div>
      {running && <button type="button" onClick={onStop} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/50 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-800 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-100"><Square className="h-3.5 w-3.5" />{existingRun ? 'Stop existing run' : 'Stop autopilot'}</button>}
    </div>
    {running && <><ol className="mt-4 grid gap-2 sm:grid-cols-3">{steps.map((step, index) => <li key={step} className={`rounded-lg px-3 py-2 text-xs font-bold ${index < activeStep ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200' : index === activeStep ? 'bg-cyan-500/15 text-cyan-900 dark:text-cyan-100' : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>{index < activeStep ? '✓ ' : index === activeStep ? '● ' : '○ '}{step}</li>)}</ol><p className="mt-3 text-[11px] text-slate-600 dark:text-zinc-300">You can stay here, scroll elsewhere, or leave this page. Studio keeps this run active, blocks conflicting runs, and retains the result for review.</p></>}
    {job && <AgentJobStatus job={job} operationLabel="Outcome Refinery autopilot" preparingLabel="Outcome Refinery is repairing the linked worktree…" />}
  </section>;
}
function RunHistory({ run }: { run: OutcomeRefineryRun }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60"><h2 className="text-base font-bold text-slate-900 dark:text-zinc-100">Run history</h2><p className="mt-1 text-xs text-slate-500 dark:text-zinc-400">Attempt {run.attemptCount}/{OUTCOME_REFINERY_MAX_ATTEMPTS} · retained with the feature · no hidden retries</p><ol className="mt-4 space-y-3">{run.receipts.map((item) => <li key={item.id} className="flex gap-3 text-sm"><span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${item.outcome === 'succeeded' ? 'bg-emerald-500/15 text-emerald-700' : 'bg-amber-500/15 text-amber-700'}`}>{item.outcome === 'succeeded' ? '✓' : '!'}</span><div><strong className="capitalize text-slate-800 dark:text-zinc-100">{item.step.replace('-', ' ')}</strong><p className="text-slate-600 dark:text-zinc-300">{item.summary}</p></div></li>)}</ol></section>; }
