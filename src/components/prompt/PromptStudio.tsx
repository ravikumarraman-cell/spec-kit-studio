import React, { useState, useMemo, memo, useEffect } from 'react';
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
  ChevronDown,
  Play,
  ShieldCheck,
  Square,
  FileCheck2
} from 'lucide-react';
import { FeatureImplementationReceipt, SpecKitProject, TaskItem } from '../../types/speckit';
import { EditorHeader } from '../common/EditorHeader';
import { useClipboard } from '../../hooks/useClipboard';
import { AgentTarget, portableFeatureTaskPrompt, portableTaskPrompt } from '../../lib/portablePrompts';
import { generationApi } from '../../lib/api/generation';
import { actionableFeatureDeliveryTasks, parseFeatureDeliveryTasks } from '../../lib/featureDeliveryTasks';
import { isFeatureArtifactScoped } from '../../lib/featureArtifactScope';
import { activeConnectorJob, ConnectorJob, ConnectorJobEvidence, configuredConnectorClient, configuredConnectorUrl, repositoryEvidenceSnapshot } from '../../lib/connector';
import { getConnectorSessionToken } from '../../lib/connectorSession';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { LocalAgentId, localAgentLabels } from '../../lib/agentAvailability';
import { TaskDecisionGate } from './TaskDecisionGate';
import { FeatureCodeChanges } from './FeatureCodeChanges';
import { FeatureImplementationHistory } from './FeatureImplementationHistory';
import { FeatureExecutionFocus } from './FeatureExecutionFocus';
import { FeatureTaskDecisionAnswers, decisionsComplete, featureTaskDecisionGate, formatApprovedDecisions, recommendedDecisionAnswers } from '../../lib/featureTaskDecisions';

interface PromptStudioProps {
  project: SpecKitProject;
  initialTaskId?: string;
  onRecordFeatureImplementation: (receipt: FeatureImplementationReceipt) => void;
  onRecoverFeatureDeliveryPlan?: (plan: { path: string; content: string; acceptedAt: string }) => void;
}

const AGENT_FRAMEWORKS: { name: string; desc: string; localAgent?: LocalAgentId }[] = [
  { name: 'Codex CLI', desc: 'Runs locally through Studio with a scoped, reviewable task contract', localAgent: 'codex' },
  { name: 'Claude Code', desc: 'Runs locally through Studio when Claude Code is installed', localAgent: 'claude' },
  { name: 'GitHub Copilot CLI', desc: 'Runs locally through Studio when Copilot CLI is installed', localAgent: 'copilot' },
  { name: 'Gemini', desc: 'Portable handoff: copy the focused task prompt to Gemini' },
  { name: 'Cursor', desc: 'Portable handoff: copy the focused task prompt to Cursor' },
  { name: 'Windsurf / Aider', desc: 'Portable handoff: copy the focused task prompt to your local agent' },
];

function evidenceChangedFiles(job: ConnectorJob): string[] {
  const captured = job.evidence?.changedFiles || [];
  if (captured.length) return captured;
  // Older connector jobs captured only `git diff`, which omits newly created,
  // untracked files. Recover their paths from the retained porcelain status.
  return (job.evidence?.repositoryStatus || '').split('\n')
    .map((line) => line.slice(3).trim())
    .filter(Boolean)
    .map((file) => file.includes(' -> ') ? file.split(' -> ').at(-1) || file : file);
}

function jobFailureGuidance(output: string): { heading: string; detail: string; next: string } {
  const text = output.toLowerCase();
  if (/hang|timed out|stopped after|timeout/.test(text)) return {
    heading: 'Verification did not finish',
    detail: 'The run was stopped while a command was still waiting. Any changed files are retained below; no successful result has been recorded.',
    next: 'Review the changed files and the last diagnostic, then fix or isolate the slow check before retrying this task.',
  };
  if (/assertionerror|\bfailed\b|\berror\b/.test(text)) return {
    heading: 'One or more checks need attention',
    detail: 'The agent returned a non-success result. Studio preserved its evidence but will not treat the task as complete.',
    next: 'Use the last diagnostic and changed-file list below to make a focused correction, then retry only this task.',
  };
  return {
    heading: 'The run did not complete',
    detail: 'Studio preserved the available evidence. It cannot safely infer whether the task is complete.',
    next: 'Review the captured output and changed files before deciding whether to fix, retry, or discard partial work.',
  };
}

function verificationFindings(markdown: string): string[] {
  const heading = markdown.search(/^##\s+.*(?:verification|test).*(?:evidence|result|report)/im);
  if (heading < 0) return [];
  const remainder = markdown.slice(heading);
  const nextHeading = remainder.slice(3).search(/^##\s+/m);
  const section = nextHeading < 0 ? remainder : remainder.slice(0, nextHeading + 3);
  return section
    .split('\n')
    .filter((line) => /\b(fail(?:ed|ure)?|hang|unresolved|blocked|did not complete|not marked passed|interrupted)\b/i.test(line))
    .map((line) => line.replace(/^\s*[-*|]\s*/, '').replace(/\|/g, ' · ').replace(/`/g, '').trim())
    .filter((line) => line.length > 20)
    .slice(0, 8);
}

export const PromptStudio: React.FC<PromptStudioProps> = memo(({
  project,
  initialTaskId,
  onRecordFeatureImplementation,
  onRecoverFeatureDeliveryPlan,
}) => {
  const activeFeature = project.featureInbox?.at(-1);
  const featureTasks = useMemo(
    () => activeFeature?.deliveryPlan && isFeatureArtifactScoped(activeFeature.deliveryPlan.content, activeFeature, activeFeature.deliveryPlan.path)
      ? parseFeatureDeliveryTasks(activeFeature.deliveryPlan.content)
      : [],
    [activeFeature],
  );
  const [useSharedTasks, setUseSharedTasks] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('Codex CLI');
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
  const [verificationJob, setVerificationJob] = useState<ConnectorJob | null>(null);
  const [recoveredEvidence, setRecoveredEvidence] = useState<ConnectorJobEvidence | null>(null);
  const [isRecoveringEvidence, setIsRecoveringEvidence] = useState(false);
  const [artifactFindings, setArtifactFindings] = useState<string[]>([]);

  const restoreActiveConnectorJob = async () => {
    const repositoryPath = activeFeature?.worktreePath || project.importedRepo?.repoUrl;
    if (!repositoryPath) return false;
    const job = await activeConnectorJob(
      configuredConnectorUrl(),
      getConnectorSessionToken(),
      repositoryPath,
    );
    if (!job) return false;
    setCodexJob(job);
    setIsRunningCodex(job.status === 'running');
    return true;
  };

  useEffect(() => {
    restoreActiveConnectorJob().catch(() => undefined);
  // Reconnect when the connected repository changes. A repository has one active writer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.importedRepo?.repoUrl]);

  useEffect(() => {
    const repositoryPaths = [...new Set([activeFeature?.worktreePath, project.importedRepo?.repoUrl].filter((path): path is string => Boolean(path)))];
    if (!activeFeature || repositoryPaths.length === 0 || !onRecoverFeatureDeliveryPlan
      || (activeFeature.deliveryPlan?.acceptedAt && isFeatureArtifactScoped(activeFeature.deliveryPlan.content, activeFeature, activeFeature.deliveryPlan.path) && parseFeatureDeliveryTasks(activeFeature.deliveryPlan.content).length > 0)) return;
    let cancelled = false;
    Promise.allSettled(repositoryPaths.map((repositoryPath) => configuredConnectorClient(getConnectorSessionToken()).readSpecKitArtifacts(repositoryPath)))
      .then((results) => {
        const recovered = results
          .flatMap((result) => result.status === 'fulfilled' ? result.value.artifacts : [])
          .filter((artifact) => artifact.kind === 'tasks'
            && isFeatureArtifactScoped(artifact.content, activeFeature, artifact.path)
            && parseFeatureDeliveryTasks(artifact.content).length > 0)
          .sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
        if (!cancelled && recovered) onRecoverFeatureDeliveryPlan({ path: recovered.path, content: recovered.content, acceptedAt: new Date().toISOString() });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [activeFeature, onRecoverFeatureDeliveryPlan, project.importedRepo?.repoUrl]);

  useEffect(() => {
    if (!codexJob || codexJob.status !== 'running') return;
    let cancelled = false;
    const client = configuredConnectorClient();
    const refresh = async () => {
      try {
        const job = await client.getJob(codexJob.id);
        if (!cancelled) {
          setCodexJob(job);
          setIsRunningCodex(job.status === 'running');
        }
      } catch {
        if (!cancelled) setIsRunningCodex(false);
      }
    };
    const timer = window.setInterval(refresh, 750);
    void refresh();
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [codexJob?.id, codexJob?.status]);

  useEffect(() => {
    const repositoryPath = activeFeature?.worktreePath || project.importedRepo?.repoUrl;
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
  }, [codexJob?.id, codexJob?.status, codexJob?.ok, project.importedRepo?.repoUrl, activeFeature]);

  const reviewedFeatureTaskIds = useMemo(
    () => activeFeature?.implementationReceipts?.map((receipt) => receipt.taskId) || [],
    [activeFeature?.implementationReceipts],
  );
  const actionableFeatureTasks = useMemo(
    () => actionableFeatureDeliveryTasks(featureTasks, reviewedFeatureTaskIds),
    [featureTasks, reviewedFeatureTaskIds],
  );
  // A feature implementation run must never quietly fall back to the shared
  // workspace board. That board may contain unrelated historical tasks.
  const taskOptions = useSharedTasks ? project.tasks.tasks : actionableFeatureTasks;

  // A task-board click is a one-time navigation hint, not a permanent lock on
  // the picker. Once a receipt is recorded, the regular next-actionable-task
  // rule must take over.
  useEffect(() => {
    if (initialTaskId) setSelectedTaskId(initialTaskId);
  }, [initialTaskId]);

  const selectedTask = useMemo(() => {
    return taskOptions.find((task) => task.id === selectedTaskId) || taskOptions[0];
  }, [selectedTaskId, taskOptions]);

  useEffect(() => {
    if (taskOptions.length > 0 && !taskOptions.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(taskOptions[0].id);
    }
  }, [selectedTaskId, taskOptions]);

  const agentTarget: AgentTarget = selectedAgent.includes('Copilot') ? 'copilot' : selectedAgent.includes('Gemini') ? 'gemini' : selectedAgent.includes('Cursor') ? 'cursor' : selectedAgent.includes('Aider') || selectedAgent.includes('Codex') ? 'codex' : 'claude';
  const selectedLocalAgent = AGENT_FRAMEWORKS.find((agent) => agent.name === selectedAgent)?.localAgent;
  const selectedAgentLabel = selectedLocalAgent ? localAgentLabels[selectedLocalAgent] : selectedAgent;
  const completedChangedFiles = codexJob ? evidenceChangedFiles(codexJob) : [];
  const recoveredChangedFiles = recoveredEvidence?.changedFiles || [];
  const decisionGate = useMemo(
    () => !useSharedTasks && activeFeature && selectedTask ? featureTaskDecisionGate(selectedTask.id) : undefined,
    [useSharedTasks, activeFeature, selectedTask],
  );
  const decisionStorageKey = decisionGate && activeFeature ? `speckit:feature-decisions:${activeFeature.id}:${decisionGate.taskId}` : '';
  const decisionsReady = decisionsComplete(decisionGate, decisionAnswers, decisionsAccepted);
  const approvedDecisionText = decisionsReady ? formatApprovedDecisions(decisionGate, decisionAnswers) : '';

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
    if (activeFeature && featureTasks.length > 0 && !useSharedTasks && selectedTask) {
      return `${portableFeatureTaskPrompt(project, activeFeature, selectedTask as (typeof featureTasks)[number], agentTarget)}${approvedDecisionText ? `\n## Studio operational policy defaults\n${approvedDecisionText}\n\nTreat these as the chosen working policy for this task. Document any dependency that requires product or operations confirmation; do not invent a replacement policy.\n` : ''}${customNotes ? `\n## Additional instructions\n${customNotes}\n` : ''}`;
    }
    const fallback = selectedTask as TaskItem || { id: 'TASK', title: 'Implementation', description: 'Build task according to specification.', phase: 'Phase 1: Setup', status: 'todo', estimatedHours: 0, dependencies: [] };
    return `${portableTaskPrompt(project, fallback, agentTarget)}${customNotes ? `\n## Additional instructions\n${customNotes}\n` : ''}`;
  }, [project, activeFeature, featureTasks.length, useSharedTasks, selectedTask, approvedDecisionText, customNotes, agentTarget]);

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
    const repositoryPath = project.importedRepo?.repoUrl;
    if (!activeFeature || !selectedTask || !repositoryPath || useSharedTasks || featureTasks.length === 0) {
      setRunError('Choose an accepted current-feature task and connect its repository before starting Codex.');
      return;
    }
    if (!selectedLocalAgent) return;
    if (!decisionsReady) {
      setRunError(`Before ${selectedTask.id} can run, choose and explicitly confirm the required operational decisions above.`);
      return;
    }
    if (!window.confirm(`Run ${selectedAgentLabel} locally for ${selectedTask.id}? It may edit only the connected repository. Studio will never commit or push.`)) return;
    setIsRunningCodex(true);
    setRunError('');
    setCodexJob(null);
    setRecoveredEvidence(null);
    setVerificationJob(null);
    setHasReviewedResult(false);
    setReceiptSaved(false);
    try {
      const client = configuredConnectorClient();
      let job = await client.startLocalAgentTask(repositoryPath, selectedLocalAgent, selectedTask.id, activeFeature.title, masterPrompt, project, activeFeature.id);
      setCodexJob(job);
      while (job.status === 'running') {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        job = await client.getJob(job.id);
        setCodexJob(job);
      }
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
    const repositoryPath = project.importedRepo?.repoUrl;
    if (!repositoryPath) return;
    setRunError('');
    try {
      const client = configuredConnectorClient();
      let job = await client.startFeatureVerification(repositoryPath);
      setVerificationJob(job);
      while (job.status === 'running') {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        job = await client.getJob(job.id);
        setVerificationJob(job);
      }
      if (!job.ok) setRunError(agentFailureGuidance('codex', job.output));
    } catch (error) {
      setRunError(agentFailureGuidance('codex', error instanceof Error ? error.message : 'Studio could not run repository verification.'));
    }
  };

  const recoverTaskEvidence = async () => {
    const repositoryPath = project.importedRepo?.repoUrl;
    if (!repositoryPath || !selectedTask) return;
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
    if (!evidence || !selectedTask || !hasReviewedResult) return;
    onRecordFeatureImplementation({
      taskId: selectedTask.id,
      jobId: codexJob?.ok ? codexJob.id : `recovered-${selectedTask.id}-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      changedFiles: codexJob?.ok ? evidenceChangedFiles(codexJob) : evidence.changedFiles,
      diffStat: evidence.diffStat || '',
      verificationSummary: codexJob?.ok
        ? (verificationJob?.output || codexJob.output).slice(-8_000)
        : `Recovered from a read-only Git evidence snapshot. Reviewer confirmed the current working-tree changes belong to ${selectedTask.id}.\n${(verificationJob?.output || evidence.repositoryStatus).slice(-8_000)}`,
    });
    setReceiptSaved(true);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Editor Header */}
      <EditorHeader
        icon={Bot}
        iconColor="text-purple-400"
        title="AI Agent Prompt Studio"
        subtitle="Prepare one evidence-grounded implementation handoff at a time. The active feature stays in focus."
        badgeLabel="Context Grounding"
        badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/20"
      />

      {activeFeature && featureTasks.length > 0 && !useSharedTasks && (
        <FeatureExecutionFocus
          title={activeFeature.title}
          summary={activeFeature.summary}
          readyTaskCount={actionableFeatureTasks.length}
          reviewedTaskCount={featureTasks.length - actionableFeatureTasks.length}
        />
      )}

      {activeFeature && !useSharedTasks && (
        <details className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <summary className="cursor-pointer px-5 py-4 text-xs font-bold text-zinc-300 hover:text-zinc-100">Previous implementation evidence <span className="ml-1 font-normal text-zinc-500">Optional context · {activeFeature.implementationReceipts?.length || 0} reviewed task{activeFeature.implementationReceipts?.length === 1 ? '' : 's'}</span></summary>
          <div className="space-y-5 border-t border-zinc-800 p-5">
            <FeatureImplementationHistory receipts={activeFeature.implementationReceipts || []} tasks={featureTasks} />
            <FeatureCodeChanges repositoryPath={project.importedRepo?.repoUrl} receipts={activeFeature.implementationReceipts || []} />
          </div>
        </details>
      )}

      {/* Target Task and Agent Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Task Selection */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <label className="font-bold text-zinc-200 block">{useSharedTasks ? 'Select shared workspace task' : 'Select feature task to implement'}</label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-medium focus:outline-none focus:border-purple-500/50"
          >
            {taskOptions.map((task) => (
              <option key={task.id} value={task.id}>
                {task.id}{'requirementIds' in task && task.requirementIds.length ? ` [${task.requirementIds.join(', ')}]` : 'phase' in task ? ` [${task.phase}]` : ''}: {task.title}
              </option>
            ))}
          </select>

          {!useSharedTasks && featureTasks.length === 0 && (
            <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-100">Studio cannot find a parseable feature-scoped <code>tasks.md</code> yet. It is checking the connected repository now; do not use the shared workspace task as a substitute. If this message remains after a refresh, return to Stage 5 and review the feature delivery plan.</p>
          )}

          {!useSharedTasks && featureTasks.length > 0 && actionableFeatureTasks.length === 0 && (
            <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3 text-[11px] text-emerald-100">All feature tasks are already complete or have reviewed implementation receipts. There is nothing to rerun.</p>
          )}

          {selectedTask && (
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 text-[11px]">
              <div className="text-zinc-400">
                Scope: <strong className="text-zinc-200">{useSharedTasks ? ('phase' in selectedTask ? selectedTask.phase : 'Shared workspace') : activeFeature?.title || 'Current feature'}</strong>
              </div>
              <div className="text-zinc-400">
                Requirement{(('requirementIds' in selectedTask && selectedTask.requirementIds.length > 1) ? 's' : '')}:{' '}
                <strong className="text-cyan-400 font-mono">
                  {'requirementIds' in selectedTask ? selectedTask.requirementIds.join(', ') || 'Read feature spec' : selectedTask.mappedRequirementId || 'None'}
                </strong>
              </div>
              {'description' in selectedTask && <p className="text-zinc-300 leading-snug">{selectedTask.description}</p>}
            </div>
          )}

          {activeFeature && featureTasks.length > 0 && (
            <details className="group pt-1">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-300"><ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />Other workspace work</summary>
              <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-[11px] text-zinc-400">
                Shared tasks are not evidence for {activeFeature.title}. <button type="button" onClick={() => { setUseSharedTasks(true); setSelectedTaskId(project.tasks.tasks[0]?.id || ''); }} className="ml-1 font-semibold text-violet-300 hover:text-violet-200">Open shared tasks intentionally</button>
                {useSharedTasks && <button type="button" onClick={() => { setUseSharedTasks(false); setSelectedTaskId(actionableFeatureTasks[0]?.id || ''); }} className="ml-2 font-semibold text-cyan-300 hover:text-cyan-200">Return to feature tasks</button>}
              </div>
            </details>
          )}
        </div>

        {/* Agent Profile Selector */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
          <label className="font-bold text-zinc-200 block">Target Agent Architecture</label>
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
            {AGENT_FRAMEWORKS.map((agent) => (
              <div
                key={agent.name}
                onClick={() => { if (!isRunningCodex) setSelectedAgent(agent.name); }}
                className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${isRunningCodex ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                  selectedAgent === agent.name
                    ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                    : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-semibold text-zinc-200">{agent.name}</div>
                  <div className="text-[10px] text-zinc-500">{agent.desc}</div>
                </div>
                {selectedAgent === agent.name && (
                  <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {decisionGate && (
        <TaskDecisionGate
          gate={decisionGate}
          answers={decisionAnswers}
          onAnswerChange={updateDecisionAnswer}
        />
      )}

      {/* Additional Instructions */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs">
        <label className="font-bold text-zinc-300 block">
          Custom Directives & Extra Task Instructions (Optional)
        </label>
        <input
          type="text"
          placeholder="e.g. Ensure strict type narrowing and provide Jest unit tests."
          value={customNotes}
          onChange={(e) => setCustomNotes(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500/50"
        />
      </div>

      {activeFeature && featureTasks.length > 0 && !useSharedTasks && (
        <section className="overflow-hidden rounded-2xl border border-cyan-400/35 bg-zinc-950 shadow-[0_0_50px_rgba(34,211,238,0.06)]">
          <div className="border-b border-cyan-400/15 bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-zinc-950 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="rounded-xl bg-cyan-400/15 p-2.5"><Terminal className="h-5 w-5 text-cyan-200" /></div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Local execution · explicit approval required</p>
                  <h2 className="mt-1 text-base font-bold text-zinc-100">{selectedLocalAgent ? `Run ${selectedTask?.id || 'selected task'} with ${selectedAgentLabel}` : `Send ${selectedTask?.id || 'selected task'} to ${selectedAgentLabel}`}</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">{selectedLocalAgent ? `${selectedAgentLabel} runs through your loopback connector inside the connected repository. Studio streams its work, captures Git evidence, and never commits, pushes, or marks work complete on its own.` : `Studio prepares a portable, feature-scoped handoff for ${selectedAgentLabel}. Copy it into that agent; Studio does not pretend it can control an unconnected CLI.`}</p>
                </div>
              </div>
              <div className="rounded-lg border border-cyan-400/20 bg-zinc-950/70 px-3 py-2 text-[11px] text-cyan-100">{selectedLocalAgent ? 'Workspace-write only' : 'Portable prompt only'}<br /><span className="text-zinc-500">No commit · No push</span></div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3 text-[11px]">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Feature</span><p className="mt-1 text-zinc-400">{activeFeature.title}</p></div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Task</span><p className="mt-1 font-mono text-cyan-200">{selectedTask?.id || 'Choose a task'}</p></div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Repository</span><p className="mt-1 truncate text-zinc-400">{project.importedRepo?.repoUrl || 'Connect a workspace first'}</p></div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 p-5">
            {selectedLocalAgent ? <button type="button" onClick={runCodexLocally} disabled={isRunningCodex || !project.importedRepo?.repoUrl || !selectedTask || !decisionsReady} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-cyan-500/15 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"><Play className="h-4 w-4" />{isRunningCodex ? `${selectedAgentLabel} is running locally…` : decisionsReady ? `Run with ${selectedAgentLabel} locally` : 'Confirm required decisions to run'}</button> : <button type="button" onClick={() => copy(masterPrompt)} disabled={!decisionsReady} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-xs font-black text-zinc-950 shadow-lg shadow-cyan-500/15 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-45"><Copy className="h-4 w-4" />{copied ? 'Prompt copied' : decisionsReady ? `Copy handoff for ${selectedAgentLabel}` : 'Confirm required decisions to copy'}</button>}
            {isRunningCodex && <button type="button" onClick={cancelCodexRun} className="inline-flex items-center gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-200 hover:bg-rose-500/20"><Square className="h-3.5 w-3.5 fill-current" />Stop safely</button>}
            <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />One task per handoff keeps scope and token use bounded.</span>
          </div>
          {!codexJob && !isRunningCodex && selectedTask && project.importedRepo?.repoUrl && (
            <details className="mx-5 mb-5 rounded-xl border border-zinc-800 bg-zinc-900/45 px-4 py-3 text-xs">
              <summary className="cursor-pointer font-semibold text-zinc-300">Earlier agent run finished, but its result panel is missing?</summary>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-zinc-400">
                <p className="max-w-2xl leading-relaxed">Read a fresh Git snapshot for this repository and recover a review receipt for the selected task. This does not run an agent, edit files, commit, or push. Because Git cannot prove task ownership, you will still confirm the evidence yourself.</p>
                <button type="button" onClick={recoverTaskEvidence} disabled={isRecoveringEvidence} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isRecoveringEvidence ? 'animate-spin' : ''}`} />{isRecoveringEvidence ? 'Reading evidence…' : 'Recover task evidence'}</button>
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
              const files = evidenceChangedFiles(codexJob);
              const diagnostic = codexJob.output.trim().slice(-2_500);
              return <section className="mt-4 rounded-xl border border-amber-300/35 bg-amber-400/5 p-4 text-xs">
                <p className="font-bold text-amber-100">{guidance.heading}</p>
                <p className="mt-1 leading-relaxed text-zinc-300">{guidance.detail}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Changed files to review ({files.length})</p><pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-400">{files.join('\n') || 'No Git-tracked file changes were captured.'}</pre></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Last useful diagnostic</p><pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-zinc-400">{diagnostic || 'The local agent did not return diagnostic output.'}</pre></div></div>
                <div className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/5 p-3"><p className="font-semibold text-amber-100">Recommended next action</p><p className="mt-1 leading-relaxed text-zinc-300">{guidance.next}</p><p className="mt-2 text-[11px] text-zinc-500">Do not record this task as reviewed yet. Studio will keep it actionable until a successful run is reviewed.</p></div>
                {artifactFindings.length > 0 && <div className="mt-3 rounded-lg border border-violet-400/20 bg-violet-500/5 p-3"><p className="font-semibold text-violet-100">Feature verification findings</p><p className="mt-1 text-[11px] text-zinc-400">Studio read the feature-scoped verification record and pulled out the unresolved items for you.</p><ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-zinc-300">{artifactFindings.map((finding, index) => <li key={`${index}-${finding}`}>{finding}</li>)}</ul></div>}
              </section>;
            })()}
            {codexJob.ok && <section className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs">
              <p className="font-bold text-emerald-100">Codex finished. Review the evidence before recording this task.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Changed files ({completedChangedFiles.length})</p><p className="mt-1 max-h-20 overflow-auto font-mono text-[10px] text-zinc-400">{completedChangedFiles.join('\n') || 'No source or artifact file changes were detected.'}</p></div><div className="rounded-lg bg-zinc-950/70 p-3"><p className="font-semibold text-zinc-200">Diff summary</p><pre className="mt-1 max-h-20 overflow-auto whitespace-pre-wrap text-[10px] text-zinc-400">{codexJob.evidence?.diffStat || (completedChangedFiles.length ? 'New or untracked files are listed at left; Git does not produce a diff stat until they are added.' : 'No diff summary was available.')}</pre></div></div>
              <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-cyan-100">Independent repository verification</p><p className="mt-1 text-[11px] text-zinc-400">Run the repository’s declared npm test script outside the agent. This does not use Codex tokens.</p></div><button type="button" onClick={runFeatureVerification} disabled={verificationJob?.status === 'running'} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-50">{verificationJob?.status === 'running' ? 'Running verification…' : verificationJob?.ok ? 'Verification passed' : 'Run repository tests'}</button></div>{verificationJob && <AgentJobStatus job={verificationJob} preparingLabel="Running independent repository verification…" />}</div>
              <label className="mt-4 flex cursor-pointer items-start gap-2 text-zinc-200"><input type="checkbox" checked={hasReviewedResult} onChange={(event) => setHasReviewedResult(event.target.checked)} className="mt-0.5 accent-emerald-400" />I reviewed the changed files, command output, and focused verification. This is evidence for {selectedTask?.id}, not an automatic approval.</label>
              <button type="button" onClick={retainReceipt} disabled={!hasReviewedResult || receiptSaved} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"><FileCheck2 className="h-3.5 w-3.5" />{receiptSaved ? 'Implementation receipt saved' : 'Record reviewed implementation'}</button>
              {receiptSaved && <p className="mt-2 text-[11px] text-emerald-200">Stage 7 now has reviewable evidence. Return to the Feature Journey when you are ready to approve the implementation stage.</p>}
            </section>}
          </div>}
        </section>
      )}

      {/* Compiled Master Prompt Output */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
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

      {/* Simulated AI Output Panel */}
      {aiSimulationOutput && (
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-purple-500/40 space-y-3 text-xs">
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
      )}
    </div>
  );
});

PromptStudio.displayName = 'PromptStudio';
