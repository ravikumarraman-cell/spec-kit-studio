import React, { useState, useMemo, memo, useEffect, useRef } from 'react';
import {
  Bot,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Send,
  Code,
  Zap,
  RefreshCw,
  Cpu,
  Play,
  ShieldCheck,
  Square,
  FileCheck2
} from 'lucide-react';
import { FeatureImplementationReceipt, SpecKitProject, TaskItem } from '../../types/speckit';
import { EditorHeader } from '../common/EditorHeader';
import { useClipboard } from '../../hooks/useClipboard';
import { AgentTarget, portableFeatureTaskPrompt, portableTaskPrompt } from '../../lib/portablePrompts';
import { compactAgentPacket } from '../../lib/agentPromptBudget';
import { generationApi } from '../../lib/api/generation';
import { actionableFeatureDeliveryTasks, featureTaskExecutionMode, featureDeliveryReviewStatus, featureDeliveryTaskProgress, nextActionableFeatureDeliveryTask, parseFeatureDeliveryTasks } from '../../lib/featureDeliveryTasks';
import { isFeatureArtifactScoped } from '../../lib/featureArtifactScope';
import { activeConnectorJob, connectorPreflightProject, ConnectorJob, ConnectorJobEvidence, configuredConnectorClient, configuredConnectorUrl, repositoryEvidenceSnapshot } from '../../lib/connector';
import { waitForConnectorJob } from '../../lib/connectorJobPolling';
import { getConnectorSessionToken } from '../../lib/connectorSession';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { confirmStudioAction } from '../../lib/confirmation';
import { LocalAgentId, localAgentLabels } from '../../lib/agentAvailability';
import { changedFilesFromJobEvidence, DEFAULT_AGENT_FRAMEWORKS, jobFailureGuidance, mergeDiscoveredAgentFrameworks, verificationFindings } from '../../lib/agentRunPresentation';
import { TaskDecisionGate } from './TaskDecisionGate';
import { FeatureCodeChanges } from './FeatureCodeChanges';
import { FeatureImplementationHistory } from './FeatureImplementationHistory';
import { FeatureExecutionFocus } from './FeatureExecutionFocus';
import { FeatureTaskDecisionAnswers, decisionsComplete, featureTaskDecisionGate, formatApprovedDecisions, recommendedDecisionAnswers } from '../../lib/featureTaskDecisions';
import { featureImplementationBlocker, featureImplementationWorkspace } from '../../lib/featureWorktree';
import { activeFeatureForProject } from '../../lib/featureJourney';
import { useFeatureDeliveryPlanRecovery } from '../../hooks/useFeatureDeliveryPlanRecovery';
import { clearLocalAgentJobReference, readLocalAgentJobReference, saveLocalAgentJobReference } from '../../lib/localAgentJobSession';
import { useConnectorPollingAbort } from '../../hooks/useConnectorPollingAbort';
import { useSerialAsyncInterval } from '../../hooks/useSerialAsyncInterval';
import { useRuntimeAgentScan } from '../../hooks/useRuntimeAgents';
import { startRepositoryExecution } from '../../lib/repositoryExecution';

interface PromptStudioProps {
  project: SpecKitProject;
  initialTaskId?: string;
  onRecordFeatureImplementation: (featureId: string, receipt: FeatureImplementationReceipt) => boolean;
  onRecoverFeatureDeliveryPlan?: (plan: { path: string; content: string; acceptedAt: string; repositoryPath?: string }) => void;
  onOpenJourney?: () => void;
}

export const PromptStudio: React.FC<PromptStudioProps> = memo(({
  project,
  initialTaskId,
  onRecordFeatureImplementation,
  onRecoverFeatureDeliveryPlan,
  onOpenJourney,
}) => {
  const { beginPolling } = useConnectorPollingAbort();
  const runtimeAgentScan = useRuntimeAgentScan();
  const activeFeature = activeFeatureForProject(project);
  const implementationWorkspace = featureImplementationWorkspace(activeFeature);
  const implementationBlocker = featureImplementationBlocker(project, activeFeature);
  const featureTasks = useMemo(
    () => activeFeature?.deliveryPlan && isFeatureArtifactScoped(activeFeature.deliveryPlan.content, activeFeature, activeFeature.deliveryPlan.path)
      ? parseFeatureDeliveryTasks(activeFeature.deliveryPlan.content)
      : [],
    [activeFeature],
  );
  const [selectedAgent, setSelectedAgent] = useState<string>('Codex CLI');
  const agentFrameworks = useMemo(() => runtimeAgentScan.scanned ? mergeDiscoveredAgentFrameworks(runtimeAgentScan.agents) : DEFAULT_AGENT_FRAMEWORKS, [runtimeAgentScan]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [customNotes, setCustomNotes] = useState('');
  const [decisionAnswers, setDecisionAnswers] = useState<FeatureTaskDecisionAnswers>({});
  const [decisionsAccepted, setDecisionsAccepted] = useState(false);
  const { copied, copy } = useClipboard();

  // AI Simulation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSimulationOutput, setAiSimulationOutput] = useState<string | null>(null);
  const [codexJob, setCodexJob] = useState<ConnectorJob | null>(null);
  const [isRunningCodex, setIsRunningCodex] = useState(false);
  const [runError, setRunError] = useState('');
  const [hasReviewedResult, setHasReviewedResult] = useState(false);
  const [receiptSaved, setReceiptSaved] = useState(false);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);
  const [pendingReviewedTaskIds, setPendingReviewedTaskIds] = useState<string[]>([]);
  const [verificationJob, setVerificationJob] = useState<ConnectorJob | null>(null);
  const [recoveredEvidence, setRecoveredEvidence] = useState<ConnectorJobEvidence | null>(null);
  const [isRecoveringEvidence, setIsRecoveringEvidence] = useState(false);
  const [artifactFindings, setArtifactFindings] = useState<string[]>([]);
  const [hasConfirmedHumanReview, setHasConfirmedHumanReview] = useState(false);
  const reviewedImplementationRef = useRef<HTMLElement>(null);
  const executionFocusRef = useRef<HTMLElement>(null);

  const restoreActiveConnectorJob = async () => {
    const repositoryPath = implementationWorkspace;
    if (!repositoryPath || !activeFeature) return false;
    const reference = readLocalAgentJobReference(project.id, activeFeature.id, repositoryPath);
    let job: ConnectorJob | null = null;
    if (reference) {
      try {
        // `active` intentionally returns only writers that are still running.
        // The stored id lets us restore a terminal result for human review too.
        job = await configuredConnectorClient(getConnectorSessionToken()).getJob(reference.jobId);
        setSelectedTaskId(reference.taskId);
      } catch (error) {
        // Connector restarts discard its in-memory job history. Do not keep a
        // stale id, but preserve it for transient pairing/network failures.
        if (/job not found/i.test(error instanceof Error ? error.message : '')) {
          clearLocalAgentJobReference(project.id, activeFeature.id);
        }
      }
    }
    if (!job) job = await activeConnectorJob(
      configuredConnectorUrl(),
      getConnectorSessionToken(),
      repositoryPath,
    );
    if (!job) return false;
    setCodexJob(job);
    setIsRunningCodex(job.status === 'running');
    setCompletionNotice(job.status === 'running'
      ? 'Restored the active local run. Its live status is shown below.'
      : 'Restored the finished local run. Review its result below before recording the task.');
    return true;
  };

  useEffect(() => {
    restoreActiveConnectorJob().catch(() => undefined);
  // Reconnect when the connected repository changes. A repository has one active writer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [implementationWorkspace]);

  useFeatureDeliveryPlanRecovery(activeFeature, project.importedRepo?.repoUrl, onRecoverFeatureDeliveryPlan);

  useSerialAsyncInterval(async (isCurrent) => {
    if (!codexJob || codexJob.status !== 'running') return;
    try {
      const job = await configuredConnectorClient().getJob(codexJob.id);
      if (isCurrent()) {
        setCodexJob(job);
        setIsRunningCodex(job.status === 'running');
      }
    } catch {
      if (isCurrent()) setIsRunningCodex(false);
    }
  }, 750, Boolean(codexJob?.status === 'running'), `${codexJob?.id || ''}:${codexJob?.status || ''}`);

  useEffect(() => {
    const repositoryPath = implementationWorkspace;
    if (!codexJob || codexJob.ok || codexJob.status === 'running' || !repositoryPath || !activeFeature) {
      setArtifactFindings([]);
      return undefined;
    }
    let cancelled = false;
    configuredConnectorClient()
      .readSpecKitArtifacts(repositoryPath)
      .then(({ artifacts }) => {
        const plan = artifacts
          .filter((artifact) => artifact.kind === 'plan' && isFeatureArtifactScoped(artifact.content, activeFeature, artifact.path))
          .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
        if (!cancelled) setArtifactFindings(verificationFindings(plan?.content || ''));
      })
      .catch(() => { if (!cancelled) setArtifactFindings([]); });
    return () => { cancelled = true; };
  }, [codexJob?.id, codexJob?.status, codexJob?.ok, implementationWorkspace, activeFeature]);

  const reviewedFeatureTaskIds = useMemo(
    () => [...new Set([...(activeFeature?.implementationReceipts?.map((receipt) => receipt.taskId) || []), ...pendingReviewedTaskIds])],
    [activeFeature?.implementationReceipts, pendingReviewedTaskIds],
  );

  // Keep the current feature's just-recorded receipt in the local queue while
  // the persisted project state propagates. A feature change always begins
  // from that feature's durable receipt list instead.
  useEffect(() => {
    setPendingReviewedTaskIds([]);
  }, [activeFeature?.id]);
  const actionableFeatureTasks = useMemo(
    () => actionableFeatureDeliveryTasks(featureTasks, reviewedFeatureTaskIds),
    [featureTasks, reviewedFeatureTaskIds],
  );
  const featureTaskProgress = useMemo(
    () => featureDeliveryTaskProgress(featureTasks, reviewedFeatureTaskIds),
    [featureTasks, reviewedFeatureTaskIds],
  );
  const featureReviewStatus = useMemo(
    () => featureDeliveryReviewStatus(featureTasks, reviewedFeatureTaskIds),
    [featureTasks, reviewedFeatureTaskIds],
  );
  const allFeatureTasksReviewed = featureReviewStatus.complete;
  // Feature implementation is deliberately isolated from the workspace board.
  // A shared task can be useful general planning context, but it is never an
  // eligible implementation handoff or evidence for the active feature.
  const taskOptions = actionableFeatureTasks;

  // A task-board click is a one-time navigation hint, not a permanent lock on
  // the picker. Once a receipt is recorded, the regular next-actionable-task
  // rule must take over.
  useEffect(() => {
    if (initialTaskId) setSelectedTaskId(initialTaskId);
  }, [initialTaskId]);

  // Any surface can deep-link to an active task. Once the execution state is
  // restored, move focus to the live control rather than leaving people at the
  // top of a generic task picker.
  useEffect(() => {
    if (!initialTaskId || (!isRunningCodex && !codexJob)) return;
    const frame = window.requestAnimationFrame(() => {
      executionFocusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      executionFocusRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [codexJob, initialTaskId, isRunningCodex]);

  const selectedTask = useMemo(() => {
    return taskOptions.find((task) => task.id === selectedTaskId) || taskOptions[0];
  }, [selectedTaskId, taskOptions]);
  const selectedTaskExecutionMode = featureTaskExecutionMode(selectedTask);
  const isHumanApprovalTask = selectedTaskExecutionMode === 'human-approval';

  useEffect(() => {
    setHasConfirmedHumanReview(false);
  }, [selectedTask?.id]);

  useEffect(() => {
    if (taskOptions.length > 0 && !taskOptions.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(taskOptions[0].id);
    }
  }, [selectedTaskId, taskOptions]);

  const agentTarget: AgentTarget = selectedAgent.includes('Copilot') ? 'copilot' : selectedAgent.includes('Gemini') ? 'gemini' : selectedAgent.includes('Cursor') ? 'cursor' : selectedAgent.includes('Aider') || selectedAgent.includes('Codex') ? 'codex' : 'claude';
  const selectedLocalAgent = agentFrameworks.find((agent) => agent.name === selectedAgent)?.localAgent;
  const selectedAgentLabel = selectedLocalAgent ? localAgentLabels[selectedLocalAgent] : selectedAgent;
  const completedChangedFiles = codexJob ? changedFilesFromJobEvidence(codexJob) : [];
  const completedCodexRunNeedsReview = Boolean(codexJob?.ok && codexJob.status !== 'running' && !receiptSaved);
  const recoveredChangedFiles = recoveredEvidence?.changedFiles || [];
  const decisionGate = useMemo(
    () => activeFeature && selectedTask ? featureTaskDecisionGate(selectedTask.id) : undefined,
    [activeFeature, selectedTask],
  );
  const decisionStorageKey = decisionGate && activeFeature ? `speckit:feature-decisions:${activeFeature.id}:${decisionGate.taskId}` : '';
  const decisionsReady = decisionsComplete(decisionGate, decisionAnswers, decisionsAccepted);
  const approvedDecisionText = decisionsReady ? formatApprovedDecisions(decisionGate, decisionAnswers) : '';

  /** A successful agent run changes the user's job from execution to review.
   * Make that transition discoverable without implying that Studio approved
   * implementation or without exposing repeat execution as the next action. */
  useEffect(() => {
    if (!completedCodexRunNeedsReview) return;
    const frame = window.requestAnimationFrame(() => {
      reviewedImplementationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      reviewedImplementationRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [codexJob?.id, completedCodexRunNeedsReview]);

  useEffect(() => {
    if (!decisionStorageKey) {
      setDecisionAnswers({});
      setDecisionsAccepted(false);
      return;
    }
    try {
      const saved = JSON.parse(window.localStorage.getItem(decisionStorageKey) || '{}');
      const answers = { ...recommendedDecisionAnswers(decisionGate), ...(saved.answers || {}) };
      setDecisionAnswers(answers);
      setDecisionsAccepted(true);
      window.localStorage.setItem(decisionStorageKey, JSON.stringify({ answers, accepted: true }));
    } catch {
      setDecisionAnswers(recommendedDecisionAnswers(decisionGate));
      setDecisionsAccepted(true);
    }
  }, [decisionStorageKey]);

  const updateDecisionAnswer = (fieldId: string, value: string) => {
    const answers = { ...decisionAnswers, [fieldId]: value };
    setDecisionAnswers(answers);
    setDecisionsAccepted(true);
    if (decisionStorageKey) window.localStorage.setItem(decisionStorageKey, JSON.stringify({ answers, accepted: true }));
  };

  // Generated Master Prompt String: a portable implementation contract, not a promise of infallibility.
  const masterPrompt = useMemo(() => {
    if (activeFeature && featureTasks.length > 0 && selectedTask) {
      return compactAgentPacket(`${portableFeatureTaskPrompt(project, activeFeature, selectedTask as (typeof featureTasks)[number], agentTarget)}${approvedDecisionText ? `\n## Studio operational policy defaults\n${approvedDecisionText}\n\nTreat these as the chosen working policy for this task. Document any dependency that requires product or operations confirmation; do not invent a replacement policy.\n` : ''}${customNotes ? `\n## Additional instructions\n${customNotes}\n` : ''}`);
    }
    const fallback: TaskItem = { id: 'TASK', title: 'Implementation', description: 'Build task according to specification.', phase: 'Phase 1: Setup', status: 'todo', estimatedHours: 0, dependencies: [] };
    return compactAgentPacket(`${portableTaskPrompt(project, fallback, agentTarget)}${customNotes ? `\n## Additional instructions\n${customNotes}\n` : ''}`);
  }, [project, activeFeature, featureTasks.length, selectedTask, approvedDecisionText, customNotes, agentTarget]);

  const handleRunAiSimulation = async () => {
    setIsGenerating(true);
    setAiSimulationOutput(null);

    try {
      const data = await generationApi.generatePrompt({ targetAgent: selectedAgent, taskId: selectedTask?.id, taskTitle: selectedTask?.title, specSummary: activeFeature?.summary || project.spec.summary, constitution: project.constitution.rules.map((r) => r.ruleStatement).join('; '), techStack: project.plan.techStack.map((t) => t.technology) });
      setAiSimulationOutput(data.promptText || 'AI Agent prompt simulated successfully.');
    } catch (err: any) {
      setAiSimulationOutput('Failed to connect to AI server route: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const runCodexLocally = async () => {
    const repositoryPath = implementationWorkspace;
    if (implementationBlocker) {
      setRunError(implementationBlocker);
      return;
    }
    if (!activeFeature || !selectedTask || !repositoryPath || featureTasks.length === 0) {
      setRunError('Choose an accepted current-feature task and connect its repository before starting Codex.');
      return;
    }
    if (!selectedLocalAgent) return;
    if (isHumanApprovalTask) {
      setRunError(`${selectedTask.id} is a human approval gate. Record the reviewed approval below; Studio will not send it to an agent.`);
      return;
    }
    if (!decisionsReady) {
      setRunError(`Before ${selectedTask.id} can run, choose and explicitly confirm the required operational decisions above.`);
      return;
    }
    if (!await confirmStudioAction({ title: `Run ${selectedAgentLabel} for ${selectedTask.id}?`, description: 'It may edit only the connected repository. Studio will never commit or push.', confirmLabel: `Run ${selectedAgentLabel}`, tone: 'caution' })) return;
    setIsRunningCodex(true);
    setRunError('');
    setCodexJob(null);
    setRecoveredEvidence(null);
    setVerificationJob(null);
    setHasReviewedResult(false);
    setReceiptSaved(false);
    try {
      const client = configuredConnectorClient();
      // The connector only needs the immutable feature identity to verify the
      // worktree. Sending retained artifacts or prior agent output can exceed
      // its deliberately conservative request-size limit.
      const featureContext = connectorPreflightProject(project, activeFeature.id);
      let job = await startRepositoryExecution(client, repositoryPath, () => client.startLocalAgentTask(repositoryPath, selectedLocalAgent, selectedTask.id, activeFeature.title, masterPrompt, featureContext, activeFeature.id));
      saveLocalAgentJobReference({ jobId: job.id, projectId: project.id, featureId: activeFeature.id, taskId: selectedTask.id, repositoryPath });
      const polling = beginPolling();
      try { job = await waitForConnectorJob(job, client, setCodexJob, 750, undefined, polling.signal); }
      finally { polling.release(); }
      if (!job.ok) setRunError(agentFailureGuidance(selectedLocalAgent, job.output));
    } catch (error) {
      const detail = error instanceof Error ? error.message : `Studio could not start ${selectedAgentLabel} locally.`;
      if (/another studio job is already running/i.test(detail)) {
        try {
          if (await restoreActiveConnectorJob()) {
            setRunError('Studio restored the active local job below. Review its live output or stop it safely before starting another task.');
            return;
          }
        } catch {
          // Preserve the original actionable connector diagnostic below.
        }
      }
      setRunError(agentFailureGuidance(selectedLocalAgent, detail));
    } finally {
      setIsRunningCodex(false);
    }
  };

  const cancelCodexRun = async () => {
    if (!codexJob || codexJob.status !== 'running') return;
    try {
      const client = configuredConnectorClient();
      setCodexJob(await client.cancelJob(codexJob.id));
    } catch (error) {
      setRunError(agentFailureGuidance('codex', error instanceof Error ? error.message : 'Studio could not stop Codex.'));
    }
  };

  const runFeatureVerification = async () => {
    const repositoryPath = implementationWorkspace;
    if (!repositoryPath) { setRunError(featureImplementationBlocker(project, activeFeature) || 'Create an isolated worktree before verification.'); return; }
    setRunError('');
    try {
      const client = configuredConnectorClient();
      let job = await startRepositoryExecution(client, repositoryPath, () => client.startFeatureVerification(repositoryPath));
      const polling = beginPolling();
      try { job = await waitForConnectorJob(job, client, setVerificationJob, 750, undefined, polling.signal); }
      finally { polling.release(); }
      if (!job.ok) setRunError(agentFailureGuidance('codex', job.output));
    } catch (error) {
      setRunError(agentFailureGuidance('codex', error instanceof Error ? error.message : 'Studio could not run repository verification.'));
    }
  };

  const recoverTaskEvidence = async () => {
    const repositoryPath = implementationWorkspace;
    if (!repositoryPath || !selectedTask) { setRunError(featureImplementationBlocker(project, activeFeature) || 'Create an isolated worktree before recovering evidence.'); return; }
    setIsRecoveringEvidence(true);
    setRunError('');
    setRecoveredEvidence(null);
    setHasReviewedResult(false);
    setReceiptSaved(false);
    try {
      const evidence = await repositoryEvidenceSnapshot(
        configuredConnectorUrl(),
        getConnectorSessionToken(),
        repositoryPath,
      );
      setRecoveredEvidence(evidence);
      if (evidence.changedFiles.length === 0) {
        setRunError('Studio found no changed files in the current Git working tree. Do not record this task until you can verify its output.');
      }
    } catch (error) {
      setRunError(agentFailureGuidance(selectedLocalAgent || 'codex', error instanceof Error ? error.message : 'Studio could not read current repository evidence.'));
    } finally {
      setIsRecoveringEvidence(false);
    }
  };

  const retainReceipt = () => {
    const evidence = codexJob?.ok ? codexJob.evidence : recoveredEvidence;
    if (!evidence || !selectedTask || !hasReviewedResult || !activeFeature) return;
    const recordedTaskId = selectedTask.id;
    const nextTask = nextActionableFeatureDeliveryTask(featureTasks, reviewedFeatureTaskIds, recordedTaskId);
    const saved = onRecordFeatureImplementation(activeFeature.id, {
      taskId: recordedTaskId,
      jobId: codexJob?.ok ? codexJob.id : `recovered-${recordedTaskId}-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      ...(codexJob?.ok && codexJob.startedAt && codexJob.finishedAt ? { startedAt: codexJob.startedAt, finishedAt: codexJob.finishedAt } : {}),
      changedFiles: codexJob?.ok ? changedFilesFromJobEvidence(codexJob) : evidence.changedFiles,
      diffStat: evidence.diffStat || '',
      verificationSummary: codexJob?.ok
        ? (verificationJob?.output || codexJob.output).slice(-8_000)
        : `Recovered from a read-only Git evidence snapshot. Reviewer confirmed the current working-tree changes belong to ${recordedTaskId}.\n${(verificationJob?.output || evidence.repositoryStatus).slice(-8_000)}`,
    });
    if (!saved) {
      setRunError('Studio could not attach this receipt to the active feature. The task remains selected; do not rerun it until this is resolved.');
      return;
    }
    clearLocalAgentJobReference(project.id, activeFeature.id);
    // The receipt is retained by the parent before the finished-run UI is
    // cleared. Select only the next feature-scoped task; do not fall back to
    // the shared task board or leave the old evidence attached to a new task.
    setSelectedTaskId(nextTask?.id || '');
    setPendingReviewedTaskIds((current) => [...new Set([...current, recordedTaskId])]);
    setCodexJob(null);
    setVerificationJob(null);
    setRecoveredEvidence(null);
    setHasReviewedResult(false);
    setReceiptSaved(false);
    setCompletionNotice(nextTask
      ? `${recordedTaskId} was recorded. ${nextTask.id} is now selected as the next feature task.`
      : `${recordedTaskId} was recorded. All feature-scoped tasks now have reviewed evidence.`);
  };

  const retainHumanApproval = () => {
    if (!activeFeature || !selectedTask || !hasConfirmedHumanReview) return;
    const recordedTaskId = selectedTask.id;
    const nextTask = nextActionableFeatureDeliveryTask(featureTasks, reviewedFeatureTaskIds, recordedTaskId);
    const saved = onRecordFeatureImplementation(activeFeature.id, {
      taskId: recordedTaskId,
      jobId: `human-approval-${recordedTaskId}-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      changedFiles: [],
      diffStat: 'Human approval gate — no application-code change was requested or recorded.',
      verificationSummary: `Human approval gate for ${recordedTaskId}. Reviewer explicitly confirmed the feature specification and plan decisions before implementation began.`,
    });
    if (!saved) {
      setRunError('Studio could not attach this human-approval receipt to the active feature. The gate remains open; do not continue until it is resolved.');
      return;
    }
    setSelectedTaskId(nextTask?.id || '');
    setPendingReviewedTaskIds((current) => [...new Set([...current, recordedTaskId])]);
    setHasConfirmedHumanReview(false);
    setCompletionNotice(nextTask
      ? `${recordedTaskId} human approval was recorded. ${nextTask.id} is now selected as the next feature task.`
      : `${recordedTaskId} human approval was recorded. All feature-scoped tasks now have reviewed evidence.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* The active feature already supplies the meaningful page context. Keep
          the generic editor header only for the standalone workspace view. */}
      {!activeFeature && <EditorHeader
        icon={Bot}
        iconColor="text-purple-400"
        title="AI Agent Prompt Studio"
        subtitle="Prepare one evidence-grounded implementation handoff at a time."
        badgeLabel="Context Grounding"
        badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/20"
      />}

      {activeFeature && featureTasks.length > 0 && (
        <FeatureExecutionFocus
          title={activeFeature.title}
          summary={activeFeature.summary}
          readyTaskCount={featureTaskProgress.readyTaskCount}
          completedInPlanCount={featureTaskProgress.completedInPlanCount}
          reviewedReceiptCount={featureTaskProgress.reviewedReceiptCount}
          executionComplete={allFeatureTasksReviewed}
        />
      )}

      {completionNotice && (
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
          <span className="font-bold">Feature queue advanced.</span> {completionNotice}
        </div>
      )}

      {activeFeature && (activeFeature.implementationReceipts?.length || 0) > 0 && (
        <details className="implementation-evidence rounded-2xl border">
          <summary className="implementation-evidence__summary cursor-pointer px-5 py-4 text-xs font-bold">Previous implementation evidence <span className="implementation-evidence__meta ml-1 font-normal">Optional context · {activeFeature.implementationReceipts?.length || 0} reviewed task{activeFeature.implementationReceipts?.length === 1 ? '' : 's'}</span></summary>
          <div className="implementation-evidence__content space-y-5 border-t p-5">
            <FeatureImplementationHistory receipts={activeFeature.implementationReceipts || []} tasks={featureTasks} />
            <FeatureCodeChanges repositoryPath={implementationWorkspace || undefined} receipts={activeFeature.implementationReceipts || []} />
          </div>
        </details>
      )}

      {allFeatureTasksReviewed ? (
        <section className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-5 text-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Task execution complete</p>
              <h2 className="mt-1 text-lg font-bold text-emerald-100">All planned work has reviewed evidence</h2>
              <p className="mt-2 max-w-3xl leading-relaxed text-zinc-300">You are done running delivery tasks for this feature. The next step is a human Stage 7 review in the Feature Journey. It lets you inspect the retained receipts and then approve implementation; it will not rerun work, commit, or push.</p>
            </div>
            {onOpenJourney && <button type="button" onClick={onOpenJourney} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-zinc-950 hover:bg-emerald-300"><FileCheck2 className="h-4 w-4" />Review Stage 7 evidence</button>}
          </div>
          <p className="mt-4 border-t border-emerald-400/20 pt-3 text-[11px] text-emerald-100">{featureTaskProgress.reviewedReceiptCount} of {featureTasks.length} tasks have a Studio-reviewed receipt.</p>
        </section>
      ) : <>
      {/* One compact setup step. Detail is available on demand rather than
          competing with the run action below. */}
      <section className="implementation-setup rounded-2xl border p-5 text-xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="implementation-setup-eyebrow text-[10px] font-black uppercase tracking-[0.16em]">Before you run</p><h2 className="implementation-setup-title mt-1 text-base font-bold">Choose one approved task</h2><p className="implementation-setup-copy mt-1">Studio sends one bounded task at a time and keeps the rest of the plan out of the way.</p></div>
          {featureTasks.length > 0 && <span className="implementation-setup-summary rounded-lg px-3 py-2 font-semibold">{actionableFeatureTasks.length} task{actionableFeatureTasks.length === 1 ? '' : 's'} ready</span>}
        </div>
        <div className={`mt-4 grid gap-3 ${isHumanApprovalTask ? '' : 'md:grid-cols-2'}`}>
          <div>
            <label className="implementation-setup-label mb-2 block font-bold">Task</label>
          <select
            value={selectedTaskId}
            onChange={(e) => { setSelectedTaskId(e.target.value); setCompletionNotice(null); }}
            className="implementation-setup-select w-full rounded-xl px-3 py-2 font-medium focus:outline-none"
          >
            {taskOptions.map((task) => (
              <option key={task.id} value={task.id}>
                {task.id}{'requirementIds' in task && task.requirementIds.length ? ` [${task.requirementIds.join(', ')}]` : 'phase' in task ? ` [${task.phase}]` : ''}: {task.title}
              </option>
            ))}
          </select>
          </div>
          {!isHumanApprovalTask && <div><label className="implementation-setup-label mb-2 block font-bold">Agent</label><select value={selectedAgent} disabled={isRunningCodex} onChange={(event) => setSelectedAgent(event.target.value)} className="implementation-setup-select w-full rounded-xl px-3 py-2 font-medium focus:outline-none">{agentFrameworks.map((agent) => <option key={agent.name} value={agent.name}>{agent.name} — {agent.desc}</option>)}</select></div>}
        </div>
        {featureTasks.length === 0 && <p className="implementation-setup-alert mt-3 rounded-lg p-3 leading-relaxed">Studio cannot find a usable feature-scoped <code>tasks.md</code>. Return to Plan delivery to review the delivery plan.</p>}
        {featureTasks.length > 0 && actionableFeatureTasks.length === 0 && <p className="implementation-setup-success mt-3 rounded-lg p-3">All feature tasks already have reviewed evidence. There is nothing to rerun.</p>}
        {selectedTask && <details className="implementation-setup-details mt-3 rounded-xl"><summary className="cursor-pointer px-3 py-2.5 font-semibold">Task scope and requirements</summary><div className="border-t px-3 py-3 leading-relaxed"><p><strong>Feature:</strong> {activeFeature?.title || 'Current feature'}</p><p className="mt-1"><strong>Requirements:</strong> <span className="font-mono">{selectedTask.requirementIds.join(', ') || 'Read feature spec'}</span></p>{selectedTask.detail && <p className="mt-2">{selectedTask.detail}</p>}</div></details>}
        {!isHumanApprovalTask && <details className="implementation-setup-details mt-3 rounded-xl"><summary className="cursor-pointer px-3 py-2.5 font-semibold">Optional instructions for this task</summary><div className="border-t p-3"><label className="sr-only" htmlFor="implementation-notes">Optional instructions</label><input id="implementation-notes" type="text" placeholder="e.g. Use focused Jest coverage." value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} className="implementation-setup-select w-full rounded-xl px-3 py-2" /></div></details>}
      </section>

      {decisionGate && (
        <TaskDecisionGate
          gate={decisionGate}
          answers={decisionAnswers}
          onAnswerChange={updateDecisionAnswer}
        />
      )}


      {activeFeature && featureTasks.length > 0 && (
        <section ref={executionFocusRef} tabIndex={-1} className="implementation-handoff overflow-hidden rounded-2xl border shadow-[0_0_50px_rgba(34,211,238,0.06)]">
          <div className="implementation-handoff-header border-b p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="rounded-xl bg-cyan-400/15 p-2.5">{isHumanApprovalTask ? <FileCheck2 className="h-5 w-5 text-cyan-200" /> : <Terminal className="h-5 w-5 text-cyan-200" />}</div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{isHumanApprovalTask ? 'Human review gate · explicit approval required' : completedCodexRunNeedsReview ? 'Execution complete · review required' : 'Local execution · explicit approval required'}</p>
                  <h2 className="mt-1 text-base font-bold text-zinc-100">{isHumanApprovalTask ? `Approve ${selectedTask?.id || 'selected task'} before implementation` : completedCodexRunNeedsReview ? `Review ${selectedTask?.id || 'completed task'} before recording it` : selectedLocalAgent ? `Run ${selectedTask?.id || 'selected task'} with ${selectedAgentLabel}` : `Send ${selectedTask?.id || 'selected task'} to ${selectedAgentLabel}`}</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">{isHumanApprovalTask ? 'This official task is a product and traceability decision gate. Review the feature specification and plan, then record your approval. No agent run, code change, or Git recovery is needed.' : completedCodexRunNeedsReview ? 'Codex has finished. Studio moved you to the retained evidence below; review it and explicitly record the receipt before moving to another task.' : selectedLocalAgent ? `${selectedAgentLabel} runs through your loopback connector inside the connected repository. Studio streams its work, captures Git evidence, and never commits, pushes, or marks work complete on its own.` : `Studio prepares a portable, feature-scoped handoff for ${selectedAgentLabel}. Copy it into that agent; Studio does not pretend it can control an unconnected CLI.`}</p>
                </div>
              </div>
              <div className="implementation-handoff-safety rounded-lg border px-3 py-2 text-[11px]">{isHumanApprovalTask ? 'Human-review only' : selectedLocalAgent ? 'Workspace-write only' : 'Portable prompt only'}<br /><span>No commit · No push</span></div>
            </div>
            <details className="implementation-handoff-details mt-4 rounded-lg border text-[11px]"><summary className="cursor-pointer px-3 py-2.5 font-semibold">Task context and safety</summary><div className="grid gap-2 border-t p-3 sm:grid-cols-3"><div><span className="font-bold">Feature</span><p className="mt-1">{activeFeature.title}</p></div><div><span className="font-bold">Task</span><p className="mt-1 font-mono">{selectedTask?.id || 'Choose a task'}</p></div><div><span className="font-bold">{isHumanApprovalTask ? 'Required evidence' : 'Implementation worktree'}</span><p className="mt-1 truncate">{isHumanApprovalTask ? 'Reviewed feature spec and plan' : implementationWorkspace || 'Create isolated worktree first'}</p></div></div></details>
          </div>
          {!isHumanApprovalTask && !implementationWorkspace && <div className="mx-5 mt-5 rounded-xl border border-amber-400/35 bg-amber-500/10 p-4 text-xs text-amber-100"><p className="font-bold">Implementation is safely blocked until this feature has its own worktree.</p><p className="mt-1 text-amber-200">The shared repository checkout is read-only for this feature. No Codex run has been started from this screen.</p>{onOpenJourney && <button type="button" onClick={onOpenJourney} className="mt-3 rounded-lg bg-amber-300 px-3 py-2 font-bold text-zinc-950 hover:bg-amber-200">Set up isolated worktree</button>}</div>}
          <div className="flex flex-wrap items-center gap-3 p-5">
            {isHumanApprovalTask ? <><div className="w-full rounded-lg border border-cyan-400/25 bg-cyan-500/5 p-3 text-xs"><p className="font-bold text-cyan-100">Review the approved feature evidence before confirming</p><p className="mt-1 text-zinc-300">The Feature Journey holds the retained specification and architecture plan for this delivery item. Opening it does not change the task or approve anything.</p>{onOpenJourney && <button type="button" onClick={onOpenJourney} className="mt-3 rounded-lg border border-cyan-400/35 px-3 py-2 font-bold text-cyan-100 hover:bg-cyan-500/10">Review approved feature artifacts</button>}</div><label className="flex max-w-2xl items-start gap-2 text-xs text-zinc-200"><input type="checkbox" checked={hasConfirmedHumanReview} onChange={(event) => setHasConfirmedHumanReview(event.target.checked)} className="mt-0.5 accent-cyan-300" />I reviewed the feature specification and plan and confirm this human gate is approved for implementation.</label><button type="button" onClick={retainHumanApproval} disabled={!hasConfirmedHumanReview} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45"><FileCheck2 className="h-4 w-4" />Confirm review and record approval</button></> : completedCodexRunNeedsReview ? <button type="button" onClick={() => { reviewedImplementationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); reviewedImplementationRef.current?.focus({ preventScroll: true }); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-emerald-500/15 transition hover:bg-emerald-300"><FileCheck2 className="h-4 w-4" />Review completed work</button> : selectedLocalAgent ? <button type="button" onClick={runCodexLocally} disabled={isRunningCodex || Boolean(implementationBlocker) || !selectedTask || !decisionsReady} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-cyan-500/15 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"><Play className="h-4 w-4" />{isRunningCodex ? `${selectedAgentLabel} is running locally…` : implementationBlocker ? 'Set up worktree to run' : decisionsReady ? `Run with ${selectedAgentLabel} locally` : 'Confirm required decisions to run'}</button> : <button type="button" onClick={() => copy(masterPrompt)} disabled={!decisionsReady} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-cyan-500/15 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"><Copy className="h-4 w-4" />{copied ? 'Prompt copied' : decisionsReady ? `Copy handoff for ${selectedAgentLabel}` : 'Confirm required decisions to copy'}</button>}
            {isRunningCodex && <button type="button" onClick={cancelCodexRun} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-500/20"><Square className="h-3.5 w-3.5 fill-current" />Stop safely</button>}
            <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />{isHumanApprovalTask ? 'This receipt records a human decision, not application-code work.' : 'One task per handoff keeps scope and token use bounded.'}</span>
          </div>
          {!isHumanApprovalTask && !codexJob && !isRunningCodex && selectedTask && implementationWorkspace && (
            <details className="implementation-recovery mx-5 mb-5 rounded-xl border text-xs">
              <summary className="implementation-recovery__summary cursor-pointer px-4 py-3 font-semibold">Need to recover work completed outside Studio?</summary>
              <div className="implementation-recovery__content flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <p className="max-w-2xl leading-relaxed">Read the current Git evidence and retain a review receipt for <span className="implementation-recovery__task font-mono">{selectedTask.id}</span>. This is read-only: it does not run an agent, edit files, commit, or push. Use it only when this task was already completed outside Studio.</p>
                <button type="button" onClick={recoverTaskEvidence} disabled={isRecoveringEvidence} className="implementation-recovery__button inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isRecoveringEvidence ? 'animate-spin' : ''}`} />{isRecoveringEvidence ? 'Reading evidence…' : 'Recover external work evidence'}</button>
              </div>
            </details>
          )}
          {runError && <div className="mx-5 mb-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">{runError}</div>}
          {recoveredEvidence && !codexJob && <section className="mx-5 mb-5 rounded-xl border border-amber-300/35 bg-amber-400/5 p-4 text-xs">
            <p className="font-bold text-amber-100">Recovered repository evidence — verify before recording</p>
            <p className="mt-1 leading-relaxed text-zinc-400">This is a read-only snapshot of the current working tree, not a replay of the earlier agent. Review the files below and record it only if they belong to <span className="font-mono text-amber-100">{selectedTask?.id}</span>.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Changed files ({recoveredChangedFiles.length})</p><p className="mt-1 max-h-24 overflow-auto font-mono text-[10px] text-zinc-400">{recoveredChangedFiles.join('\n') || 'No source or artifact file changes were detected.'}</p></div><div className="rounded-lg bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Diff summary</p><pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-[10px] text-zinc-400">{recoveredEvidence.diffStat || (recoveredChangedFiles.length ? 'New or untracked files are listed at left; Git does not produce a diff stat until they are added.' : 'No diff summary was available.')}</pre></div></div>
            <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-cyan-100">Optional independent verification</p><p className="mt-1 text-[11px] text-zinc-400">Run the repository’s declared test command. It does not use agent tokens.</p></div><button type="button" onClick={runFeatureVerification} disabled={verificationJob?.status === 'running'} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50">{verificationJob?.status === 'running' ? 'Running verification…' : verificationJob?.ok ? 'Verification passed' : 'Run repository tests'}</button></div>{verificationJob && <AgentJobStatus job={verificationJob} preparingLabel="Running independent repository verification…" />}</div>
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-zinc-200"><input type="checkbox" checked={hasReviewedResult} onChange={(event) => setHasReviewedResult(event.target.checked)} className="mt-0.5 accent-amber-300" />I independently verified that these current working-tree changes belong to {selectedTask?.id}. I reviewed the files and any focused verification.</label>
            <button type="button" onClick={retainReceipt} disabled={!hasReviewedResult || receiptSaved || recoveredChangedFiles.length === 0} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"><FileCheck2 className="h-3.5 w-3.5" />{receiptSaved ? 'Implementation receipt saved' : 'Record recovered implementation'}</button>
            {receiptSaved && <p className="mt-2 text-[11px] text-emerald-200">The task is now recorded as reviewed and Studio will move to the next actionable task.</p>}
          </section>}
          {codexJob && <div className="px-5 pb-5"><AgentJobStatus job={codexJob} preparingLabel={`${selectedAgentLabel} is implementing ${selectedTask?.id || 'the selected task'} locally…`} />
            {!codexJob.ok && codexJob.status !== 'running' && (() => {
              const guidance = jobFailureGuidance(codexJob.output);
              const files = changedFilesFromJobEvidence(codexJob);
              const diagnostic = codexJob.output.trim().slice(-2_500);
              return <section className="mt-4 rounded-xl border border-amber-300/35 bg-amber-400/5 p-4 text-xs">
                <p className="font-bold text-amber-100">{guidance.heading}</p>
                <p className="mt-1 leading-relaxed text-zinc-300">{guidance.detail}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Changed files to review ({files.length})</p><pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-400">{files.join('\n') || 'No Git-tracked file changes were captured.'}</pre></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Last useful diagnostic</p><pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-zinc-400">{diagnostic || 'The local agent did not return diagnostic output.'}</pre></div></div>
                <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3"><p className="font-semibold text-amber-100">Recommended next action</p><p className="mt-1 leading-relaxed text-zinc-300">{guidance.next}</p><p className="mt-2 text-[11px] text-zinc-500">Do not record this task as reviewed yet. Studio will keep it actionable until a successful run is reviewed.</p></div>
                {artifactFindings.length > 0 && <div className="mt-3 rounded-lg border border-violet-400/20 bg-violet-500/5 p-3"><p className="font-semibold text-violet-100">Feature verification findings</p><p className="mt-1 text-[11px] text-zinc-400">Studio read the feature-scoped verification record and pulled out the unresolved items for you.</p><ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-zinc-300">{artifactFindings.map((finding, index) => <li key={`${index}-${finding}`}>{finding}</li>)}</ul></div>}
              </section>;
            })()}
            {codexJob.ok && <section ref={reviewedImplementationRef} tabIndex={-1} className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs outline-none" aria-label="Review completed implementation">
              <p className="font-bold text-emerald-100">Codex finished. Your next step is to review and record this implementation.</p>
              <ol className="mt-3 grid gap-2 sm:grid-cols-3" aria-label="Implementation completion progress"><li className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-2 font-semibold text-emerald-100">1. Codex complete</li><li className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-2 font-semibold text-cyan-100">2. Review evidence</li><li className="rounded-lg border border-zinc-700 bg-zinc-950/45 p-2 text-zinc-300">3. Record reviewed implementation</li></ol>
              <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Changed files ({completedChangedFiles.length})</p><p className="mt-1 max-h-20 overflow-auto font-mono text-[10px] text-zinc-400">{completedChangedFiles.join('\n') || 'No source or artifact file changes were detected.'}</p></div><div className="rounded-lg bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Diff summary</p><pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap text-[10px] text-zinc-400">{codexJob.evidence?.diffStat || (completedChangedFiles.length ? 'New or untracked files are listed at left; Git does not produce a diff stat until they are added.' : 'No diff summary was available.')}</pre></div></div>
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-cyan-100">Independent repository verification</p><p className="mt-1 text-[11px] text-zinc-400">Run the repository’s declared npm test script outside the agent. This does not use Codex tokens.</p></div><button type="button" onClick={runFeatureVerification} disabled={verificationJob?.status === 'running'} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50">{verificationJob?.status === 'running' ? 'Running verification…' : verificationJob?.ok ? 'Verification passed' : 'Run repository tests'}</button></div>{verificationJob && <AgentJobStatus job={verificationJob} preparingLabel="Running independent repository verification…" />}</div>
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-zinc-200"><input type="checkbox" checked={hasReviewedResult} onChange={(event) => setHasReviewedResult(event.target.checked)} className="mt-0.5 accent-emerald-400" />I reviewed the changed files, command output, and focused verification. This is evidence for {selectedTask?.id}, not an automatic approval.</label>
              <button type="button" onClick={retainReceipt} disabled={!hasReviewedResult || receiptSaved} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"><FileCheck2 className="h-3.5 w-3.5" />{receiptSaved ? 'Implementation receipt saved' : 'Record reviewed implementation'}</button>
              {receiptSaved && <p className="mt-2 text-[11px] text-emerald-200">Stage 7 now has reviewable evidence. Return to the Feature Journey when you are ready to approve the implementation stage.</p>}
              <details className="mt-4 border-t border-emerald-400/20 pt-3"><summary className="cursor-pointer font-semibold text-zinc-300">Need to run this task again?</summary><p className="mt-2 max-w-2xl leading-relaxed text-zinc-400">Use this only after reviewing the result and deciding it needs another attempt. Starting again replaces the current review state; Studio will still require a new reviewed receipt.</p><button type="button" onClick={runCodexLocally} disabled={isRunningCodex || Boolean(implementationBlocker) || !decisionsReady} className="mt-2 rounded-lg border border-zinc-600 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50">Run another attempt</button></details>
            </section>}
          </div>}
        </section>
      )}
      </>}

      {/* Portable prompt and Gemini are useful escape hatches, not part of the
          primary local-agent path. Keep them available without taking over
          the implementation screen. */}
      {!allFeatureTasksReviewed && !isHumanApprovalTask && <details className="implementation-prompt rounded-2xl border">
        <summary className="cursor-pointer px-5 py-4 text-xs font-semibold">View, copy, or simulate the portable task prompt <span className="ml-1 font-normal">Optional</span></summary>
        <div className="implementation-prompt-content space-y-3 border-t p-5">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pb-2 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-zinc-200">
              Compiled Task Prompt ({selectedAgent})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copy(masterPrompt)}
              className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1.5 text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Full Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={handleRunAiSimulation}
              disabled={isGenerating}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>{isGenerating ? 'Simulating...' : 'Simulate with Gemini'}</span>
            </button>
          </div>
        </div>

        <textarea
          rows={14}
          readOnly
          value={masterPrompt}
          className="w-full p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-cyan-300 font-mono text-xs focus:outline-none leading-relaxed resize-y cursor-text"
          spellCheck={false}
        />
        </div>
      </details>}

      {/* Simulated AI Output Panel */}
      {!isHumanApprovalTask && aiSimulationOutput && (
        <details open className="implementation-prompt rounded-2xl border">
          <summary className="cursor-pointer px-5 py-4 text-xs font-semibold">Optional Gemini simulation result</summary>
          <div className="implementation-prompt-content space-y-3 border-t p-5 text-xs">
          <div className="flex items-center justify-between font-bold text-purple-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Simulated AI Response Output (Server-side Gemini Pro)</span>
            </div>
            <button
              type="button"
              onClick={() => copy(aiSimulationOutput)}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 flex items-center gap-1 text-[11px] font-medium"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy Response</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
            {aiSimulationOutput}
          </div>
          </div>
        </details>
      )}
    </div>
  );
});

PromptStudio.displayName = 'PromptStudio';
