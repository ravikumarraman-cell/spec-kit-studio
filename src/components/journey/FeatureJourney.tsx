import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, FileSearch, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { FeatureJourney as JourneyState, SpecKitProject, ViewTab } from '../../types/speckit';
import { ConnectorJob, connectorClient } from '../../lib/connector';
import { LocalAgentStatus, localAgentLabels, recommendedLocalAgent } from '../../lib/agentAvailability';
import { getStudioSettings } from '../../lib/studioSettings';

type JourneyStage = {
  id: number;
  title: string;
  outcome: string;
  evidence: string;
  engineStep: string;
  destination?: ViewTab;
  action: string;
  ready: (project: SpecKitProject) => boolean;
  readyHint: string;
};

const stages: JourneyStage[] = [
  { id: 1, title: 'Connect safely', outcome: 'Establish a reviewable repository baseline.', evidence: 'Repository path, Git state, test commands, Spec-Kit status, and local-agent readiness.', engineStep: 'Read-only repository grounding', destination: 'workspace', action: 'Connect and scan repository', ready: (project) => Boolean(project.importedRepo?.repoUrl), readyHint: 'Scan the connected repository first.' },
  { id: 2, title: 'Describe the feature', outcome: 'Agree on the user outcome and compatibility boundaries.', evidence: 'Feature brief, source ticket/PRD, success measure, and “must not break” constraints.', engineStep: 'speckit.specify', action: 'Describe feature with Engine', ready: (project) => project.spec.userStories.length > 0 && project.spec.functionalRequirements.length > 0, readyHint: 'Generate or review user stories and functional requirements.' },
  { id: 3, title: 'Ground the impact map', outcome: 'Know the owning code, neighbours, tests, contracts, and guardrails before design.', evidence: 'Scanned technology evidence, project constitution, key directories, and referenced code paths.', engineStep: 'Repository-evidence review + speckit.constitution when governance changes', destination: 'constitution', action: 'Review impact and guardrails', ready: (project) => Boolean(project.importedRepo?.detectedTechStack.length) && project.constitution.rules.length > 0, readyHint: 'Confirm repository evidence and the applicable constitution rules.' },
  { id: 4, title: 'Design safely', outcome: 'Approve a compatible technical plan.', evidence: 'Components, API contracts, schema changes, ADRs, test approach, and rollback considerations.', engineStep: 'speckit.plan + speckit.checklist', destination: 'plan', action: 'Review architecture plan', ready: (project) => project.plan.components.length > 0 || project.plan.apiContracts.length > 0 || project.plan.adrs.length > 0, readyHint: 'Add or generate an implementation plan with at least one concrete design decision.' },
  { id: 5, title: 'Make delivery actionable', outcome: 'Approve a dependency-ordered, traceable delivery plan.', evidence: 'Tasks, requirement mappings, dependencies, phases, and test tasks.', engineStep: 'speckit.tasks + speckit.analyze', destination: 'tasks', action: 'Review phased task board', ready: (project) => project.tasks.tasks.length > 0 && project.tasks.tasks.every((task) => Boolean(task.mappedRequirementId)), readyHint: 'Every task needs a mapped requirement before approval.' },
  { id: 6, title: 'Pass the quality gate', outcome: 'Resolve specification gaps before code changes begin.', evidence: 'Cross-artifact consistency report, unresolved ambiguities, and reviewer decisions.', engineStep: 'speckit.analyze', destination: 'audit', action: 'Run Spec Quality Audit', ready: (project) => Boolean(project.audit && project.audit.overallScore >= 90 && project.audit.gaps.length === 0), readyHint: 'Run the audit and resolve its blocking gaps.' },
  { id: 7, title: 'Implement deliberately', outcome: 'Execute one approved task or phase at a time.', evidence: 'Task-scoped agent prompt, changed files, command output, and focused test results.', engineStep: 'speckit.implement', destination: 'prompt', action: 'Open task-scoped agent prompts', ready: (project) => project.tasks.tasks.some((task) => task.status === 'done'), readyHint: 'Complete and verify at least one approved task.' },
  { id: 8, title: 'Verify and hand off', outcome: 'Review the final change set and retain a durable record.', evidence: 'Convergence findings, Git diff, verification results, and exported Spec-Kit artifacts.', engineStep: 'speckit.converge', destination: 'export', action: 'Verify and export reviewed artifacts', ready: (project) => project.tasks.tasks.length > 0 && project.tasks.tasks.every((task) => task.status === 'done'), readyHint: 'Complete the approved tasks before final verification.' },
];

function engineInstruction(stageId: number, project: SpecKitProject): string | null {
  const instructions: Record<number, string> = {
    3: `Feature Journey stage 3: inspect ${project.name} read-only and produce an evidence-backed impact map. Identify owning code paths, neighboring implementation, relevant tests, APIs, schemas, deployment workflows, and applicable constitution rules. Do not change files.`,
    4: `Feature Journey stage 4: use the integration-appropriate Spec-Kit plan workflow for ${project.name}, then create a requirements-quality checklist. Ground every decision in repository evidence. Do not generate tasks or application code; stop for human review.`,
    5: `Feature Journey stage 5: use the integration-appropriate Spec-Kit tasks workflow for ${project.name}, then run the read-only analysis workflow. Produce dependency-ordered, requirement-mapped tasks. Do not implement code; stop for human review.`,
    6: `Feature Journey stage 6: run the read-only Spec-Kit analysis workflow for ${project.name}. Report contradictions, gaps, ambiguity, missing mappings, compatibility risks, and the owning stage for each finding. Do not edit code or self-approve checklists.`,
    7: `Feature Journey stage 7: use the integration-appropriate Spec-Kit implement workflow for exactly this approved task in ${project.name}: ${project.tasks.tasks.find((task) => task.status !== 'done')?.id || 'the task selected in Studio'} — ${project.tasks.tasks.find((task) => task.status !== 'done')?.title || 'selected task'}. Respect checklist review state and task boundaries. Run focused checks, summarize changed files and results, then stop.`,
    8: `Feature Journey stage 8: run the integration-appropriate Spec-Kit converge workflow for ${project.name}. Compare implementation with approved artifacts and report remaining work, verification results, and review risks. Do not commit, push, or make unrelated changes.`,
  };
  return instructions[stageId] || null;
}

function detectedAgent(): LocalAgentStatus | undefined {
  try {
    const value = JSON.parse(window.localStorage.getItem('speckit_local_agents') || '[]');
    return Array.isArray(value) ? recommendedLocalAgent(value as LocalAgentStatus[], getStudioSettings().preferredAgent) : undefined;
  } catch { return undefined; }
}

interface Props {
  project: SpecKitProject;
  onNavigate: (tab: ViewTab) => void;
  onOpenFeatureImport: () => void;
  onSaveJourney: (journey: JourneyState) => void;
}

export function FeatureJourney({ project, onNavigate, onOpenFeatureImport, onSaveJourney }: Props) {
  const journey = project.journey || { activeStage: 1, completedStages: [], startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const current = stages.find((stage) => stage.id === journey.activeStage) || stages[0];
  const [connectorToken, setConnectorToken] = useState('');
  const [agentJob, setAgentJob] = useState<ConnectorJob | null>(null);
  const [isRunningEngine, setIsRunningEngine] = useState(false);
  const complete = (stage: JourneyStage) => {
    if (!stage.ready(project)) return;
    const completedStages = [...new Set([...journey.completedStages, stage.id])].sort((a, b) => a - b);
    const next = stages.find((candidate) => candidate.id === stage.id + 1);
    onSaveJourney({ ...journey, completedStages, activeStage: next?.id || stage.id, updatedAt: new Date().toISOString() });
  };
  const startStage = (stage: JourneyStage) => {
    if (stage.id === 2) { onOpenFeatureImport(); return; }
    if (stage.destination) onNavigate(stage.destination);
  };
  const runEngineStage = async () => {
    const instruction = engineInstruction(current.id, project); const agent = detectedAgent(); const repositoryPath = project.importedRepo?.repoUrl;
    if (!instruction || !agent || !repositoryPath) return;
    if (!window.confirm(`Run ${localAgentLabels[agent.id]} for Stage ${current.id}: ${current.title}? You will review the result before the journey advances.`)) return;
    setIsRunningEngine(true); setAgentJob(null);
    try {
      const client = connectorClient(window.localStorage.getItem('speckit_connector_url') || 'http://127.0.0.1:4318', connectorToken);
      let job = await client.startSpecKitAgent(repositoryPath, agent.id, instruction);
      setAgentJob(job);
      while (job.status === 'running') { await new Promise((resolve) => window.setTimeout(resolve, 750)); job = await client.getJob(job.id); setAgentJob(job); }
    } finally { setIsRunningEngine(false); }
  };
  const completedCount = journey.completedStages.length;
  const currentIndex = Math.max(0, stages.findIndex((stage) => stage.id === current.id));
  const progress = Math.round((completedCount / stages.length) * 100);
  const readiness = useMemo(() => stages.map((stage) => ({ stage, ready: stage.ready(project) })), [project]);

  return <div className="mx-auto max-w-5xl space-y-6 pb-12">
    <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-zinc-900 p-5 md:p-7"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Spec-Kit Engine guided workflow</div><h1 className="mt-1 text-2xl font-bold text-zinc-100">Add a feature without losing the thread</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">One stage at a time. Studio keeps the repository evidence, human approvals, and Engine work in the right order.</p></div><div className="min-w-36 rounded-xl border border-cyan-500/25 bg-zinc-950/60 p-3 text-center"><div className="text-2xl font-black text-cyan-300">{progress}%</div><div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{completedCount} of 8 approved</div></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div></section>

    <section className="rounded-2xl border border-cyan-500/30 bg-zinc-900/70 p-5"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 text-sm font-black text-cyan-300">{current.id}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Your one next step</p><h2 className="mt-1 text-lg font-bold text-zinc-100">{current.title}</h2><p className="mt-1 text-sm text-zinc-400">{current.outcome}</p><div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Engine action</span><p className="mt-1 font-mono text-[11px] text-cyan-200">{current.engineStep}</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Evidence Studio will retain</span><p className="mt-1 text-[11px] text-zinc-400">{current.evidence}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => startStage(current)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-cyan-400"><Play className="h-3.5 w-3.5" />{current.action}</button>{current.ready(project) && !journey.completedStages.includes(current.id) && <button type="button" onClick={() => complete(current)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20"><CheckCircle2 className="h-3.5 w-3.5" />Approve this stage and continue</button>}</div>{engineInstruction(current.id, project) && <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex-1 text-[11px] text-zinc-400">Pairing token <span className="text-zinc-600">(only when required)</span><input value={connectorToken} onChange={(event) => setConnectorToken(event.target.value)} type="password" placeholder="Leave blank if your connector has no token" className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100" /></label><button type="button" onClick={runEngineStage} disabled={isRunningEngine || !detectedAgent() || !project.importedRepo?.repoUrl} className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">{isRunningEngine ? 'Running Engine…' : `Run ${detectedAgent() ? localAgentLabels[detectedAgent()!.id] : 'detected agent'}`}</button></div>{!detectedAgent() && <p className="mt-2 text-[11px] text-amber-200">Scan Connected Workspace to detect a local agent, or use the Gemini fallback for Stage 2.</p>}{agentJob && <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-[10px] text-zinc-300">{agentJob.output || 'Agent started; waiting for output…'}</pre>}</div>}{!current.ready(project) && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><CircleAlert className="h-4 w-4 shrink-0" />{current.readyHint}</p>}</div></div></section>

    <section className="space-y-2"><h2 className="px-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">The complete feature journey</h2>{readiness.map(({ stage, ready }, index) => { const isComplete = journey.completedStages.includes(stage.id); const isCurrent = index === currentIndex; return <div key={stage.id} className={`rounded-xl border p-4 transition-colors ${isCurrent ? 'border-cyan-500/35 bg-cyan-500/5' : isComplete ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}><div className="flex gap-3"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${isComplete ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300' : isCurrent ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300' : 'border-zinc-700 bg-zinc-900 text-zinc-500'}`}>{isComplete ? <CheckCircle2 className="h-4 w-4" /> : stage.id}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-zinc-100">{stage.title}</h3><span className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">{stage.engineStep}</span>{ready && !isComplete && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Ready for review</span>}</div><p className="mt-1 text-xs text-zinc-400">{stage.outcome}</p>{isCurrent && <button type="button" onClick={() => startStage(stage)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200">Open this stage <ArrowRight className="h-3.5 w-3.5" /></button>}</div></div></div>; })}</section>

    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400"><div className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /><p><span className="font-bold text-zinc-200">Human gate:</span> Engine may prepare evidence and artifacts, but it never advances this journey on its own. You approve each completed stage after reviewing its output.</p></div></section>
  </div>;
}
