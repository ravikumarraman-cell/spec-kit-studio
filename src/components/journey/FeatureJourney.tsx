import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Play, ShieldCheck } from 'lucide-react';
import { FeatureJourney as JourneyState, SpecKitProject, ViewTab } from '../../types/speckit';
import { activeConnectorJob, configuredConnectorClient, configuredConnectorUrl, connectorPreflightProject, ConnectorJob, SpecKitArtifact } from '../../lib/connector';
import { LocalAgentStatus, localAgentLabel } from '../../lib/agentAvailability';
import { selectedRuntimeAgent } from '../../lib/runtimeAgents';
import { getConnectorSessionToken, setConnectorSessionToken } from '../../lib/connectorSession';
import { activeFeatureForProject, approveJourneyStage, createFeatureJourney, DeliveryPlanMode, engineInstructionForStage, FeatureJourneyStage, featureHasVisualReference, featureJourneyStages, featureIdForEnginePreflight, getJourneyStage, nextFeatureJourneyStage, reopenJourneyStage, repositoryPathForEngineStage, stageRequiresFeatureWorktree } from '../../lib/featureJourney';
import { FeatureInbox } from './FeatureInbox';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { AgentRunLockNotice } from '../common/AgentRunLockNotice';
import { isExpectedFeatureArtifactPath, isFeatureArtifactScoped } from '../../lib/featureArtifactScope';
import { compactDemoPlanIssue, parseFeatureDeliveryTasks, visualDeliveryPlanIssue } from '../../lib/featureDeliveryTasks';
import { JourneyProgress } from './JourneyProgress';
import { FeatureRegistry } from './FeatureRegistry';
import { canStartFeatureIntake, needsLegacyJourneyRepair } from '../../lib/workflowUx';
import { featureArtifactRoot, identityIssues, officialFeatureIdentity } from '../../lib/projectIdentity';
import { readLocalAgentJobReference } from '../../lib/localAgentJobSession';
import { clearConnectorRunReference, readConnectorRunReference, saveConnectorRunReference } from '../../lib/connectorRunSession';
import { deliveryScope } from '../../lib/deliveryItems';
import { DeliveryScopeBanner } from './DeliveryScopeBanner';
import { isCanonicalSpecKitFeatureSlug, officialFeatureDirectoryFromSpecPath, validateSpecKitArtifacts } from '../../lib/specKitCompliance';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';
import { legacyArchitectureSnapshot, officialArtifactFromAgentOutput } from '../../lib/journeyArtifacts';
import { useSerialAsyncInterval } from '../../hooks/useSerialAsyncInterval';
import { retainJourneyAttempt } from '../../lib/journeyObservability';
import { JourneyObservability, JourneyObservabilitySnapshot } from './JourneyObservability';
import { requestStudioGuide } from '../../lib/studioGuide';
import { FeatureArtifactViewer } from '../common/FeatureArtifactViewer';

function selectedAgent(): LocalAgentStatus | undefined { return selectedRuntimeAgent('planning'); }

interface Props {
  project: SpecKitProject;
  onNavigate: (tab: ViewTab) => void;
  onOpenFeatureImport: () => void;
  onSaveJourney: (journey: JourneyState) => void;
  onSaveFeatureReview: (review: { specification?: { path?: string; content: string; acceptedAt?: string }; impactMap?: { content: string; acceptedAt?: string }; architecturePlan?: { path?: string; content: string; acceptedAt?: string }; deliveryPlan?: { path?: string; content: string; acceptedAt?: string; repositoryPath?: string; executionMode?: 'standard' | 'demo' } }) => void;
  onUpdateFeatureIdentity: (featureId: string, identity: { featureKey?: string; slug?: string; branch?: string; worktreePath?: string; baselineCommit?: string }) => void;
}

interface JourneyNextStepProps {
  stage: FeatureJourneyStage;
  title: string;
  outcome: string;
  action: string;
  canApprove: boolean;
  readinessHint: string;
  engineAction?: string;
  evidence: string;
  connectorToken: string;
  engineError: string;
  safetyMessages: string[];
  hasSelectedAgent: boolean;
  isRunning: boolean;
  isReconnecting: boolean;
  hasRepository: boolean;
  onStart: () => void;
  onApprove: () => void;
  onConnectorTokenChange: (value: string) => void;
  onOpenWorkspace: () => void;
  onGetHelp: () => void;
}

function JourneyNextStep({
  stage, title, outcome, action, canApprove, readinessHint, engineAction, evidence,
  connectorToken, engineError, safetyMessages, hasSelectedAgent, isRunning, isReconnecting, hasRepository,
  onStart, onApprove, onConnectorTokenChange, onOpenWorkspace, onGetHelp,
}: JourneyNextStepProps) {
  const needsLocalSetup = Boolean(engineAction && (!hasRepository || !hasSelectedAgent));
  const primaryLabel = canApprove
    ? 'Approve this stage and continue'
    : needsLocalSetup
      ? !hasRepository ? 'Open Connected Workspace' : 'Set up local agent'
      : isReconnecting ? 'Reconnecting to saved run…'
        : isRunning ? 'Working…'
          : action;
  const runPrimaryAction = () => {
    if (canApprove) { onApprove(); return; }
    if (needsLocalSetup) { onOpenWorkspace(); return; }
    onStart();
  };
  return <section className="journey-next-step rounded-2xl border p-5" aria-label="Your one next step">
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 text-sm font-black text-cyan-300">{stage.id}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Your one next step</p>
        <h2 className="journey-next-step-title mt-1 text-lg font-bold">{title}</h2>
        <p className="journey-next-step-copy mt-1 text-sm">{outcome}</p>

        {engineError && <div role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
          <p className="font-bold">Action needed before the agent can continue</p>
          <p className="mt-1">{engineError}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-2"><button type="button" onClick={onOpenWorkspace} className="font-bold underline">Open Connected Workspace</button><button type="button" onClick={onGetHelp} className="font-bold underline">Get guided recovery</button></div>
        </div>}

        {safetyMessages.length > 0 && <div role="alert" className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100"><p className="font-bold">Safety setup needs attention</p><p className="mt-1">{safetyMessages[0]}</p>{safetyMessages.length > 1 && <p className="mt-1 text-amber-200">{safetyMessages.length - 1} additional item{ safetyMessages.length === 2 ? '' : 's' } available in Feature details.</p>}</div>}

        {!hasSelectedAgent && engineAction && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><CircleAlert className="h-4 w-4 shrink-0" />Studio needs one compatible local agent before it can run this stage.</p>}
        {!canApprove && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><CircleAlert className="h-4 w-4 shrink-0" />{readinessHint}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={runPrimaryAction} disabled={isRunning || isReconnecting} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50 ${canApprove ? 'bg-emerald-500 text-zinc-950 hover:bg-emerald-400' : 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400'}`}>{canApprove ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{primaryLabel}</button>
        </div>

        {engineAction && <div className="mt-4 space-y-2">
          <ProgressiveDisclosure className="journey-next-step-details rounded-xl border p-1" tone="context" label="Stage context" summary="engine action and retained evidence">
            <div className="grid gap-2 p-3 text-xs sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Engine action</span><p className="mt-1 font-mono text-[11px] text-cyan-200">{engineAction}</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Evidence Studio will retain</span><p className="mt-1 text-[11px] text-zinc-400">{evidence}</p></div></div>
          </ProgressiveDisclosure>
          <ProgressiveDisclosure className="journey-next-step-details rounded-xl border p-1" label="Local connector settings" summary="only if your connector requires a pairing token">
            <div className="p-3"><label className="block text-[11px] text-zinc-400">Pairing token<input value={connectorToken} onChange={(event) => onConnectorTokenChange(event.target.value)} type="password" placeholder="Enter it once in Connected Workspace, or paste it here" className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100" /></label>{!hasRepository && <p className="mt-2 text-[11px] text-amber-200">Connect a repository before running a local agent.</p>}</div>
          </ProgressiveDisclosure>
        </div>}
      </div>
    </div>
  </section>;
}

/** Shows the human-readable evidence immediately before a stage can advance.
 * Raw agent output remains diagnostic evidence; it is never the approval UI. */
function StageApprovalPreview({ stage, project, feature }: { stage: FeatureJourneyStage; project: SpecKitProject; feature: ReturnType<typeof activeFeatureForProject> }) {
  const artifact = stage.id === 2 ? feature?.specification
    : stage.id === 3 ? feature?.impactMap
      : stage.id === 4 ? feature?.architecturePlan
        : stage.id === 5 ? feature?.deliveryPlan
          : undefined;
  const audit = stage.id === 6 ? feature?.qualityAudit || project.audit : undefined;
  const implementationReceipts = stage.id === 7 ? feature?.implementationReceipts || [] : [];

  return <section className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-5" aria-label={`Approval preview for Stage ${stage.id}`}>
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Review before approving · stage {stage.id}</p>
    <h2 className="mt-1 text-lg font-bold text-zinc-100">What you are about to approve</h2>
    <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-300">Review this retained evidence first. The approval action below records your decision and advances only this stage.</p>
    {artifact?.content ? <FeatureArtifactViewer content={artifact.content} artifactLabel={stage.id === 2 ? 'spec.md' : stage.id === 3 ? 'impact map' : stage.id === 4 ? 'plan.md' : 'tasks.md'} sourcePath={'path' in artifact && typeof artifact.path === 'string' ? artifact.path : undefined} acceptedAt={artifact.acceptedAt} reviewState="pending" />
      : audit ? <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[11px] text-zinc-400">Quality score</p><p className="mt-1 text-2xl font-black text-emerald-300">{audit.overallScore}%</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 sm:col-span-2"><p className="text-[11px] text-zinc-400">Audit summary</p><p className="mt-1 text-sm text-zinc-100">{audit.summary}</p></div><div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"><p className="text-[11px] text-zinc-400">Open gaps</p><p className="mt-1 text-2xl font-black text-emerald-300">{audit.gaps.length}</p></div></div>
      : implementationReceipts.length ? <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-200"><strong>{implementationReceipts.length} reviewed task receipt{implementationReceipts.length === 1 ? '' : 's'}</strong><p className="mt-1 text-xs text-zinc-400">Each completed task has retained changed-file and verification evidence. Approval advances the implementation stage; it does not create a commit or push.</p></div>
      : <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-sm text-zinc-200"><strong>{stage.handoffTitle}</strong><p className="mt-1 text-xs text-zinc-400">{stage.handoffGuidance}</p></div>}
  </section>;
}

export function FeatureJourney({ project, onNavigate, onOpenFeatureImport, onSaveJourney, onSaveFeatureReview, onUpdateFeatureIdentity }: Props) {
  const journey = project.journey || createFeatureJourney();
  const current = getJourneyStage(journey.activeStage);
  const [connectorToken, setConnectorToken] = useState(() => getConnectorSessionToken());
  const [agentJob, setAgentJob] = useState<ConnectorJob | null>(null);
  const [agentStageId, setAgentStageId] = useState<number | null>(null);
  const [acceptedNotice, setAcceptedNotice] = useState<string | null>(null);
  const [discoveredArtifact, setDiscoveredArtifact] = useState<SpecKitArtifact | null>(null);
  const [isRunningEngine, setIsRunningEngine] = useState(false);
  const [engineError, setEngineError] = useState('');
  const [worktreePath, setWorktreePath] = useState('');
  const [isCreatingWorktree, setIsCreatingWorktree] = useState(false);
  const [deliveryPlanMode, setDeliveryPlanMode] = useState<DeliveryPlanMode>('detailed');
  const [compactTaskCount, setCompactTaskCount] = useState(3);
  const [isReplacingDeliveryPlan, setIsReplacingDeliveryPlan] = useState(false);
  const [isRestoringJourneyRun, setIsRestoringJourneyRun] = useState(true);
  const activeFeature = activeFeatureForProject(project);
  const storyScope = Boolean(activeFeature && deliveryScope(activeFeature) === 'user-story');
  const pendingJourneyRun = activeFeature && project.importedRepo?.repoUrl
    ? readConnectorRunReference(project.id, 'journey-stage', activeFeature.id, project.importedRepo.repoUrl)
    : null;
  const isReconnectingJourneyRun = Boolean(
    !agentJob && activeFeature && engineInstructionForStage(current.id, project, deliveryPlanMode)
    && ((pendingJourneyRun?.stageId === current.id) || isRestoringJourneyRun),
  );
  const agentRunIsActive = isRunningEngine || agentJob?.status === 'running' || isReconnectingJourneyRun;
  // A previously accepted artifact can keep `stage.ready(project)` true while
  // the user is attempting to regenerate that same stage. A failed or
  // unverified replacement must never leave a stale approval button exposed.
  const approvalBlockedByCurrentRun = Boolean(
    engineError
    || agentRunIsActive
    || (agentJob && agentStageId === current.id && !agentJob.ok),
  );
  const canApproveCurrentStage = current.ready(project)
    && !journey.completedStages.includes(current.id)
    && !approvalBlockedByCurrentRun;
  const pendingImplementationJob = activeFeatureForProject(project)?.worktreePath
    ? readLocalAgentJobReference(project.id, activeFeatureForProject(project)!.id, activeFeatureForProject(project)!.worktreePath!)
    : null;
  const hydrateJourneyJob = async (job: ConnectorJob, stageId: number, repositoryPath: string): Promise<ConnectorJob> => {
    if (!job.ok || !(stageId === 2 || stageId === 4 || stageId === 5)) return job;
    try {
      const kind = stageId === 2 ? 'spec' : stageId === 4 ? 'plan' : 'tasks';
      const { artifacts } = await configuredConnectorClient(connectorToken).readSpecKitArtifacts(repositoryPath);
      const artifact = artifacts
        .filter((item) => item.kind === kind && isExpectedFeatureArtifactPath(activeFeatureForProject(project), item.path, kind) && isFeatureArtifactScoped(item.content, activeFeatureForProject(project), item.path))
        .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
      if (!artifact) return job;
      const feature = activeFeatureForProject(project);
      const issues = feature && (stageId === 2 || stageId === 4 || stageId === 5)
        ? validateSpecKitArtifacts(feature, [{ ...artifact, kind }], [kind])
        : [];
      const output = `${job.output}\n\n--- Official ${artifact.path} ---\n${artifact.content}`;
      // A process exit is not a successful Journey result when the official
      // artifact is still a template. Present retry—not approval—as the one
      // next action, while retaining the redacted output for review.
      const compactIssue = stageId === 5 && deliveryPlanMode === 'compact'
        ? compactDemoPlanIssue(artifact.content)
        : undefined;
      return issues.length || compactIssue
        ? { ...job, status: 'failed' as const, ok: false, output: `${output}\n\n--- Studio artifact check ---\n${[...issues.map((issue) => issue.message), compactIssue].filter(Boolean).join('\n')}` }
        : { ...job, output };
    } catch {
      // Artifact-producing stages cannot be approved based on a process exit
      // alone. A temporary scan failure is therefore a retryable failure, not
      // a misleading "accept" state.
      return {
        ...job,
        status: 'failed' as const,
        ok: false,
        output: `${job.output}\n\n--- Studio artifact check ---\nStudio could not verify the required official artifact after the agent finished. Check the local connector and retry; no stage can be approved until verification succeeds.`,
      };
    }
  };
  const retainAgentAttempt = (job: ConnectorJob, stageId: number) => {
    if (job.status === 'running' || !job.finishedAt) return;
    onSaveJourney(retainJourneyAttempt(journey, {
      id: `agent:${job.id}`, stageId, operation: 'agent', outcome: job.ok ? 'succeeded' : 'failed',
      startedAt: job.startedAt, finishedAt: job.finishedAt,
    }));
  };
  const complete = (stage: typeof current) => {
    if (!stage.ready(project) || approvalBlockedByCurrentRun) return;
    const now = new Date().toISOString();
    onSaveJourney(approveJourneyStage(retainJourneyAttempt(journey, {
      id: `approval:${stage.id}:${now}`, stageId: stage.id, operation: 'human-approval', outcome: 'approved', startedAt: now, finishedAt: now,
    }), stage.id, now));
  };
  const reopenStage = (stageId: number) => onSaveJourney(reopenJourneyStage(journey, stageId));
  const requestStageReopen = (stageId: number) => {
    const stage = getJourneyStage(stageId);
    if (!window.confirm(`Reopen “${stage.title}”? Its approved evidence is retained, but this stage and every later stage will require review again.`)) return;
    reopenStage(stageId);
  };
  const runDeterministicHandoff = async () => {
    const repositoryPath = project.importedRepo?.repoUrl;
    if (!repositoryPath || agentRunIsActive) return;
    setIsRunningEngine(true); setAgentJob(null); setEngineError(''); setAgentStageId(8);
    try {
      const job = await configuredConnectorClient(connectorToken).startFeatureVerification(repositoryPath);
      setAgentJob(job);
      if (job.status !== 'running') {
        retainAgentAttempt(job, 8);
        if (!job.ok) setEngineError('Deterministic handoff verification did not pass. Review the command output and repository evidence, resolve the reported issue, then retry.');
      }
    } catch (error) { setEngineError(error instanceof Error ? error.message : 'Studio could not start deterministic handoff verification.'); }
    finally { setIsRunningEngine(false); }
  };
  const startStage = (stage: FeatureJourneyStage) => {
    if (agentRunIsActive) return;
    // Implementation is intentionally a human task-selection step. Starting a
    // coding agent before the user can inspect and choose a delivery task is
    // unsafe and makes the task board invisible at the point of decision.
    if (stage.id === 7) { onNavigate(stage.destination); return; }
    if (stage.id === 8) { void runDeterministicHandoff(); return; }
    if (engineInstructionForStage(stage.id, project, deliveryPlanMode) && !(agentJob?.ok && agentStageId === stage.id)) { void runEngineStage(stage.id); return; }
    if (stage.id === 2) { onOpenFeatureImport(); return; }
    if (stage.destination) onNavigate(stage.destination);
  };
  const runEngineStage = async (stageIdOrEvent: number | React.MouseEvent = current.id) => {
    if (isRunningEngine || agentJob?.status === 'running') return;
    const stageId = typeof stageIdOrEvent === 'number' ? stageIdOrEvent : current.id;
    const focusedFeature = activeFeatureForProject(project);
    if (stageId >= 3 && !focusedFeature) {
      setEngineError('Import and select a feature before running a feature-specific stage. Studio did not start an agent.');
      return;
    }
    if (stageId === 5 && focusedFeature?.worktreePath && readLocalAgentJobReference(project.id, focusedFeature.id, focusedFeature.worktreePath)) {
      setEngineError('Review and record the existing implementation run before replacing this feature’s delivery plan. Studio will not change task scope while a task result is awaiting review.');
      return;
    }
    const instruction = engineInstructionForStage(stageId, project, deliveryPlanMode); const agent = selectedAgent(); const requiresFeatureWorktree = stageRequiresFeatureWorktree(stageId); const repositoryPath = repositoryPathForEngineStage(stageId, project.importedRepo?.repoUrl, focusedFeature?.worktreePath);
    const stage = getJourneyStage(stageId);
    const compactReplacement = stageId === 5 && deliveryPlanMode === 'compact';
    if (!instruction || !agent || !repositoryPath) return;
    const executionLabel = localAgentLabel(agent);
    const confirmation = compactReplacement
      ? `Run ${executionLabel} to create an exact ${compactTaskCount}-task delivery plan for ${focusedFeature?.title}? Studio will validate the count in an isolated worktree and promote only tasks.md after you review and accept it. It does not change application code.`
      : `Run ${executionLabel} for Stage ${stageId}: ${stage.title}? You will review the result before the journey advances.`;
    if (!window.confirm(confirmation)) return;
    setIsReplacingDeliveryPlan(compactReplacement && Boolean(focusedFeature?.deliveryPlan?.acceptedAt));
    setIsRunningEngine(true); setAgentJob(null); setEngineError('');
    setAgentStageId(stageId);
    try {
      setConnectorSessionToken(connectorToken);
      const client = configuredConnectorClient(connectorToken);
      const writeScope = stageId === 3 ? 'read-only' : 'workspace-write';
      const health = await client.health();
      if (writeScope === 'workspace-write' && !health.capabilities?.includes('workspace-write-planning')) {
        throw new Error('Your local connector needs an update before it can safely generate Spec-Kit artifacts. Open Connected Workspace to install the current connector release, restart it, then retry.');
      }
      if (writeScope === 'workspace-write' && health.agentOperations && !health.agentOperations[agent.id]?.includes('planning-write')) {
        throw new Error(`${executionLabel} is configured for read-only planning only. Ask the connector administrator to add a planning-write operation for this agent, then retry.`);
      }
      // Stages 3–5 must be able to create and review feature artifacts in the
      // connected checkout. Passing a feature ID here would incorrectly demand
      // the implementation branch/worktree before implementation begins.
      const preflightFeatureId = featureIdForEnginePreflight(stageId, focusedFeature?.id);
      const preflightProject = connectorPreflightProject(project, preflightFeatureId);
      const preflight = await client.preflight(repositoryPath, preflightProject, preflightFeatureId);
      if (!preflight.passed) throw new Error(preflight.errors.map((item) => item.message).join(' '));
      if (requiresFeatureWorktree && !preflight.evidence.isLinkedWorktree) throw new Error('Implementation is blocked in the main checkout. Create/select a linked Git worktree for this feature first.');
      if (stageId === 2 || stageId === 4 || stageId === 5) {
        const kind = stageId === 2 ? 'spec' : stageId === 4 ? 'plan' : 'tasks';
        const { artifacts } = await client.readSpecKitArtifacts(repositoryPath);
        const existingArtifact = artifacts
          .filter((item) => item.kind === kind && isExpectedFeatureArtifactPath(focusedFeature, item.path, kind) && isFeatureArtifactScoped(item.content, focusedFeature, item.path))
          .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
        const existingIssues = existingArtifact && focusedFeature
          ? validateSpecKitArtifacts(focusedFeature, [{ ...existingArtifact, kind }], [kind])
          : [];
        if (existingArtifact && !compactReplacement && existingIssues.length === 0) {
          setDiscoveredArtifact(existingArtifact);
          setAcceptedNotice(`Studio found the existing feature-scoped ${kind}.md. No agent was started; review and accept it when ready.`);
          return;
        }
        if (existingArtifact && existingIssues.length) {
          // A stale template is evidence of a prior incomplete run, not a
          // finished artifact. Keep it in place for the agent to complete or
          // replace, rather than routing the user back to a blocked accept
          // action.
          setDiscoveredArtifact(null);
          setAcceptedNotice(`Studio found an incomplete ${kind}.md and will regenerate it. ${existingIssues.map((issue) => issue.message).join(' ')}`);
        }
      }
      // The connector performs its own authoritative preflight immediately
      // before starting an agent. It must receive the same stage-scoped
      // feature identity as the UI preflight above, otherwise planning would
      // incorrectly be rejected for not yet using an implementation worktree.
      const requiredArtifact = stageId === 2 ? 'spec' : stageId === 4 ? 'plan' : stageId === 5 ? 'tasks' : undefined;
      const job = await client.startSpecKitAgent(repositoryPath, agent?.id || 'codex', instruction, preflightProject, preflightFeatureId, writeScope, requiredArtifact, compactReplacement ? 'compact' : 'detailed', compactReplacement ? compactTaskCount : undefined);
      if (focusedFeature) saveConnectorRunReference({ jobId: job.id, projectId: project.id, repositoryPath, scope: 'journey-stage', ownerId: focusedFeature.id, stageId });
      setAgentJob(job);
      if (job.status !== 'running') {
        const hydratedJob = await hydrateJourneyJob(job, stageId, repositoryPath);
        setAgentJob(hydratedJob);
        retainAgentAttempt(hydratedJob, stageId);
        if (!hydratedJob.ok) setEngineError(agentFailureGuidance(agent?.id || 'codex', hydratedJob.output));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Studio could not run the local agent.';
      setEngineError(agentFailureGuidance(agent?.id || 'copilot', message));
    } finally { setIsRunningEngine(false); }
  };
  const completedCount = journey.completedStages.length;
  const progress = Math.round((completedCount / featureJourneyStages.length) * 100);
  const readiness = useMemo(() => featureJourneyStages.map((stage) => ({ stage, ready: stage.ready(project) })), [project]);
  const readinessByStage = useMemo(() => new Map(readiness.map(({ stage, ready }) => [stage.id, ready])), [readiness]);
  const reviewingImportedFeature = current.id === 2 && Boolean(activeFeature);
  const awaitingFeatureImport = current.id === 2 && !activeFeature;
  const storyStageTitles: Partial<Record<number, string>> = { 2: 'Confirm the user story', 3: "Ground this story's impact", 4: 'Design this use case', 5: 'Plan story delivery', 6: 'Validate story coverage', 7: 'Implement this story', 8: 'Verify and hand off this use case' };
  const currentTitle = awaitingFeatureImport ? 'Start delivery work' : reviewingImportedFeature ? storyScope ? 'Review and confirm the user story' : 'Review and confirm the feature' : storyScope ? storyStageTitles[current.id] || current.title : current.title;
  const currentOutcome = awaitingFeatureImport
    ? 'Start with one feature or one focused user story before delivery work begins.'
    : reviewingImportedFeature
    ? storyScope ? 'Confirm this story, its acceptance criteria, and only the requirements needed for this use case.' : 'Review the imported source, stories, requirements, and acceptance criteria before planning.'
    : current.outcome;
  const currentAction = awaitingFeatureImport ? 'Start delivery work' : reviewingImportedFeature ? storyScope ? 'Review user story' : 'Review imported feature with Engine' : current.id === 5 && deliveryPlanMode === 'compact' ? `Run Codex for ${compactTaskCount}-task plan` : current.action;
  const safetyIssues = identityIssues(project, activeFeature);
  const needsOfficialIdentityMigration = Boolean(activeFeature && !isCanonicalSpecKitFeatureSlug(activeFeature.slug));
  const suggestedWorktreePath = activeFeature && project.importedRepo?.repoUrl
    ? `${project.importedRepo.repoUrl.replace(/\/+$/, '')}-${activeFeature.slug || 'feature'}`
    : '';
  const createFeatureWorktree = async () => {
    const repositoryPath = repositoryPathForEngineStage(current.id, project.importedRepo?.repoUrl, activeFeature?.worktreePath);
    if (!activeFeature || !repositoryPath) return;
    const branch = storyScope ? activeFeature.slug || '001-story' : `feat/${activeFeature.slug || 'feature'}`;
    const worktreeExplanation = storyScope
      ? `Create an isolated implementation worktree for ${activeFeature.title} in ${worktreePath}? Studio will keep the approved ${branch} artifacts together. If that planning branch is already open in the connected checkout, Studio will safely create a dedicated ${branch}-worktree branch instead; it will not move or change your current checkout.`
      : `Create ${branch} in ${worktreePath}? Git will create a new linked worktree from the current commit.`;
    if (!worktreePath.trim() || !window.confirm(worktreeExplanation)) return;
    setIsCreatingWorktree(true); setEngineError('');
    try {
      const result = await configuredConnectorClient(connectorToken).createWorktree(repositoryPath, worktreePath.trim(), branch);
      onUpdateFeatureIdentity(activeFeature.id, { branch: result.branch, worktreePath: result.repositoryPath, baselineCommit: result.baselineCommit });
      const branchNote = result.branch === branch ? '' : ` Studio created dedicated implementation branch ${result.branch} because the planning branch remains open in the connected checkout.`;
      setAcceptedNotice(`Linked worktree registered for ${activeFeature.featureKey}.${branchNote} Re-open Connected Workspace using ${result.repositoryPath} before implementation.`);
    } catch (error) { setEngineError(error instanceof Error ? error.message : 'Studio could not create the worktree.'); }
    finally { setIsCreatingWorktree(false); }
  };
  const migrateLegacyFeature = async () => {
    if (!activeFeature) return;
    const ordinal = (project.featureInbox || []).findIndex((feature) => feature.id === activeFeature.id);
    const identity = officialFeatureIdentity(activeFeature, ordinal);
    if (activeFeature.slug === identity.slug) {
      onUpdateFeatureIdentity(activeFeature.id, identity);
      return;
    }
    const repositoryPath = project.importedRepo?.repoUrl;
    if (!repositoryPath) { setEngineError('Connect the repository before migrating this feature identity.'); return; }
    const oldSlug = activeFeature.slug;
    if (!oldSlug) {
      onUpdateFeatureIdentity(activeFeature.id, identity);
      setAcceptedNotice(`Assigned official feature identity ${identity.slug}. No repository artifacts needed migration.`);
      return;
    }
    if (!window.confirm(`Move only specs/${oldSlug} to specs/${identity.slug}, then update Studio's saved feature identity? Studio will stop if the destination already exists and will never merge or overwrite artifacts.`)) return;
    setIsCreatingWorktree(true); setEngineError('');
    try {
      const result = await configuredConnectorClient(connectorToken).migrateFeatureIdentity(repositoryPath, oldSlug, identity.slug);
      const oldRoot = `specs/${oldSlug}/`;
      const newRoot = `specs/${identity.slug}/`;
      const migratedPath = (artifactPath?: string) => artifactPath?.startsWith(oldRoot) ? `${newRoot}${artifactPath.slice(oldRoot.length)}` : artifactPath;
      const review = {
        ...(activeFeature.specification ? { specification: { ...activeFeature.specification, path: migratedPath(activeFeature.specification.path) } } : {}),
        ...(activeFeature.architecturePlan ? { architecturePlan: { ...activeFeature.architecturePlan, path: migratedPath(activeFeature.architecturePlan.path) } } : {}),
        ...(activeFeature.deliveryPlan ? { deliveryPlan: { ...activeFeature.deliveryPlan, path: migratedPath(activeFeature.deliveryPlan.path) } } : {}),
      };
      onUpdateFeatureIdentity(activeFeature.id, identity);
      if (Object.keys(review).length) onSaveFeatureReview(review);
      setAcceptedNotice(result.moved
        ? `Migrated ${result.fromPath} to ${result.toPath} and preserved this feature's review evidence.`
        : `Assigned official identity ${identity.slug}. No legacy artifact directory needed moving.`);
    } catch (error) { setEngineError(error instanceof Error ? error.message : 'Studio could not migrate the feature identity.'); }
    finally { setIsCreatingWorktree(false); }
  };
  useEffect(() => {
    // A Journey stage can outlive this screen. Restore both an in-flight run
    // and a completed, not-yet-reviewed result so navigation never becomes an
    // invitation to run the same agent work twice.
    const repositoryPath = project.importedRepo?.repoUrl;
    if (agentJob || !activeFeature || !repositoryPath) { setIsRestoringJourneyRun(false); return; }
    const reference = readConnectorRunReference(project.id, 'journey-stage', activeFeature.id, repositoryPath);
    const stageId = reference?.stageId || current.id;
    if (stageId < 2 || stageId > 5 || stageId !== current.id || !engineInstructionForStage(stageId, project, deliveryPlanMode)) { setIsRestoringJourneyRun(false); return; }
    let disposed = false;
    void (async () => {
      try {
        // New runs have an exact reference. The fallback is deliberately only
        // for an already-running single connector writer created by an older
        // Studio build, before durable references existed.
        const recovered = reference
          ? await configuredConnectorClient(connectorToken).getJob(reference.jobId)
          : await activeConnectorJob(configuredConnectorUrl(), connectorToken, repositoryPath);
        if (!recovered) return;
        if (!reference && recovered.status !== 'running') return;
        if (!reference) saveConnectorRunReference({ jobId: recovered.id, projectId: project.id, repositoryPath, scope: 'journey-stage', ownerId: activeFeature.id, stageId });
        const hydrated = await hydrateJourneyJob(recovered, stageId, repositoryPath);
        if (disposed) return;
        setAgentStageId(stageId);
        setAgentJob(hydrated);
        retainAgentAttempt(hydrated, stageId);
        setIsRunningEngine(false);
        setAcceptedNotice(hydrated.status === 'running'
          ? `Reconnected to the Stage ${stageId} agent run. You can safely leave this screen while it continues.`
          : `Your earlier Stage ${stageId} agent run is ready for review. Studio did not run it again.`);
        if (!hydrated.ok && hydrated.status !== 'running') {
          clearConnectorRunReference(project.id, 'journey-stage', activeFeature.id);
          setEngineError(agentFailureGuidance(selectedAgent()?.id || 'copilot', hydrated.output));
        }
      } catch (error) {
        if (disposed) return;
        const message = error instanceof Error ? error.message : '';
        if (message.includes('HTTP 404')) {
          clearConnectorRunReference(project.id, 'journey-stage', activeFeature.id);
          setEngineError('The local connector was restarted before Studio could retrieve the earlier run. Studio did not start a replacement. Check whether its expected artifact was written, then run this stage again only if there is no result to review.');
        } else {
          setEngineError('Studio cannot reconnect to the saved local-agent run yet. Start the same local connector again; this screen will restore the run when you return.');
        }
      } finally { if (!disposed) setIsRestoringJourneyRun(false); }
    })();
    return () => { disposed = true; };
  }, [activeFeature, agentJob, connectorToken, project]);
  useSerialAsyncInterval(async (isCurrent) => {
    if (!agentJob || agentJob.status !== 'running' || !agentStageId) return;
    try {
      const next = await configuredConnectorClient(connectorToken).getJob(agentJob.id);
      const repositoryPath = project.importedRepo?.repoUrl;
      const hydrated = repositoryPath ? await hydrateJourneyJob(next, agentStageId, repositoryPath) : next;
      if (!isCurrent()) return;
      setAgentJob(hydrated);
      if (hydrated.status !== 'running') {
        retainAgentAttempt(hydrated, agentStageId);
        setIsRunningEngine(false);
        if (!hydrated.ok) {
          if (activeFeature) clearConnectorRunReference(project.id, 'journey-stage', activeFeature.id);
          setEngineError(agentStageId === 8 ? 'Deterministic handoff verification did not pass. Review the command output and repository evidence, resolve the reported issue, then retry.' : agentFailureGuidance(selectedAgent()?.id || 'copilot', hydrated.output));
        }
      }
    } catch {
      // Keep the saved reference. A temporary connector restart must not
      // erase a run that can be recovered on the next successful poll.
      if (isCurrent()) setEngineError('Connection to the local agent was interrupted. Studio is still preserving this run and will reconnect automatically when the connector is available.');
    }
  }, 1_000, Boolean(agentJob?.status === 'running' && agentStageId), `${agentJob?.id || ''}:${agentJob?.status || ''}:${agentStageId || ''}:${connectorToken}:${project.importedRepo?.repoUrl || ''}`);
  useEffect(() => {
    // Older Studio versions could approve Stage 2 from workspace-wide stories
    // without ever retaining a feature receipt. Never let that orphaned state
    // advance into feature-specific stages. Preserve the repository baseline
    // (Stage 1) and return to the one missing human action: import a feature.
    if (!isRunningEngine && agentJob?.status !== 'running' && !activeFeature && current.id > 2 && journey.completedStages.includes(2)) {
      onSaveJourney(reopenJourneyStage(journey, 2));
      setAcceptedNotice('Stage 2 needs one imported feature in focus. Studio returned to feature import; your connected repository baseline is unchanged.');
    }
  }, [activeFeature, agentJob?.status, current.id, isRunningEngine, journey, onSaveJourney]);
  useEffect(() => {
    // `getJourneyStage` deliberately falls back to Stage 1 for an invalid id.
    // Do not use that fallback for progression: a completed final stage has no
    // successor, and treating it as Stage 1 creates a visible 8 → 1 loop.
    const next = nextFeatureJourneyStage(current.id);
    if (next && journey.activeStage === current.id && journey.completedStages.includes(current.id) && current.ready(project)) {
      onSaveJourney({ ...journey, activeStage: next.id, updatedAt: new Date().toISOString() });
    }
  }, [current, journey, onSaveJourney, project]);
  useEffect(() => {
    // Stage 6 is evaluated by Studio's persisted quality-audit result. Older
    // versions could run a local CLI here, but its transcript cannot satisfy
    // that gate and must not be presented as approvable evidence.
    if (current.id === 6 && agentStageId === 6) {
      setAgentJob(null);
      setAgentStageId(null);
      setAcceptedNotice('Stage 6 uses the Spec Quality Audit result. Run that audit, review its findings, then approve this stage.');
    }
  }, [agentStageId, current.id]);
  useEffect(() => {
    const repositoryPath = project.importedRepo?.repoUrl;
    const expectedKind = current.id === 2 && storyScope ? 'spec' : current.id === 4 ? 'plan' : current.id === 5 ? 'tasks' : null;
    if (!repositoryPath || !expectedKind || (expectedKind === 'spec' && activeFeature?.specification?.path) || (expectedKind === 'plan' && activeFeature?.architecturePlan?.path && isFeatureArtifactScoped(activeFeature.architecturePlan.content, activeFeature, activeFeature.architecturePlan.path)) || (expectedKind === 'tasks' && activeFeature?.deliveryPlan?.path && isFeatureArtifactScoped(activeFeature.deliveryPlan.content, activeFeature, activeFeature.deliveryPlan.path) && parseFeatureDeliveryTasks(activeFeature.deliveryPlan.content).length > 0)) { setDiscoveredArtifact(null); return; }
    const client = configuredConnectorClient(connectorToken);
    client.readSpecKitArtifacts(repositoryPath).then(({ artifacts }) => {
      const candidate = artifacts.filter((item) => item.kind === expectedKind
        && isExpectedFeatureArtifactPath(activeFeature, item.path, expectedKind)
        && isFeatureArtifactScoped(item.content, activeFeature, item.path)
        && (expectedKind !== 'tasks' || parseFeatureDeliveryTasks(item.content).length > 0))
        .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
      if (!candidate || !activeFeature) { setDiscoveredArtifact(null); return; }
      const issues = validateSpecKitArtifacts(activeFeature, [{ ...candidate, kind: expectedKind }], [expectedKind]);
      if (issues.length) {
        setDiscoveredArtifact(null);
        // A completed-but-invalid artifact is not an active run. Remove an
        // obsolete recovery handle so it cannot keep this stage locked behind
        // a stale "reconnecting" state.
        clearConnectorRunReference(project.id, 'journey-stage', activeFeature.id);
        setEngineError(`Studio found ${candidate.path}, but it is not ready for approval: ${issues.map((issue) => issue.message).join(' ')}`);
        return;
      }
      setDiscoveredArtifact(candidate);
    }).catch(() => setDiscoveredArtifact(null));
  }, [activeFeature, connectorToken, current.id, project.importedRepo?.repoUrl, storyScope]);
  useEffect(() => {
    // Prefer a durable, feature-scoped repository artifact over a duplicate
    // agent transcript. This can occur when the initial artifact scan and a
    // user click race each other; the repository artifact is the reviewable
    // record and must be the only approval path shown.
    if (discoveredArtifact && agentJob?.ok && (agentStageId === 2 || agentStageId === 4 || agentStageId === 5)) {
      if (activeFeature) clearConnectorRunReference(project.id, 'journey-stage', activeFeature.id);
      setAgentJob(null);
      setAgentStageId(null);
    }
  }, [activeFeature, agentJob?.ok, agentStageId, discoveredArtifact, project.id]);
  // Finding a repository artifact is intentionally not acceptance. A plan or
  // tasks file may have been created by a prior command, a teammate, or a
  // partial run. The explicit review action below is the only path that writes
  // an acceptedAt receipt and can unlock Stage 4 or 5.
  useEffect(() => {
    if (current.id !== 4 || !activeFeature || !journey.completedStages.includes(4)
      || (activeFeature.architecturePlan?.acceptedAt && isFeatureArtifactScoped(activeFeature.architecturePlan.content, activeFeature, activeFeature.architecturePlan.path))) return;
    onSaveFeatureReview({
      architecturePlan: {
        path: 'studio://recovered-legacy-architecture-context',
        content: legacyArchitectureSnapshot(project, activeFeature),
        acceptedAt: new Date().toISOString(),
      },
    });
    setAcceptedNotice('Recovered the approved legacy architecture context for this feature. It remains editable and is clearly labelled as a historical snapshot.');
  }, [activeFeature, current.id, journey.completedStages, onSaveFeatureReview, project]);
  useEffect(() => {
    if (current.id === 7 && !activeFeature?.worktreePath && !worktreePath && suggestedWorktreePath) {
      setWorktreePath(suggestedWorktreePath);
    }
  }, [activeFeature?.worktreePath, current.id, suggestedWorktreePath, worktreePath]);
  const acceptEngineReview = () => {
    if (!agentJob?.ok || !agentJob.output.trim()) {
      setEngineError('The agent finished, but Studio received no reviewable artifact output. Open the agent summary, then rerun the story review if it did not create the official spec.md.');
      return;
    }
    const acceptedAt = new Date().toISOString();
    if (agentStageId === 3) onSaveFeatureReview({ impactMap: { content: agentJob.output, acceptedAt } });
    const officialArtifact = officialArtifactFromAgentOutput(agentJob.output);
    if ((agentStageId === 2 || agentStageId === 4 || agentStageId === 5) && !officialArtifact) {
      setEngineError('Studio did not find the required official Spec-Kit artifact in the agent result, so it was not accepted. Agent output and setup logs are not feature evidence.');
      return;
    }
    if ((agentStageId === 2 || agentStageId === 4 || agentStageId === 5) && officialArtifact && !isFeatureArtifactScoped(officialArtifact.content, activeFeature, officialArtifact.path)) {
      setEngineError(`Studio found ${officialArtifact.path}, but it does not mention ${activeFeature?.title || 'the feature in focus'}. It was not accepted as feature evidence.`);
      return;
    }
    if ((agentStageId === 4 || agentStageId === 5) && officialArtifact && activeFeature) {
      const kind = agentStageId === 4 ? 'plan' : 'tasks';
      const issues = validateSpecKitArtifacts(activeFeature, [{ ...officialArtifact, kind }], [kind]);
      if (issues.length) { setEngineError(issues.map((issue) => issue.message).join(' ')); return; }
    }
    if (agentStageId === 2 && officialArtifact && activeFeature) {
      const officialSlug = officialFeatureDirectoryFromSpecPath(officialArtifact.path);
      if (!officialSlug) { setEngineError(`${officialArtifact.path} is not an official numbered Spec-Kit feature path.`); return; }
      const officialItem = { ...activeFeature, slug: officialSlug };
      const issues = validateSpecKitArtifacts(officialItem, [{ ...officialArtifact, kind: 'spec' }], ['spec']);
      if (issues.length) { setEngineError(issues.map((issue) => issue.message).join(' ')); return; }
      onUpdateFeatureIdentity(activeFeature.id, { slug: officialSlug, branch: officialSlug });
      onSaveFeatureReview({ specification: { ...officialArtifact, acceptedAt } });
    }
    if (agentStageId === 4 && officialArtifact) onSaveFeatureReview({ architecturePlan: { ...officialArtifact, acceptedAt } });
    if (agentStageId === 5 && officialArtifact) {
      const compactIssue = deliveryPlanMode === 'compact' ? compactDemoPlanIssue(officialArtifact.content) : undefined;
      if (compactIssue) { setEngineError(`${compactIssue} The previous plan remains authoritative; run the compact plan again after correcting the agent result.`); return; }
      if (parseFeatureDeliveryTasks(officialArtifact.content).length === 0) {
        setEngineError('Studio found tasks.md, but it contains no parseable task IDs. Stage 5 remains unapproved until the delivery plan includes individual T001-style tasks.');
        return;
      }
      if (parseFeatureDeliveryTasks(officialArtifact.content).some((task) => task.done)) {
        setEngineError('Studio will not accept a delivery plan with pre-checked tasks. Review a new forward-looking plan, then retain completion only through task-scoped receipts.');
        return;
      }
      if (featureHasVisualReference(project)) {
        const visualIssue = visualDeliveryPlanIssue(officialArtifact.content);
        if (visualIssue) { setEngineError(`${visualIssue} Stage 5 remains unapproved until the plan makes visual fidelity independently reviewable.`); return; }
      }
      onSaveFeatureReview({ deliveryPlan: { ...officialArtifact, acceptedAt, repositoryPath: repositoryPathForEngineStage(5, project.importedRepo?.repoUrl, activeFeature?.worktreePath), executionMode: deliveryPlanMode === 'compact' ? 'demo' : 'standard' } });
    }
    if (agentStageId === 5 && isReplacingDeliveryPlan) onSaveJourney(reopenJourneyStage(journey, 5, acceptedAt));
    else if (agentStageId === 5 && journey.completedStages.includes(5)) onSaveJourney({ ...journey, activeStage: 6, updatedAt: acceptedAt });
    if (agentStageId === 4 && journey.completedStages.includes(4)) onSaveJourney({ ...journey, activeStage: 5, updatedAt: acceptedAt });
    setAcceptedNotice(agentStageId === 2 ? 'Official single-story specification accepted. You can now approve Stage 2.' : agentStageId === 3 ? 'Impact map accepted and saved to this feature. Next: run the feature-scoped architecture plan.' : agentStageId === 4 ? 'Feature plan accepted and saved to this feature. You can now approve Stage 4.' : isReplacingDeliveryPlan ? 'Compact delivery tasks accepted. Stage 5 and later approvals were reopened so you can review the new plan before continuing.' : 'Feature delivery tasks accepted and saved to this feature. You can now approve Stage 5.');
    if (activeFeature) clearConnectorRunReference(project.id, 'journey-stage', activeFeature.id);
    setAgentJob(null);
    setAgentStageId(null);
    setIsReplacingDeliveryPlan(false);
  };
  const acceptDiscoveredArtifact = () => {
    if (!discoveredArtifact) return;
    const artifactKind = current.id === 2 ? 'spec' : current.id === 4 ? 'plan' : current.id === 5 ? 'tasks' : null;
    if (artifactKind && !isExpectedFeatureArtifactPath(activeFeature, discoveredArtifact.path, artifactKind)) {
      setEngineError(`Studio will not accept ${discoveredArtifact.path}: this stage requires the active feature's official specs/${activeFeature?.slug}/${artifactKind}.md artifact.`);
      return;
    }
    if (!isFeatureArtifactScoped(discoveredArtifact.content, activeFeature, discoveredArtifact.path)) {
      setEngineError('This artifact does not demonstrate that it belongs to the feature in focus, so Studio will not accept it.');
      return;
    }
    const acceptedAt = new Date().toISOString();
    if (current.id === 2 && activeFeature) {
      const officialSlug = officialFeatureDirectoryFromSpecPath(discoveredArtifact.path);
      if (!officialSlug) { setEngineError(`${discoveredArtifact.path} is not an official numbered Spec-Kit feature path.`); return; }
      const officialItem = { ...activeFeature, slug: officialSlug };
      const issues = validateSpecKitArtifacts(officialItem, [discoveredArtifact], ['spec']);
      if (issues.length) { setEngineError(issues.map((issue) => issue.message).join(' ')); return; }
      onUpdateFeatureIdentity(activeFeature.id, { slug: officialSlug, branch: officialSlug });
      onSaveFeatureReview({ specification: { path: discoveredArtifact.path, content: discoveredArtifact.content, acceptedAt } });
    }
    if ((current.id === 4 || current.id === 5) && activeFeature) {
      const kind = current.id === 4 ? 'plan' : 'tasks';
      const issues = validateSpecKitArtifacts(activeFeature, [discoveredArtifact], [kind]);
      if (issues.length) { setEngineError(issues.map((issue) => issue.message).join(' ')); return; }
    }
    if (current.id === 4) onSaveFeatureReview({ architecturePlan: { path: discoveredArtifact.path, content: discoveredArtifact.content, acceptedAt } });
    if (current.id === 5 && parseFeatureDeliveryTasks(discoveredArtifact.content).length === 0) {
      setEngineError('This tasks.md contains no parseable individual task IDs, so Studio cannot safely use it for implementation.');
      return;
    }
    if (current.id === 5 && parseFeatureDeliveryTasks(discoveredArtifact.content).some((task) => task.done)) {
      setEngineError('Studio will not accept a delivery plan with pre-checked tasks. Retain implementation completion only after task-scoped human review.');
      return;
    }
    if (current.id === 5 && featureHasVisualReference(project)) {
      const visualIssue = visualDeliveryPlanIssue(discoveredArtifact.content);
      if (visualIssue) { setEngineError(`${visualIssue} Studio needs an independently reviewable visual delivery plan.`); return; }
    }
    if (current.id === 5 && deliveryPlanMode === 'compact') {
      const compactIssue = compactDemoPlanIssue(discoveredArtifact.content);
      if (compactIssue) { setEngineError(`${compactIssue} Studio will not replace the accepted delivery plan with it.`); return; }
    }
    if (current.id === 5) onSaveFeatureReview({
      deliveryPlan: {
        path: discoveredArtifact.path,
        content: discoveredArtifact.content,
        acceptedAt,
        repositoryPath: repositoryPathForEngineStage(5, project.importedRepo?.repoUrl, activeFeature?.worktreePath),
        executionMode: deliveryPlanMode === 'compact' ? 'demo' : 'standard',
      },
    });
    if (current.id === 5 && journey.completedStages.includes(5)) onSaveJourney({ ...journey, activeStage: 6, updatedAt: acceptedAt });
    if (current.id === 4 && journey.completedStages.includes(4)) onSaveJourney({ ...journey, activeStage: 5, updatedAt: acceptedAt });
    setAcceptedNotice(current.id === 2
      ? 'Existing official single-story specification accepted. You can now approve Stage 2.'
      : current.id === 4
      ? 'Existing official plan accepted and linked to this feature. You can now approve Stage 4.'
      : 'Existing official tasks accepted and linked to this feature. You can now approve Stage 5.');
    if (activeFeature) clearConnectorRunReference(project.id, 'journey-stage', activeFeature.id);
    setDiscoveredArtifact(null);
  };

  if (current.id === 8 && journey.completedStages.includes(8)) {
    return <div className="feature-journey mx-auto max-w-5xl space-y-6 pb-12">
      <section className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-900 p-6 md:p-8">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">{storyScope ? 'User story' : 'Feature'} Journey complete · 8 of 8 stages approved</p>
        <h1 className="mt-2 text-2xl font-bold text-zinc-100">Handoff complete</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">{activeFeature?.title || 'This feature'} has a retained, editable history for every stage. No further agent execution or approval is required.</p>
        <div className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="font-bold text-emerald-200">✓ Journey history retained</p><p className="mt-1 text-zinc-400">Specifications, plans, task evidence, and approvals remain available.</p></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="font-bold text-cyan-200">✓ {storyScope ? 'Story' : 'Feature'} package ready</p><p className="mt-1 text-zinc-400">Download the isolated package whenever you need a durable handoff record.</p></div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"><p className="font-bold text-violet-200">Edit with review</p><p className="mt-1 text-zinc-400">If artifacts change, revisit the affected stage and re-review it before delivery.</p></div>
        </div>
        <div className="mt-5 rounded-xl border border-cyan-500/25 bg-zinc-950/40 px-4 py-3"><JourneyObservabilitySnapshot journey={journey} /></div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => onNavigate('overview')} className="rounded-lg bg-cyan-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-cyan-300">Return to dashboard</button>
          <button type="button" onClick={() => onNavigate('export')} className="rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-300">Open handoff package</button>
          <button type="button" onClick={() => onNavigate('prompt')} className="rounded-lg border border-zinc-700 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800">Review implementation history</button>
        </div>
      </section>
      <JourneyObservability journey={journey} />
      <FeatureRegistry project={project} />
    </div>;
  }

  return <div className="feature-journey mx-auto max-w-5xl space-y-6 pb-12">
    {agentRunIsActive && <AgentRunLockNotice agentLabel={selectedAgent() ? localAgentLabel(selectedAgent()!) : 'Local agent'} />}
    <div className={agentRunIsActive ? 'agent-run-locked' : undefined} aria-busy={agentRunIsActive} inert={agentRunIsActive || undefined}>
    <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-zinc-900 p-5 md:p-7"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Spec-Kit Engine guided workflow</div><h1 className="mt-1 text-2xl font-bold text-zinc-100">Deliver one outcome without losing the thread</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">One stage at a time. Studio keeps scope, repository evidence, human approvals, and Engine work in the right order.</p><div className="mt-3"><JourneyObservabilitySnapshot journey={journey} /></div></div><div className="min-w-36 rounded-xl border border-cyan-500/25 bg-zinc-950/60 p-3 text-center"><div className="text-2xl font-black text-cyan-300">{progress}%</div><div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{completedCount} of 8 approved</div></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div></section>

    <DeliveryScopeBanner project={project} item={activeFeature} />

    {canApproveCurrentStage && <StageApprovalPreview stage={current} project={project} feature={activeFeature} />}

    <JourneyNextStep
      stage={current}
      title={currentTitle}
      outcome={currentOutcome}
      action={currentAction}
      canApprove={canApproveCurrentStage}
      readinessHint={storyScope && current.id === 2 ? 'Review this user story to create and accept its official single-story spec.md. Then approve Stage 2 to continue to Ground impact.' : current.readyHint}
      engineAction={engineInstructionForStage(current.id, project, deliveryPlanMode) ?? undefined}
      evidence={current.evidence}
      connectorToken={connectorToken}
      engineError={engineError}
      safetyMessages={safetyIssues.map((issue) => issue.message)}
      hasSelectedAgent={Boolean(selectedAgent())}
      isRunning={agentRunIsActive}
      isReconnecting={isReconnectingJourneyRun}
      hasRepository={Boolean(project.importedRepo?.repoUrl)}
      onStart={() => startStage(current)}
      onApprove={() => complete(current)}
      onConnectorTokenChange={(value) => { setConnectorToken(value); setConnectorSessionToken(value); }}
      onOpenWorkspace={() => onNavigate('workspace')}
      onGetHelp={() => requestStudioGuide(`Explain this Studio error and give me the safest next step: ${engineError}`)}
    />
    {agentJob && <AgentJobStatus job={agentJob} operationLabel={agentStageId === 8 ? 'Verification' : 'Agent'} preparingLabel={agentStageId === 8 ? 'Running deterministic handoff verification…' : `Running ${selectedAgent() ? localAgentLabel(selectedAgent()!) : 'local agent'} for Stage ${agentStageId || current.id}…`} />}

    {canStartFeatureIntake(current.id) && !activeFeature && <FeatureInbox project={project} onSelectFeature={(featureId) => { const selected = project.featureInbox?.find((item) => item.id === featureId); const now = new Date().toISOString(); onSaveJourney(selected?.journey ? { ...selected.journey, featureId, updatedAt: now } : { featureId, activeStage: 2, completedStages: journey.completedStages.includes(1) ? [1] : [], startedAt: now, updatedAt: now }); }} />}
    {acceptedNotice && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100"><strong>Saved.</strong> {acceptedNotice}</div>}

  {activeFeature && <ProgressiveDisclosure key={`${activeFeature.id}-${safetyIssues.length}`} className="journey-supporting-details rounded-2xl border p-1" tone="context" label="Feature details" summary={`${activeFeature.featureKey || 'Feature'} · evidence and delivery identity`} defaultOpen={safetyIssues.length > 0 || needsOfficialIdentityMigration}><section className="p-3 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Active feature identity</p><h2 className="mt-1 font-bold text-zinc-100">{activeFeature.title}</h2><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-cyan-200">{activeFeature.featureKey || 'Needs feature key'}</p><p className="mt-1 text-[11px] text-zinc-400">Feature key</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="break-all font-mono text-[11px] text-emerald-200">{featureArtifactRoot(activeFeature)}</p><p className="mt-1 text-[11px] text-zinc-400">Owned artifact folder</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="break-all font-mono text-[11px] text-zinc-200">{activeFeature.branch || 'Set branch before implementation'}</p><p className="mt-1 text-[11px] text-zinc-400">Expected branch</p></div></div>{(safetyIssues.length > 0 || needsOfficialIdentityMigration) && <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-amber-100"><p className="font-bold">{needsOfficialIdentityMigration ? 'Official Spec-Kit identity required' : 'Safety setup needed before agent execution'}</p>{safetyIssues.length > 0 && <ul className="mt-1 list-disc space-y-1 pl-4 text-amber-200">{safetyIssues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul>}{needsOfficialIdentityMigration && <p className="mt-1 text-amber-200">Move this feature's legacy artifact directory to an official numbered Spec-Kit path before approving artifacts.</p>}{(!activeFeature.featureKey || !activeFeature.slug || needsOfficialIdentityMigration) && <button type="button" onClick={() => { void migrateLegacyFeature(); }} disabled={isCreatingWorktree} className="mt-3 rounded-lg bg-amber-400 px-3 py-2 font-bold text-zinc-950 hover:bg-amber-300 disabled:opacity-50">{isCreatingWorktree ? 'Migrating feature identity…' : 'Migrate this feature safely'}</button>}</div>}{(activeFeature.impactMap?.acceptedAt || activeFeature.architecturePlan?.acceptedAt) && <div className="mt-3 grid gap-2 sm:grid-cols-2">{activeFeature.impactMap?.acceptedAt && <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-cyan-200">✓ Impact map accepted</p><p className="mt-1 text-[11px] text-zinc-400">Read-only architecture evidence retained for this feature.</p></div>}{activeFeature.architecturePlan?.acceptedAt && <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-emerald-200">✓ Feature plan accepted</p><p className="mt-1 text-[11px] text-zinc-400">This plan is scoped to this feature, not the shared workspace plan.</p></div>}</div>}</section></ProgressiveDisclosure>}
    {activeFeature && !activeFeature.worktreePath && current.id === 7 && <section className="rounded-2xl border border-amber-400/25 bg-amber-500/5 p-4 text-xs"><p className="font-bold text-amber-100">Create this feature’s isolated worktree</p><p className="mt-1 text-amber-200">Implementation stays separate from the shared checkout. Studio will carry this feature’s approved Spec-Kit artifacts into the new worktree. If the planning branch is already open, Studio creates a dedicated implementation branch automatically; it never moves or overwrites your current checkout.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={worktreePath} onChange={(event) => setWorktreePath(event.target.value)} placeholder="/absolute/allowed/path/to/feature-worktree" className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" /><button type="button" onClick={createFeatureWorktree} disabled={isCreatingWorktree || !worktreePath.trim()} className="rounded-lg bg-amber-400 px-3 py-2 font-bold text-zinc-950 disabled:opacity-50">{isCreatingWorktree ? 'Preparing isolated workspace…' : 'Create isolated worktree'}</button></div></section>}

    {activeFeature && needsLegacyJourneyRepair({ stageId: current.id, hasImpactMap: Boolean(activeFeature.impactMap?.acceptedAt), hasArchitecturePlan: Boolean(activeFeature.architecturePlan?.path), hasDeliveryPlan: Boolean(activeFeature.deliveryPlan?.acceptedAt) }) && <details className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><summary className="cursor-pointer font-bold text-amber-100">Some earlier Journey evidence needs attention</summary><p className="mt-1 text-amber-200">Your approved work is safe. Open only if you need to repair evidence created with an earlier Studio version.</p><div className="mt-4 space-y-3">{current.id > 3 && activeFeature && !activeFeature.impactMap?.acceptedAt && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Ground the impact map for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">This feature entered the Journey before Studio retained feature-scoped impact maps. Run the read-only review once, accept it, then continue without resetting approved work.</p><button type="button" onClick={() => runEngineStage(3)} disabled={isRunningEngine} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20 disabled:opacity-50">Run read-only impact map</button></section>}

    {current.id > 4 && activeFeature && !activeFeature.architecturePlan?.path && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Create an official architecture plan for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">Earlier Studio versions retained agent transcript output without an official <code>plan.md</code>. That output is not a feature plan. Return to Design safely; Studio will look for an existing <code>plan.md</code> before it ever offers Codex.</p><button type="button" onClick={() => reopenStage(4)} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20">Review architecture plan</button></section>}

    {current.id > 5 && activeFeature && !activeFeature.deliveryPlan?.acceptedAt && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Create the delivery tasks for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">Stage 5 was previously marked complete without retaining feature-scoped tasks. Studio will first look for an official <code>tasks.md</code>; only run Codex if none is found. Review and accept the result before continuing.</p><button type="button" onClick={() => reopenStage(5)} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20">Review delivery tasks</button></section>}</div></details>}

    {agentJob?.ok && (agentStageId === 2 || agentStageId === 3 || agentStageId === 4 || agentStageId === 5) && <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Review before accepting</p><h2 className="mt-1 font-bold text-zinc-100">{agentStageId === 2 ? 'Official single-story specification' : agentStageId === 3 ? 'Read-only impact map' : agentStageId === 4 ? 'Feature-scoped architecture plan' : 'Feature-scoped delivery tasks'} for {activeFeature?.title || 'the current feature'}</h2><p className="mt-1 text-zinc-300">Review the retained artifact below. Accepting links it to this feature; it does not approve the stage automatically.</p>{agentStageId !== 3 && officialArtifactFromAgentOutput(agentJob.output) ? <FeatureArtifactViewer content={officialArtifactFromAgentOutput(agentJob.output)!.content} artifactLabel={agentStageId === 2 ? 'spec.md' : agentStageId === 4 ? 'plan.md' : 'tasks.md'} sourcePath={officialArtifactFromAgentOutput(agentJob.output)!.path} reviewState="pending" /> : <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><summary className="cursor-pointer font-bold text-zinc-200">View technical agent output</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-300">{agentJob.output}</pre></details>}<button type="button" onClick={acceptEngineReview} className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300">Accept {agentStageId === 2 ? 'single-story specification' : agentStageId === 3 ? 'impact map' : agentStageId === 4 ? 'feature plan' : 'delivery tasks'}</button></section>}

    {discoveredArtifact && (current.id === 2 || current.id === 4 || current.id === 5) && <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Already prepared — no agent run needed</p><h2 className="mt-1 font-bold text-zinc-100">Studio found {discoveredArtifact.path}</h2><p className="mt-1 text-zinc-300">This is an existing official {current.id === 2 ? 'single-story specification' : current.id === 4 ? 'architecture plan' : 'delivery task board'} in the connected repository. Review it once and link it to <strong>{activeFeature?.title || 'the current feature'}</strong>. Running the agent would be redundant.</p><FeatureArtifactViewer content={discoveredArtifact.content} artifactLabel={current.id === 2 ? 'spec.md' : current.id === 4 ? 'plan.md' : 'tasks.md'} sourcePath={discoveredArtifact.path} reviewState="pending" /><button type="button" onClick={acceptDiscoveredArtifact} className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300">Accept existing {current.id === 2 ? 'specification' : current.id === 4 ? 'plan' : 'tasks'}</button></section>}

    {current.id > 5 && activeFeature?.deliveryPlan?.acceptedAt && <section className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Bounded planning option</p><h2 className="mt-1 font-bold text-zinc-100">Need a smaller delivery plan?</h2><p className="mt-1 max-w-3xl text-zinc-300">Reopen Stage 5 to ask Codex for an exact 3–12 task plan. Studio validates the count and retains only a reviewed, feature-scoped artifact.</p><button type="button" onClick={() => { setDeliveryPlanMode('compact'); reopenStage(5); }} disabled={agentRunIsActive} className="mt-3 rounded-lg border border-violet-300/40 bg-violet-500/20 px-3 py-2 font-bold text-violet-100 hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50">Configure bounded plan</button></section>}

    {current.id === 5 && <section className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Delivery plan size</p><h2 className="mt-1 font-bold text-zinc-100">Choose the right level of detail</h2><p className="mt-1 text-zinc-300">Both choices use your selected local agent in an isolated worktree and require review. Bounded mode asks Codex for an exact task count; Studio rejects rather than promotes a mismatched result.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className={`cursor-pointer rounded-lg border p-3 ${deliveryPlanMode === 'compact' ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/60'}`}><input className="sr-only" type="radio" name="delivery-plan-mode" checked={deliveryPlanMode === 'compact'} onChange={() => setDeliveryPlanMode('compact')} /><span className="font-bold text-cyan-100">Bounded Codex plan</span><span className="mt-1 block text-[11px] text-zinc-400">Choose exactly 3–12 repository-aware tasks below.</span></label><label className={`cursor-pointer rounded-lg border p-3 ${deliveryPlanMode === 'detailed' ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/60'}`}><input className="sr-only" type="radio" name="delivery-plan-mode" checked={deliveryPlanMode === 'detailed'} onChange={() => setDeliveryPlanMode('detailed')} /><span className="font-bold text-zinc-100">Detailed delivery plan</span><span className="mt-1 block text-[11px] text-zinc-400">Separate tasks for fixtures, implementation slices, and validation.</span></label></div>{deliveryPlanMode === 'compact' && <label className="mt-3 flex max-w-xs items-center gap-2 text-zinc-200">Tasks <input type="number" min={3} max={12} value={compactTaskCount} onChange={(event) => setCompactTaskCount(Math.max(3, Math.min(12, Number(event.target.value) || 3)))} className="w-16 rounded border border-cyan-400/40 bg-zinc-950 px-2 py-1 text-center text-cyan-100" /><span className="text-[11px] text-zinc-400">3–12</span></label>}{deliveryPlanMode === 'compact' && activeFeature?.deliveryPlan?.acceptedAt && <p className="mt-3 text-amber-200">Generating this plan replaces only this feature’s accepted <code>tasks.md</code> after your review; Stage 5 and later approvals will be reopened.</p>}</section>}


    <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" label="Journey progress" summary={`Stage ${current.id} of ${featureJourneyStages.length} · show all stages`}>
      <JourneyProgress stages={featureJourneyStages} journey={journey} currentStageId={current.id} readiness={readinessByStage} onReopenStage={requestStageReopen} />
    </ProgressiveDisclosure>

        <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" tone="complete" label="Human approval safeguard" summary="how Studio keeps you in control">
      <div className="flex gap-2 p-3 text-xs"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /><p><span className="font-bold text-zinc-200">Human gate:</span> Engine may prepare evidence and artifacts, but it never advances this journey on its own. You approve each completed stage after reviewing its output.</p></div>
        </ProgressiveDisclosure>
        <JourneyObservability journey={journey} />
        <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" tone="context" label="Feature registry" summary="concurrent work and delivery receipts">
      <FeatureRegistry project={project} />
    </ProgressiveDisclosure>
    </div>
  </div>;
}
