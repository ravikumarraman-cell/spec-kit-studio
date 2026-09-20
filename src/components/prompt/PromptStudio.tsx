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
  Focus,
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
import { ConnectorJob, connectorClient } from '../../lib/connector';
import { getConnectorSessionToken } from '../../lib/connectorSession';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { LocalAgentId, localAgentLabels } from '../../lib/agentAvailability';
import { TaskDecisionGate } from './TaskDecisionGate';
import { FeatureTaskDecisionAnswers, decisionsComplete, featureTaskDecisionGate, formatApprovedDecisions, recommendedDecisionAnswers } from '../../lib/featureTaskDecisions';

interface PromptStudioProps {
  project: SpecKitProject;
  initialTaskId?: string;
  onRecordFeatureImplementation: (receipt: FeatureImplementationReceipt) => void;
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

export const PromptStudio: React.FC<PromptStudioProps> = memo(({
  project,
  initialTaskId,
  onRecordFeatureImplementation,
}) => {
  const activeFeature = project.featureInbox?.at(-1);
  const featureTasks = useMemo(
    () => activeFeature?.deliveryPlan && isFeatureArtifactScoped(activeFeature.deliveryPlan.content, activeFeature)
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

  const reviewedFeatureTaskIds = useMemo(
    () => activeFeature?.implementationReceipts?.map((receipt) => receipt.taskId) || [],
    [activeFeature?.implementationReceipts],
  );
  const actionableFeatureTasks = useMemo(
    () => actionableFeatureDeliveryTasks(featureTasks, reviewedFeatureTaskIds),
    [featureTasks, reviewedFeatureTaskIds],
  );
  const taskOptions = useSharedTasks || featureTasks.length === 0 ? project.tasks.tasks : actionableFeatureTasks;
  const selectedTask = useMemo(() => {
    const requested = initialTaskId || selectedTaskId;
    return taskOptions.find((task) => task.id === requested) || taskOptions[0];
  }, [initialTaskId, selectedTaskId, taskOptions]);

  useEffect(() => {
    if (taskOptions.length > 0 && !taskOptions.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(taskOptions[0].id);
    }
  }, [selectedTaskId, taskOptions]);

  const agentTarget: AgentTarget = selectedAgent.includes('Copilot') ? 'copilot' : selectedAgent.includes('Gemini') ? 'gemini' : selectedAgent.includes('Cursor') ? 'cursor' : selectedAgent.includes('Aider') || selectedAgent.includes('Codex') ? 'codex' : 'claude';
  const selectedLocalAgent = AGENT_FRAMEWORKS.find((agent) => agent.name === selectedAgent)?.localAgent;
  const selectedAgentLabel = selectedLocalAgent ? localAgentLabels[selectedLocalAgent] : selectedAgent;
  const completedChangedFiles = codexJob ? evidenceChangedFiles(codexJob) : [];
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
    setVerificationJob(null);
    setHasReviewedResult(false);
    setReceiptSaved(false);
    try {
      const client = connectorClient(window.localStorage.getItem('speckit_connector_url') || 'http://127.0.0.1:4318', getConnectorSessionToken());
      let job = await client.startLocalAgentTask(repositoryPath, selectedLocalAgent, selectedTask.id, activeFeature.title, masterPrompt);
      setCodexJob(job);
      while (job.status === 'running') {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
        job = await client.getJob(job.id);
        setCodexJob(job);
      }
      if (!job.ok) setRunError(agentFailureGuidance(selectedLocalAgent, job.output));
    } catch (error) {
      setRunError(agentFailureGuidance(selectedLocalAgent, error instanceof Error ? error.message : `Studio could not start ${selectedAgentLabel} locally.`));
    } finally {
      setIsRunningCodex(false);
    }
  };

  const cancelCodexRun = async () => {
    if (!codexJob || codexJob.status !== 'running') return;
    try {
      const client = connectorClient(window.localStorage.getItem('speckit_connector_url') || 'http://127.0.0.1:4318', getConnectorSessionToken());
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
      const client = connectorClient(window.localStorage.getItem('speckit_connector_url') || 'http://127.0.0.1:4318', getConnectorSessionToken());
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

  const retainReceipt = () => {
    if (!codexJob?.ok || !selectedTask || !hasReviewedResult) return;
    onRecordFeatureImplementation({
      taskId: selectedTask.id,
      jobId: codexJob.id,
      recordedAt: new Date().toISOString(),
      changedFiles: evidenceChangedFiles(codexJob),
      diffStat: codexJob.evidence?.diffStat || '',
      verificationSummary: (verificationJob?.output || codexJob.output).slice(-8_000),
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
        <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 via-zinc-950 to-violet-500/10 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cyan-400/10 p-2.5"><Focus className="h-5 w-5 text-cyan-300" /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Feature in focus · Stage 7</p>
              <h2 className="mt-1 text-lg font-bold text-zinc-100">{activeFeature.title}</h2>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">{activeFeature.summary}</p>
              <p className="mt-3 text-[11px] text-zinc-300"><span className="font-bold text-cyan-200">{actionableFeatureTasks.length} task{actionableFeatureTasks.length === 1 ? '' : 's'} ready to run</span>{featureTasks.length !== actionableFeatureTasks.length ? ` · ${featureTasks.length - actionableFeatureTasks.length} already completed or reviewed` : ''}. Studio resumes at the next task; it never prompts you to rerun recorded work.</p>
            </div>
          </div>
        </section>
      )}

      {activeFeature && (activeFeature.implementationReceipts?.length || 0) > 0 && !useSharedTasks && (
        <details className="group rounded-2xl border border-emerald-400/20 bg-zinc-900/50 p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-bold text-zinc-100"><FileCheck2 className="h-4 w-4 text-emerald-300" />Completed & reviewed work <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-200">{activeFeature.implementationReceipts?.length}</span></span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">View evidence <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" /></span>
          </summary>
          <p className="mt-3 text-xs text-zinc-400">Recorded results stay here for this feature. They are history, not tasks that Studio will ask you to run again.</p>
          <div className="mt-4 space-y-3">
            {activeFeature.implementationReceipts!.map((receipt) => {
              const task = featureTasks.find((item) => item.id === receipt.taskId);
              return (
                <article key={receipt.jobId} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-mono font-bold text-emerald-200">{receipt.taskId}</p><p className="mt-1 font-semibold text-zinc-100">{task?.title || 'Recorded feature task'}</p></div><p className="text-[11px] text-zinc-500">Reviewed {new Date(receipt.recordedAt).toLocaleString()}</p></div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2"><div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-3"><p className="font-semibold text-zinc-200">Produced files</p><pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-400">{receipt.changedFiles.join('\n') || 'No changed-file list was retained for this earlier run. Its recorded output is preserved at right.'}</pre></div><div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-3"><p className="font-semibold text-zinc-200">Verification & agent output</p><pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-400">{receipt.verificationSummary || receipt.diffStat || 'No output was retained.'}</pre></div></div>
                  {receipt.diffStat && <details className="mt-3 text-[11px]"><summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">View Git diff summary</summary><pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[10px] text-zinc-400">{receipt.diffStat}</pre></details>}
                </article>
              );
            })}
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
          {runError && <div className="mx-5 mb-5 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">{runError}</div>}
          {codexJob && <div className="px-5 pb-5"><AgentJobStatus job={codexJob} preparingLabel={`${selectedAgentLabel} is implementing ${selectedTask?.id || 'the selected task'} locally…`} />
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
