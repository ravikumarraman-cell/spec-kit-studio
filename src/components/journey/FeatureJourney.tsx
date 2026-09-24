import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CircleAlert, Play, ShieldCheck } from 'lucide-react';
import { FeatureJourney as JourneyState, SpecKitProject, ViewTab } from '../../types/speckit';
import { configuredConnectorClient, ConnectorJob, SpecKitArtifact } from '../../lib/connector';
import { LocalAgentStatus, localAgentLabel } from '../../lib/agentAvailability';
import { selectedRuntimeAgent } from '../../lib/runtimeAgents';
import { getConnectorSessionToken, setConnectorSessionToken } from '../../lib/connectorSession';
import { activeFeatureForProject, approveJourneyStage, createFeatureJourney, DeliveryPlanMode, engineInstructionForStage, FeatureJourneyStage, featureJourneyStages, featureIdForEnginePreflight, getJourneyStage, nextFeatureJourneyStage, reopenJourneyStage, repositoryPathForEngineStage, stageRequiresFeatureWorktree } from '../../lib/featureJourney';
import { FeatureInbox } from './FeatureInbox';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { AgentRunLockNotice } from '../common/AgentRunLockNotice';
import { isFeatureArtifactScoped } from '../../lib/featureArtifactScope';
import { parseFeatureDeliveryTasks } from '../../lib/featureDeliveryTasks';
import { JourneyProgress } from './JourneyProgress';
import { FeatureRegistry } from './FeatureRegistry';
import { canStartFeatureIntake, needsLegacyJourneyRepair } from '../../lib/workflowUx';
import { featureArtifactRoot, identityIssues, legacyFeatureIdentity } from '../../lib/projectIdentity';
import { readLocalAgentJobReference } from '../../lib/localAgentJobSession';
import { deliveryScope } from '../../lib/deliveryItems';
import { DeliveryScopeBanner } from './DeliveryScopeBanner';
import { officialFeatureDirectoryFromSpecPath, validateSpecKitArtifacts } from '../../lib/specKitCompliance';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';

function selectedAgent(): LocalAgentStatus | undefined { return selectedRuntimeAgent('planning'); }

function officialArtifactFromAgentOutput(output: string) {
  const match = output.match(/--- Official ([^\n]+) ---\n([\s\S]+)$/);
  return match ? { path: match[1].trim(), content: match[2].trim() } : null;
}

function legacyArchitectureSnapshot(project: SpecKitProject, feature: NonNullable<SpecKitProject['featureInbox']>[number]) {
  const sharedPlan = project.plan.markdown?.trim() || project.plan.architectureSummary?.trim() || 'No separate workspace plan text was retained.';
  return `# ${feature.title} — recovered legacy architecture context

> Recovered by Studio from the approved shared workspace architecture record. This is historical context for this feature; it was not regenerated and does not change repository files.

## Feature summary

${feature.summary}

## Shared architecture snapshot

${sharedPlan}`;
}

interface Props {
  project: SpecKitProject;
  onNavigate: (tab: ViewTab) => void;
  onOpenFeatureImport: () => void;
  onSaveJourney: (journey: JourneyState) => void;
  onSaveFeatureReview: (review: { specification?: { path?: string; content: string; acceptedAt?: string }; impactMap?: { content: string; acceptedAt?: string }; architecturePlan?: { path?: string; content: string; acceptedAt?: string }; deliveryPlan?: { path?: string; content: string; acceptedAt?: string; repositoryPath?: string } }) => void;
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
  hasRepository: boolean;
  onStart: () => void;
  onApprove: () => void;
  onConnectorTokenChange: (value: string) => void;
  onOpenWorkspace: () => void;
}

function JourneyNextStep({
  stage, title, outcome, action, canApprove, readinessHint, engineAction, evidence,
  connectorToken, engineError, safetyMessages, hasSelectedAgent, isRunning, hasRepository,
  onStart, onApprove, onConnectorTokenChange, onOpenWorkspace,
}: JourneyNextStepProps) {
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
          <button type="button" onClick={onOpenWorkspace} className="mt-2 font-bold underline">Open Connected Workspace</button>
        </div>}

        {safetyMessages.length > 0 && <div role="alert" className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100"><p className="font-bold">Safety setup needs attention</p><p className="mt-1">{safetyMessages[0]}</p>{safetyMessages.length > 1 && <p className="mt-1 text-amber-200">{safetyMessages.length - 1} additional item{ safetyMessages.length === 2 ? '' : 's' } available in Feature details.</p>}</div>}

        {!hasSelectedAgent && engineAction && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><CircleAlert className="h-4 w-4 shrink-0" />Scan Connected Workspace to detect a compatible local agent before running this stage.</p>}
        {!canApprove && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><CircleAlert className="h-4 w-4 shrink-0" />{readinessHint}</p>}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={onStart} disabled={isRunning} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-3.5 w-3.5" />{isRunning ? 'Working…' : action}</button>
          {canApprove && <button type="button" onClick={onApprove} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20"><CheckCircle2 className="h-3.5 w-3.5" />Approve this stage and continue</button>}
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
  const [isReplacingDeliveryPlan, setIsReplacingDeliveryPlan] = useState(false);
  const agentRunIsActive = isRunningEngine || agentJob?.status === 'running';
  const pendingImplementationJob = activeFeatureForProject(project)?.worktreePath
    ? readLocalAgentJobReference(project.id, activeFeatureForProject(project)!.id, activeFeatureForProject(project)!.worktreePath!)
    : null;
  const complete = (stage: typeof current) => {
    if (!stage.ready(project)) return;
    onSaveJourney(approveJourneyStage(journey, stage.id));
  };
  const reopenStage = (stageId: number) => onSaveJourney(reopenJourneyStage(journey, stageId));
  const startStage = (stage: FeatureJourneyStage) => {
    if (agentRunIsActive) return;
    // Implementation is intentionally a human task-selection step. Starting a
    // coding agent before the user can inspect and choose a delivery task is
    // unsafe and makes the task board invisible at the point of decision.
    if (stage.id === 7) { onNavigate(stage.destination); return; }
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
    if (!instruction || !agent || !repositoryPath) return;
    const stage = getJourneyStage(stageId);
    const compactReplacement = stageId === 5 && deliveryPlanMode === 'compact';
    const confirmation = compactReplacement
      ? `Generate a compact three-task demo plan for ${focusedFeature?.title}? This replaces only this feature's current tasks.md after you review and accept the result. It does not change application code.`
      : `Run ${localAgentLabel(agent)} for Stage ${stageId}: ${stage.title}? You will review the result before the journey advances.`;
    if (!window.confirm(confirmation)) return;
    setIsReplacingDeliveryPlan(compactReplacement && Boolean(focusedFeature?.deliveryPlan?.acceptedAt));
    setIsRunningEngine(true); setAgentJob(null); setEngineError('');
    setAgentStageId(stageId);
    try {
      setConnectorSessionToken(connectorToken);
      const client = configuredConnectorClient(connectorToken);
      // Stages 3–5 must be able to create and review feature artifacts in the
      // connected checkout. Passing a feature ID here would incorrectly demand
      // the implementation branch/worktree before implementation begins.
      const preflight = await client.preflight(repositoryPath, project, featureIdForEnginePreflight(stageId, focusedFeature?.id));
      if (!preflight.passed) throw new Error(preflight.errors.map((item) => item.message).join(' '));
      if (requiresFeatureWorktree && !preflight.evidence.isLinkedWorktree) throw new Error('Implementation is blocked in the main checkout. Create/select a linked Git worktree for this feature first.');
      if (stageId === 2 || stageId === 4 || stageId === 5) {
        const kind = stageId === 2 ? 'spec' : stageId === 4 ? 'plan' : 'tasks';
        const { artifacts } = await client.readSpecKitArtifacts(repositoryPath);
        const existingArtifact = artifacts
          .filter((item) => item.kind === kind && isFeatureArtifactScoped(item.content, activeFeature, item.path))
          .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
        if (existingArtifact && !compactReplacement) {
          setDiscoveredArtifact(existingArtifact);
          setAcceptedNotice(`Studio found the existing feature-scoped ${kind}.md. No agent was started; review and accept it when ready.`);
          return;
        }
      }
      // The connector performs its own authoritative preflight immediately
      // before starting an agent. It must receive the same stage-scoped
      // feature identity as the UI preflight above, otherwise planning would
      // incorrectly be rejected for not yet using an implementation worktree.
      let job = await client.startSpecKitAgent(repositoryPath, agent.id, instruction, project, featureIdForEnginePreflight(stageId, focusedFeature?.id));
      setAgentJob(job);
      while (job.status === 'running') { await new Promise((resolve) => window.setTimeout(resolve, 750)); job = await client.getJob(job.id); setAgentJob(job); }
      if (job.ok && (stageId === 2 || stageId === 4 || stageId === 5)) {
        const kind = stageId === 2 ? 'spec' : stageId === 4 ? 'plan' : 'tasks';
        const { artifacts } = await client.readSpecKitArtifacts(repositoryPath);
        const artifact = artifacts.filter((item) => item.kind === kind && isFeatureArtifactScoped(item.content, focusedFeature, item.path)).sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
        if (artifact) {
          job = { ...job, output: `${job.output}\n\n--- Official ${artifact.path} ---\n${artifact.content}` };
          setAgentJob(job);
        } else {
          setEngineError(`The agent completed, but no official ${kind}.md was found. Review its output before retrying; Studio did not create a substitute artifact.`);
        }
      }
      if (!job.ok) setEngineError(agentFailureGuidance(agent.id, job.output));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Studio could not run the local agent.';
      setEngineError(agentFailureGuidance(agent?.id || 'copilot', message));
    } finally { setIsRunningEngine(false); }
  };
  const completedCount = journey.completedStages.length;
  const progress = Math.round((completedCount / featureJourneyStages.length) * 100);
  const readiness = useMemo(() => featureJourneyStages.map((stage) => ({ stage, ready: stage.ready(project) })), [project]);
  const readinessByStage = useMemo(() => new Map(readiness.map(({ stage, ready }) => [stage.id, ready])), [readiness]);
  const activeFeature = activeFeatureForProject(project);
  const storyScope = Boolean(activeFeature && deliveryScope(activeFeature) === 'user-story');
  const reviewingImportedFeature = current.id === 2 && Boolean(activeFeature);
  const awaitingFeatureImport = current.id === 2 && !activeFeature;
  const storyStageTitles: Partial<Record<number, string>> = { 2: 'Confirm the user story', 3: "Ground this story's impact", 4: 'Design this use case', 5: 'Plan story delivery', 6: 'Validate story coverage', 7: 'Implement this story', 8: 'Verify and hand off this use case' };
  const currentTitle = awaitingFeatureImport ? 'Start delivery work' : reviewingImportedFeature ? storyScope ? 'Review and confirm the user story' : 'Review and confirm the feature' : storyScope ? storyStageTitles[current.id] || current.title : current.title;
  const currentOutcome = awaitingFeatureImport
    ? 'Start with one feature or one focused user story before delivery work begins.'
    : reviewingImportedFeature
    ? storyScope ? 'Confirm this story, its acceptance criteria, and only the requirements needed for this use case.' : 'Review the imported source, stories, requirements, and acceptance criteria before planning.'
    : current.outcome;
  const currentAction = awaitingFeatureImport ? 'Start delivery work' : reviewingImportedFeature ? storyScope ? 'Review user story' : 'Review imported feature with Engine' : current.action;
  const safetyIssues = identityIssues(project, activeFeature);
  const suggestedWorktreePath = activeFeature && project.importedRepo?.repoUrl
    ? `${project.importedRepo.repoUrl.replace(/\/+$/, '')}-${activeFeature.slug || 'feature'}`
    : '';
  const createFeatureWorktree = async () => {
    const repositoryPath = repositoryPathForEngineStage(current.id, project.importedRepo?.repoUrl, activeFeature?.worktreePath);
    if (!activeFeature || !repositoryPath) return;
    const branch = storyScope ? activeFeature.slug || '001-story' : `feat/${activeFeature.slug || 'feature'}`;
    if (!worktreePath.trim() || !window.confirm(`Create ${branch} in ${worktreePath}? Git will create a new linked worktree from the current commit.`)) return;
    setIsCreatingWorktree(true); setEngineError('');
    try {
      const result = await configuredConnectorClient(connectorToken).createWorktree(repositoryPath, worktreePath.trim(), branch);
      onUpdateFeatureIdentity(activeFeature.id, { branch: result.branch, worktreePath: result.repositoryPath, baselineCommit: result.baselineCommit });
      setAcceptedNotice(`Linked worktree registered for ${activeFeature.featureKey}. Re-open Connected Workspace using ${result.repositoryPath} before implementation.`);
    } catch (error) { setEngineError(error instanceof Error ? error.message : 'Studio could not create the worktree.'); }
    finally { setIsCreatingWorktree(false); }
  };
  const migrateLegacyFeature = () => {
    if (!activeFeature) return;
    const ordinal = (project.featureInbox || []).findIndex((feature) => feature.id === activeFeature.id);
    const identity = legacyFeatureIdentity(activeFeature, ordinal);
    onUpdateFeatureIdentity(activeFeature.id, identity);
    setAcceptedNotice(`Assigned ${identity.featureKey} and ${identity.slug}. Existing stage evidence was preserved.`);
  };
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
    client.readSpecKitArtifacts(repositoryPath).then(({ artifacts }) => setDiscoveredArtifact(artifacts.filter((item) => item.kind === expectedKind
      && isFeatureArtifactScoped(item.content, activeFeature, item.path)
      && (expectedKind !== 'tasks' || parseFeatureDeliveryTasks(item.content).length > 0))
      .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0] || null)).catch(() => setDiscoveredArtifact(null));
  }, [activeFeature, connectorToken, current.id, project.importedRepo?.repoUrl, storyScope]);
  useEffect(() => {
    // Prefer a durable, feature-scoped repository artifact over a duplicate
    // agent transcript. This can occur when the initial artifact scan and a
    // user click race each other; the repository artifact is the reviewable
    // record and must be the only approval path shown.
    if (discoveredArtifact && agentJob?.ok && (agentStageId === 2 || agentStageId === 4 || agentStageId === 5)) {
      setAgentJob(null);
      setAgentStageId(null);
    }
  }, [agentJob?.ok, agentStageId, discoveredArtifact]);
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
    if (!agentJob?.ok || !agentJob.output.trim()) return;
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
    if ((agentStageId === 4 || agentStageId === 5) && officialArtifact && activeFeature && storyScope) {
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
      if (parseFeatureDeliveryTasks(officialArtifact.content).length === 0) {
        setEngineError('Studio found tasks.md, but it contains no parseable task IDs. Stage 5 remains unapproved until the delivery plan includes individual T001-style tasks.');
        return;
      }
      onSaveFeatureReview({ deliveryPlan: { ...officialArtifact, acceptedAt, repositoryPath: repositoryPathForEngineStage(5, project.importedRepo?.repoUrl, activeFeature?.worktreePath) } });
    }
    if (agentStageId === 5 && isReplacingDeliveryPlan) onSaveJourney(reopenJourneyStage(journey, 5, acceptedAt));
    else if (agentStageId === 5 && journey.completedStages.includes(5)) onSaveJourney({ ...journey, activeStage: 6, updatedAt: acceptedAt });
    if (agentStageId === 4 && journey.completedStages.includes(4)) onSaveJourney({ ...journey, activeStage: 5, updatedAt: acceptedAt });
    setAcceptedNotice(agentStageId === 2 ? 'Official single-story specification accepted. You can now approve Stage 2.' : agentStageId === 3 ? 'Impact map accepted and saved to this feature. Next: run the feature-scoped architecture plan.' : agentStageId === 4 ? 'Feature plan accepted and saved to this feature. You can now approve Stage 4.' : isReplacingDeliveryPlan ? 'Compact delivery tasks accepted. Stage 5 and later approvals were reopened so you can review the new plan before continuing.' : 'Feature delivery tasks accepted and saved to this feature. You can now approve Stage 5.');
    setAgentJob(null);
    setAgentStageId(null);
    setIsReplacingDeliveryPlan(false);
  };
  const acceptDiscoveredArtifact = () => {
    if (!discoveredArtifact) return;
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
    if ((current.id === 4 || current.id === 5) && activeFeature && storyScope) {
      const kind = current.id === 4 ? 'plan' : 'tasks';
      const issues = validateSpecKitArtifacts(activeFeature, [discoveredArtifact], [kind]);
      if (issues.length) { setEngineError(issues.map((issue) => issue.message).join(' ')); return; }
    }
    if (current.id === 4) onSaveFeatureReview({ architecturePlan: { path: discoveredArtifact.path, content: discoveredArtifact.content, acceptedAt } });
    if (current.id === 5 && parseFeatureDeliveryTasks(discoveredArtifact.content).length === 0) {
      setEngineError('This tasks.md contains no parseable individual task IDs, so Studio cannot safely use it for implementation.');
      return;
    }
    if (current.id === 5) onSaveFeatureReview({
      deliveryPlan: {
        path: discoveredArtifact.path,
        content: discoveredArtifact.content,
        acceptedAt,
        repositoryPath: repositoryPathForEngineStage(5, project.importedRepo?.repoUrl, activeFeature?.worktreePath),
      },
    });
    if (current.id === 5 && journey.completedStages.includes(5)) onSaveJourney({ ...journey, activeStage: 6, updatedAt: acceptedAt });
    if (current.id === 4 && journey.completedStages.includes(4)) onSaveJourney({ ...journey, activeStage: 5, updatedAt: acceptedAt });
    setAcceptedNotice(current.id === 2
      ? 'Existing official single-story specification accepted. You can now approve Stage 2.'
      : current.id === 4
      ? 'Existing official plan accepted and linked to this feature. You can now approve Stage 4.'
      : 'Existing official tasks accepted and linked to this feature. You can now approve Stage 5.');
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
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => onNavigate('export')} className="rounded-lg bg-emerald-400 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-emerald-300">Open handoff package</button>
          <button type="button" onClick={() => onNavigate('prompt')} className="rounded-lg border border-zinc-700 px-4 py-2.5 text-xs font-bold text-zinc-200 hover:bg-zinc-800">Review implementation history</button>
        </div>
      </section>
      <FeatureRegistry project={project} />
    </div>;
  }

  return <div className="feature-journey mx-auto max-w-5xl space-y-6 pb-12">
    {agentRunIsActive && <AgentRunLockNotice agentLabel={selectedAgent() ? localAgentLabel(selectedAgent()!) : 'Local agent'} />}
    <div className={agentRunIsActive ? 'agent-run-locked' : undefined} aria-busy={agentRunIsActive} inert={agentRunIsActive || undefined}>
    <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-zinc-900 p-5 md:p-7"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Spec-Kit Engine guided workflow</div><h1 className="mt-1 text-2xl font-bold text-zinc-100">Deliver one outcome without losing the thread</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">One stage at a time. Studio keeps scope, repository evidence, human approvals, and Engine work in the right order.</p></div><div className="min-w-36 rounded-xl border border-cyan-500/25 bg-zinc-950/60 p-3 text-center"><div className="text-2xl font-black text-cyan-300">{progress}%</div><div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{completedCount} of 8 approved</div></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div></section>

    <DeliveryScopeBanner project={project} item={activeFeature} />

    <JourneyNextStep
      stage={current}
      title={currentTitle}
      outcome={currentOutcome}
      action={currentAction}
      canApprove={current.ready(project) && !journey.completedStages.includes(current.id)}
      readinessHint={current.readyHint}
      engineAction={engineInstructionForStage(current.id, project, deliveryPlanMode) ?? undefined}
      evidence={current.evidence}
      connectorToken={connectorToken}
      engineError={engineError}
      safetyMessages={safetyIssues.map((issue) => issue.message)}
      hasSelectedAgent={Boolean(selectedAgent())}
      isRunning={agentRunIsActive}
      hasRepository={Boolean(project.importedRepo?.repoUrl)}
      onStart={() => startStage(current)}
      onApprove={() => complete(current)}
      onConnectorTokenChange={(value) => { setConnectorToken(value); setConnectorSessionToken(value); }}
      onOpenWorkspace={() => onNavigate('workspace')}
    />
    {agentJob && <AgentJobStatus job={agentJob} preparingLabel={`Running ${selectedAgent() ? localAgentLabel(selectedAgent()!) : 'local agent'} for Stage ${agentStageId || current.id}…`} />}

    {canStartFeatureIntake(current.id) && <FeatureInbox project={project} onImport={onOpenFeatureImport} onNavigate={onNavigate} activeFeatureId={activeFeature?.id} onSelectFeature={(featureId) => { const selected = project.featureInbox?.find((item) => item.id === featureId); const now = new Date().toISOString(); onSaveJourney(selected?.journey ? { ...selected.journey, featureId, updatedAt: now } : { featureId, activeStage: 2, completedStages: journey.completedStages.includes(1) ? [1] : [], startedAt: now, updatedAt: now }); }} />}
    {acceptedNotice && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100"><strong>Saved.</strong> {acceptedNotice}</div>}

    {activeFeature && <ProgressiveDisclosure key={`${activeFeature.id}-${safetyIssues.length}`} className="journey-supporting-details rounded-2xl border p-1" tone="context" label="Feature details" summary={`${activeFeature.featureKey || 'Feature'} · evidence and delivery identity`} defaultOpen={safetyIssues.length > 0}><section className="p-3 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Active feature identity</p><h2 className="mt-1 font-bold text-zinc-100">{activeFeature.title}</h2><div className="mt-3 grid gap-2 sm:grid-cols-3"><div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-cyan-200">{activeFeature.featureKey || 'Needs feature key'}</p><p className="mt-1 text-[11px] text-zinc-400">Feature key</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="break-all font-mono text-[11px] text-emerald-200">{featureArtifactRoot(activeFeature)}</p><p className="mt-1 text-[11px] text-zinc-400">Owned artifact folder</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="break-all font-mono text-[11px] text-zinc-200">{activeFeature.branch || 'Set branch before implementation'}</p><p className="mt-1 text-[11px] text-zinc-400">Expected branch</p></div></div>{safetyIssues.length > 0 && <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-amber-100"><p className="font-bold">Safety setup needed before agent execution</p><ul className="mt-1 list-disc space-y-1 pl-4 text-amber-200">{safetyIssues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul>{(!activeFeature.featureKey || !activeFeature.slug) && <button type="button" onClick={migrateLegacyFeature} className="mt-3 rounded-lg bg-amber-400 px-3 py-2 font-bold text-zinc-950 hover:bg-amber-300">Migrate this existing feature safely</button>}</div>}{(activeFeature.impactMap?.acceptedAt || activeFeature.architecturePlan?.acceptedAt) && <div className="mt-3 grid gap-2 sm:grid-cols-2">{activeFeature.impactMap?.acceptedAt && <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-cyan-200">✓ Impact map accepted</p><p className="mt-1 text-[11px] text-zinc-400">Read-only architecture evidence retained for this feature.</p></div>}{activeFeature.architecturePlan?.acceptedAt && <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-emerald-200">✓ Feature plan accepted</p><p className="mt-1 text-[11px] text-zinc-400">This plan is scoped to this feature, not the shared workspace plan.</p></div>}</div>}</section></ProgressiveDisclosure>}
    {activeFeature && !activeFeature.worktreePath && current.id === 7 && <section className="rounded-2xl border border-amber-400/25 bg-amber-500/5 p-4 text-xs"><p className="font-bold text-amber-100">Create this feature’s isolated worktree</p><p className="mt-1 text-amber-200">Implementation is protected from the shared checkout. Studio has suggested a new sibling folder within the connector’s allowed roots; it must remain empty until Git creates the linked worktree.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={worktreePath} onChange={(event) => setWorktreePath(event.target.value)} placeholder="/absolute/allowed/path/to/feature-worktree" className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100" /><button type="button" onClick={createFeatureWorktree} disabled={isCreatingWorktree || !worktreePath.trim()} className="rounded-lg bg-amber-400 px-3 py-2 font-bold text-zinc-950 disabled:opacity-50">{isCreatingWorktree ? 'Creating…' : 'Create isolated worktree'}</button></div></section>}

    {activeFeature && needsLegacyJourneyRepair({ stageId: current.id, hasImpactMap: Boolean(activeFeature.impactMap?.acceptedAt), hasArchitecturePlan: Boolean(activeFeature.architecturePlan?.path), hasDeliveryPlan: Boolean(activeFeature.deliveryPlan?.acceptedAt) }) && <details className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><summary className="cursor-pointer font-bold text-amber-100">Some earlier Journey evidence needs attention</summary><p className="mt-1 text-amber-200">Your approved work is safe. Open only if you need to repair evidence created with an earlier Studio version.</p><div className="mt-4 space-y-3">{current.id > 3 && activeFeature && !activeFeature.impactMap?.acceptedAt && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Ground the impact map for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">This feature entered the Journey before Studio retained feature-scoped impact maps. Run the read-only review once, accept it, then continue without resetting approved work.</p><button type="button" onClick={() => runEngineStage(3)} disabled={isRunningEngine} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20 disabled:opacity-50">Run read-only impact map</button></section>}

    {current.id > 4 && activeFeature && !activeFeature.architecturePlan?.path && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Create an official architecture plan for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">Earlier Studio versions retained agent transcript output without an official <code>plan.md</code>. That output is not a feature plan. Return to Design safely; Studio will look for an existing <code>plan.md</code> before it ever offers Codex.</p><button type="button" onClick={() => reopenStage(4)} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20">Review architecture plan</button></section>}

    {current.id > 5 && activeFeature && !activeFeature.deliveryPlan?.acceptedAt && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Create the delivery tasks for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">Stage 5 was previously marked complete without retaining feature-scoped tasks. Studio will first look for an official <code>tasks.md</code>; only run Codex if none is found. Review and accept the result before continuing.</p><button type="button" onClick={() => reopenStage(5)} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20">Review delivery tasks</button></section>}</div></details>}

    {agentJob?.ok && (agentStageId === 3 || agentStageId === 4 || agentStageId === 5) && <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Review before accepting</p><h2 className="mt-1 font-bold text-zinc-100">{agentStageId === 3 ? 'Read-only impact map' : agentStageId === 4 ? 'Feature-scoped architecture plan' : 'Feature-scoped delivery tasks'} for {activeFeature?.title || 'the current feature'}</h2><p className="mt-1 text-zinc-300">Read the Engine result below. Accepting retains it with this imported feature and unlocks the next human approval; it does not approve the stage automatically.</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[10px] leading-relaxed text-zinc-300">{agentJob.output}</pre><button type="button" onClick={acceptEngineReview} className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300">Accept {agentStageId === 3 ? 'impact map' : agentStageId === 4 ? 'feature plan' : 'delivery tasks'}</button></section>}

    {discoveredArtifact && (current.id === 2 || current.id === 4 || current.id === 5) && <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Already prepared — no agent run needed</p><h2 className="mt-1 font-bold text-zinc-100">Studio found {discoveredArtifact.path}</h2><p className="mt-1 text-zinc-300">This is an existing official {current.id === 2 ? 'single-story specification' : current.id === 4 ? 'architecture plan' : 'delivery task board'} in the connected repository. Review it once and link it to <strong>{activeFeature?.title || 'the current feature'}</strong>. Running the agent would be redundant.</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[10px] leading-relaxed text-zinc-300">{discoveredArtifact.content}</pre><button type="button" onClick={acceptDiscoveredArtifact} className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300">Review and accept existing {current.id === 2 ? 'specification' : current.id === 4 ? 'plan' : 'tasks'}</button></section>}

    {current.id > 5 && activeFeature?.deliveryPlan?.acceptedAt && <section className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Demo planning option</p><h2 className="mt-1 font-bold text-zinc-100">Need a smaller delivery plan?</h2><p className="mt-1 max-w-3xl text-zinc-300">Reopen Stage 5 to choose a compact, three-task plan: confirm scope, implement the feature with focused coverage, then verify the change. It replaces only this feature’s task plan after review and reopens downstream approvals.</p><button type="button" onClick={() => { setDeliveryPlanMode('compact'); reopenStage(5); }} disabled={agentRunIsActive} className="mt-3 rounded-lg border border-violet-300/40 bg-violet-500/20 px-3 py-2 font-bold text-violet-100 hover:bg-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50">Create compact demo plan</button></section>}

    {current.id === 5 && <section className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Delivery plan size</p><h2 className="mt-1 font-bold text-zinc-100">Choose the right level of detail</h2><p className="mt-1 text-zinc-300">Both choices retain a feature-scoped plan and require review. Compact keeps verification inside three focused tasks instead of turning every testing concern into another Codex run.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className={`cursor-pointer rounded-lg border p-3 ${deliveryPlanMode === 'compact' ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/60'}`}><input className="sr-only" type="radio" name="delivery-plan-mode" checked={deliveryPlanMode === 'compact'} onChange={() => setDeliveryPlanMode('compact')} /><span className="font-bold text-cyan-100">Compact demo plan</span><span className="mt-1 block text-[11px] text-zinc-400">Exactly 3 tasks: scope, implementation with focused tests, verification.</span></label><label className={`cursor-pointer rounded-lg border p-3 ${deliveryPlanMode === 'detailed' ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-zinc-800 bg-zinc-950/60'}`}><input className="sr-only" type="radio" name="delivery-plan-mode" checked={deliveryPlanMode === 'detailed'} onChange={() => setDeliveryPlanMode('detailed')} /><span className="font-bold text-zinc-100">Detailed delivery plan</span><span className="mt-1 block text-[11px] text-zinc-400">Separate tasks for fixtures, implementation slices, and validation.</span></label></div>{deliveryPlanMode === 'compact' && activeFeature?.deliveryPlan?.acceptedAt && <p className="mt-3 text-amber-200">Generating the compact plan replaces only this feature’s accepted <code>tasks.md</code> after your review; Stage 5 and later approvals will be reopened.</p>}</section>}


    <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" label="Journey progress" summary={`Stage ${current.id} of ${featureJourneyStages.length} · show all stages`}>
      <JourneyProgress stages={featureJourneyStages} journey={journey} currentStageId={current.id} readiness={readinessByStage} />
    </ProgressiveDisclosure>

    <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" tone="complete" label="Human approval safeguard" summary="how Studio keeps you in control">
      <div className="flex gap-2 p-3 text-xs"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /><p><span className="font-bold text-zinc-200">Human gate:</span> Engine may prepare evidence and artifacts, but it never advances this journey on its own. You approve each completed stage after reviewing its output.</p></div>
    </ProgressiveDisclosure>
    <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" tone="context" label="Feature registry" summary="concurrent work and delivery receipts">
      <FeatureRegistry project={project} />
    </ProgressiveDisclosure>
    </div>
  </div>;
}
