import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Play, ShieldCheck } from 'lucide-react';
import { FeatureJourney as JourneyState, SpecKitProject, ViewTab } from '../../types/speckit';
import { configuredConnectorClient, ConnectorJob, SpecKitArtifact } from '../../lib/connector';
import { LocalAgentStatus, localAgentLabels, recommendedLocalAgent } from '../../lib/agentAvailability';
import { getStudioSettings } from '../../lib/studioSettings';
import { getConnectorSessionToken, setConnectorSessionToken } from '../../lib/connectorSession';
import { approveJourneyStage, createFeatureJourney, engineInstructionForStage, FeatureJourneyStage, featureJourneyStages, getJourneyStage, nextFeatureJourneyStage } from '../../lib/featureJourney';
import { FeatureInbox } from './FeatureInbox';
import { agentFailureGuidance } from '../../lib/agentDiagnostics';
import { AgentJobStatus } from '../common/AgentJobStatus';
import { isFeatureArtifactScoped } from '../../lib/featureArtifactScope';

function detectedAgent(): LocalAgentStatus | undefined {
  try {
    const value = JSON.parse(window.localStorage.getItem('speckit_local_agents') || '[]');
    return Array.isArray(value) ? recommendedLocalAgent(value as LocalAgentStatus[], getStudioSettings().preferredAgent) : undefined;
  } catch { return undefined; }
}

function selectedAgent(): LocalAgentStatus | undefined {
  const preference = getStudioSettings().preferredAgent;
  if (preference === 'auto') return detectedAgent();
  // Settings is a real agent selection, never a cosmetic label. A fresh scan is
  // required before Studio will start an explicitly selected local CLI.
  try {
    const value = JSON.parse(window.localStorage.getItem('speckit_local_agents') || '[]');
    const agent = Array.isArray(value) ? value.find((item): item is LocalAgentStatus => item?.id === preference && item.installed === true) : undefined;
    return agent || undefined;
  } catch { return undefined; }
}

function officialArtifactFromAgentOutput(output: string) {
  const match = output.match(/--- Official ([^\n]+) ---\n([\s\S]+)$/);
  return match ? { path: match[1].trim(), content: match[2].trim() } : null;
}

interface Props {
  project: SpecKitProject;
  onNavigate: (tab: ViewTab) => void;
  onOpenFeatureImport: () => void;
  onSaveJourney: (journey: JourneyState) => void;
  onSaveFeatureReview: (review: { impactMap?: { content: string; acceptedAt?: string }; architecturePlan?: { path?: string; content: string; acceptedAt?: string }; deliveryPlan?: { path?: string; content: string; acceptedAt?: string } }) => void;
}

export function FeatureJourney({ project, onNavigate, onOpenFeatureImport, onSaveJourney, onSaveFeatureReview }: Props) {
  const journey = project.journey || createFeatureJourney();
  const current = getJourneyStage(journey.activeStage);
  const [connectorToken, setConnectorToken] = useState(() => getConnectorSessionToken());
  const [agentJob, setAgentJob] = useState<ConnectorJob | null>(null);
  const [agentStageId, setAgentStageId] = useState<number | null>(null);
  const [acceptedNotice, setAcceptedNotice] = useState<string | null>(null);
  const [discoveredArtifact, setDiscoveredArtifact] = useState<SpecKitArtifact | null>(null);
  const [isRunningEngine, setIsRunningEngine] = useState(false);
  const [engineError, setEngineError] = useState('');
  const complete = (stage: typeof current) => {
    if (!stage.ready(project)) return;
    onSaveJourney(approveJourneyStage(journey, stage.id));
  };
  const reopenStage = (stageId: number) => onSaveJourney({ ...journey, activeStage: stageId, updatedAt: new Date().toISOString() });
  const startStage = (stage: FeatureJourneyStage) => {
    if (stage.id === 2) { onOpenFeatureImport(); return; }
    if (stage.destination) onNavigate(stage.destination);
  };
  const runEngineStage = async (stageIdOrEvent: number | React.MouseEvent = current.id) => {
    const stageId = typeof stageIdOrEvent === 'number' ? stageIdOrEvent : current.id;
    const instruction = engineInstructionForStage(stageId, project); const agent = selectedAgent(); const repositoryPath = project.importedRepo?.repoUrl;
    if (!instruction || !agent || !repositoryPath) return;
    const stage = getJourneyStage(stageId);
    if (!window.confirm(`Run ${localAgentLabels[agent.id]} for Stage ${stageId}: ${stage.title}? You will review the result before the journey advances.`)) return;
    setIsRunningEngine(true); setAgentJob(null); setEngineError('');
    setAgentStageId(stageId);
    try {
      setConnectorSessionToken(connectorToken);
      const client = configuredConnectorClient(connectorToken);
      let job = await client.startSpecKitAgent(repositoryPath, agent.id, instruction);
      setAgentJob(job);
      while (job.status === 'running') { await new Promise((resolve) => window.setTimeout(resolve, 750)); job = await client.getJob(job.id); setAgentJob(job); }
      if (job.ok && (stageId === 4 || stageId === 5)) {
        const kind = stageId === 4 ? 'plan' : 'tasks';
        const { artifacts } = await client.readSpecKitArtifacts(repositoryPath);
        const artifact = artifacts.filter((item) => item.kind === kind).sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0];
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
  const currentIndex = Math.max(0, featureJourneyStages.findIndex((stage) => stage.id === current.id));
  const progress = Math.round((completedCount / featureJourneyStages.length) * 100);
  const readiness = useMemo(() => featureJourneyStages.map((stage) => ({ stage, ready: stage.ready(project) })), [project]);
  const activeFeature = project.featureInbox?.at(-1);
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
    const repositoryPath = project.importedRepo?.repoUrl;
    const expectedKind = current.id === 4 ? 'plan' : current.id === 5 ? 'tasks' : null;
    if (!repositoryPath || !expectedKind || (expectedKind === 'plan' && activeFeature?.architecturePlan?.path && isFeatureArtifactScoped(activeFeature.architecturePlan.content, activeFeature)) || (expectedKind === 'tasks' && activeFeature?.deliveryPlan?.path && isFeatureArtifactScoped(activeFeature.deliveryPlan.content, activeFeature))) { setDiscoveredArtifact(null); return; }
    const client = configuredConnectorClient(connectorToken);
    client.readSpecKitArtifacts(repositoryPath).then(({ artifacts }) => setDiscoveredArtifact(artifacts.filter((item) => item.kind === expectedKind && isFeatureArtifactScoped(item.content, activeFeature)).sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt))[0] || null)).catch(() => setDiscoveredArtifact(null));
  }, [activeFeature?.architecturePlan?.acceptedAt, activeFeature?.deliveryPlan?.acceptedAt, connectorToken, current.id, project.importedRepo?.repoUrl]);
  const acceptEngineReview = () => {
    if (!agentJob?.ok || !agentJob.output.trim()) return;
    const acceptedAt = new Date().toISOString();
    if (agentStageId === 3) onSaveFeatureReview({ impactMap: { content: agentJob.output, acceptedAt } });
    const officialArtifact = officialArtifactFromAgentOutput(agentJob.output);
    if ((agentStageId === 4 || agentStageId === 5) && !officialArtifact) {
      setEngineError('Studio did not find an official plan.md or tasks.md in the agent result, so it was not accepted. Agent output and setup logs are not a feature artifact. Return to the stage and retry only when the official artifact is available.');
      return;
    }
    if ((agentStageId === 4 || agentStageId === 5) && officialArtifact && !isFeatureArtifactScoped(officialArtifact.content, activeFeature)) {
      setEngineError(`Studio found ${officialArtifact.path}, but it does not mention ${activeFeature?.title || 'the feature in focus'}. It was not accepted as feature evidence.`);
      return;
    }
    if (agentStageId === 4 && officialArtifact) onSaveFeatureReview({ architecturePlan: { ...officialArtifact, acceptedAt } });
    if (agentStageId === 5 && officialArtifact) onSaveFeatureReview({ deliveryPlan: { ...officialArtifact, acceptedAt } });
    if (agentStageId === 5 && journey.completedStages.includes(5)) onSaveJourney({ ...journey, activeStage: 6, updatedAt: acceptedAt });
    if (agentStageId === 4 && journey.completedStages.includes(4)) onSaveJourney({ ...journey, activeStage: 5, updatedAt: acceptedAt });
    setAcceptedNotice(agentStageId === 3 ? 'Impact map accepted and saved to this feature. Next: run the feature-scoped architecture plan.' : agentStageId === 4 ? 'Feature plan accepted and saved to this feature. You can now approve Stage 4.' : 'Feature delivery tasks accepted and saved to this feature. You can now approve Stage 5.');
    setAgentJob(null);
    setAgentStageId(null);
  };
  const acceptDiscoveredArtifact = () => {
    if (!discoveredArtifact) return;
    if (!isFeatureArtifactScoped(discoveredArtifact.content, activeFeature)) {
      setEngineError('This artifact does not demonstrate that it belongs to the feature in focus, so Studio will not accept it.');
      return;
    }
    const acceptedAt = new Date().toISOString();
    if (current.id === 4) onSaveFeatureReview({ architecturePlan: { path: discoveredArtifact.path, content: discoveredArtifact.content, acceptedAt } });
    if (current.id === 5) onSaveFeatureReview({ deliveryPlan: { path: discoveredArtifact.path, content: discoveredArtifact.content, acceptedAt } });
    if (current.id === 5 && journey.completedStages.includes(5)) onSaveJourney({ ...journey, activeStage: 6, updatedAt: acceptedAt });
    if (current.id === 4 && journey.completedStages.includes(4)) onSaveJourney({ ...journey, activeStage: 5, updatedAt: acceptedAt });
    setAcceptedNotice(current.id === 4
      ? 'Existing official plan accepted and linked to this feature. You can now approve Stage 4.'
      : 'Existing official tasks accepted and linked to this feature. You can now approve Stage 5.');
    setDiscoveredArtifact(null);
  };

  return <div className="feature-journey mx-auto max-w-5xl space-y-6 pb-12">
    {isRunningEngine && <style>{'.feature-journey div:has(> label input[type="password"]) ~ pre { display: none; }'}</style>}
    <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-zinc-900 p-5 md:p-7"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Spec-Kit Engine guided workflow</div><h1 className="mt-1 text-2xl font-bold text-zinc-100">Add a feature without losing the thread</h1><p className="mt-2 max-w-2xl text-sm text-zinc-400">One stage at a time. Studio keeps the repository evidence, human approvals, and Engine work in the right order.</p></div><div className="min-w-36 rounded-xl border border-cyan-500/25 bg-zinc-950/60 p-3 text-center"><div className="text-2xl font-black text-cyan-300">{progress}%</div><div className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">{completedCount} of 8 approved</div></div></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div></section>

    <FeatureInbox project={project} onImport={onOpenFeatureImport} onNavigate={onNavigate} />

    {acceptedNotice && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-100"><strong>Saved.</strong> {acceptedNotice}</div>}

    {activeFeature && (activeFeature.impactMap?.acceptedAt || activeFeature.architecturePlan?.acceptedAt) && <section className="rounded-2xl border border-violet-400/25 bg-violet-500/5 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Current feature evidence</p><h2 className="mt-1 font-bold text-zinc-100">{activeFeature.title}</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{activeFeature.impactMap?.acceptedAt && <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-cyan-200">✓ Impact map accepted</p><p className="mt-1 text-[11px] text-zinc-400">Read-only architecture evidence retained for this feature.</p></div>}{activeFeature.architecturePlan?.acceptedAt && <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-emerald-200">✓ Feature plan accepted</p><p className="mt-1 text-[11px] text-zinc-400">This plan is scoped to this feature, not the shared workspace plan.</p></div>}</div></section>}

    {current.id > 3 && activeFeature && !activeFeature.impactMap?.acceptedAt && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Ground the impact map for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">This feature entered the Journey before Studio retained feature-scoped impact maps. Run the read-only review once, accept it, then continue without resetting approved work.</p><button type="button" onClick={() => runEngineStage(3)} disabled={isRunningEngine} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20 disabled:opacity-50">Run read-only impact map</button></section>}

    {current.id > 4 && activeFeature && !activeFeature.architecturePlan?.path && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Create an official architecture plan for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">Earlier Studio versions retained agent transcript output without an official <code>plan.md</code>. That output is not a feature plan. Return to Design safely; Studio will look for an existing <code>plan.md</code> before it ever offers Codex.</p><button type="button" onClick={() => reopenStage(4)} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20">Review architecture plan</button></section>}

    {current.id > 5 && activeFeature && !activeFeature.deliveryPlan?.acceptedAt && <section className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">Required repair</p><h2 className="mt-1 font-bold text-zinc-100">Create the delivery tasks for {activeFeature.title}</h2><p className="mt-1 text-zinc-300">Stage 5 was previously marked complete without retaining feature-scoped tasks. Studio will first look for an official <code>tasks.md</code>; only run Codex if none is found. Review and accept the result before continuing.</p><button type="button" onClick={() => reopenStage(5)} className="mt-3 rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-bold text-amber-100 hover:bg-amber-300/20">Review delivery tasks</button></section>}

    {agentJob && <AgentJobStatus job={agentJob} preparingLabel={`Running ${selectedAgent() ? localAgentLabels[selectedAgent()!.id] : 'local agent'} for Stage ${agentStageId || current.id}…`} />}
    {agentJob?.ok && (agentStageId === 3 || agentStageId === 4 || agentStageId === 5) && <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Review before accepting</p><h2 className="mt-1 font-bold text-zinc-100">{agentStageId === 3 ? 'Read-only impact map' : agentStageId === 4 ? 'Feature-scoped architecture plan' : 'Feature-scoped delivery tasks'} for {activeFeature?.title || 'the current feature'}</h2><p className="mt-1 text-zinc-300">Read the Engine result below. Accepting retains it with this imported feature and unlocks the next human approval; it does not approve the stage automatically.</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[10px] leading-relaxed text-zinc-300">{agentJob.output}</pre><button type="button" onClick={acceptEngineReview} className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300">Accept {agentStageId === 3 ? 'impact map' : agentStageId === 4 ? 'feature plan' : 'delivery tasks'}</button></section>}

    {discoveredArtifact && (current.id === 4 || current.id === 5) && <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300">Already prepared — no agent run needed</p><h2 className="mt-1 font-bold text-zinc-100">Studio found {discoveredArtifact.path}</h2><p className="mt-1 text-zinc-300">This is an existing official {current.id === 4 ? 'architecture plan' : 'delivery task board'} in the connected repository. Review it once and link it to <strong>{activeFeature?.title || 'the current feature'}</strong>. Running Codex would be redundant.</p><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[10px] leading-relaxed text-zinc-300">{discoveredArtifact.content}</pre><button type="button" onClick={acceptDiscoveredArtifact} className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300">Review and accept existing {current.id === 4 ? 'plan' : 'tasks'}</button></section>}

    <section className="rounded-2xl border border-cyan-500/30 bg-zinc-900/70 p-5"><div className="flex items-start gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/10 text-sm font-black text-cyan-300">{current.id}</div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Your one next step</p><h2 className="mt-1 text-lg font-bold text-zinc-100">{current.title}</h2><p className="mt-1 text-sm text-zinc-400">{current.outcome}</p>{current.id === 4 && <div className="mt-4 rounded-xl border border-violet-400/25 bg-violet-500/5 p-4 text-xs"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-violet-300">Feature in focus</p><h3 className="mt-1 font-bold text-zinc-100">{activeFeature?.title || 'No imported feature selected'}</h3><p className="mt-1 text-zinc-400">{activeFeature?.summary || 'Choose a feature from the Inbox before planning.'}</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-zinc-200">Feature inputs</p><p className="mt-1 text-[11px] text-zinc-400">{activeFeature?.userStoryIds.length || 0} stories · {activeFeature?.requirementIds.length || 0} requirements. These define what the plan must address.</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><p className="font-bold text-zinc-200">Shared workspace context</p><p className="mt-1 text-[11px] text-zinc-400">{project.plan.components.length} components · {project.plan.apiContracts.length} API contracts · {project.plan.adrs.length} ADRs. These are existing context, not this feature’s plan.</p></div></div><p className="mt-3 font-semibold text-amber-200">{activeFeature?.architecturePlan?.acceptedAt ? 'This feature plan has been accepted.' : 'No feature-scoped plan exists yet. Run the selected agent below, review its result, then accept it.'}</p></div>}<div className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Engine action</span><p className="mt-1 font-mono text-[11px] text-cyan-200">{current.engineStep}</p></div><div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3"><span className="font-bold text-zinc-200">Evidence Studio will retain</span><p className="mt-1 text-[11px] text-zinc-400">{current.evidence}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => startStage(current)} className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-zinc-950 hover:bg-cyan-400"><Play className="h-3.5 w-3.5" />{current.action}</button>{current.ready(project) && !journey.completedStages.includes(current.id) && <button type="button" onClick={() => complete(current)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20"><CheckCircle2 className="h-3.5 w-3.5" />Approve this stage and continue</button>}</div>{engineInstructionForStage(current.id, project) && <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex-1 text-[11px] text-zinc-400">Pairing token <span className="text-zinc-600">(only when required)</span><input value={connectorToken} onChange={(event) => { setConnectorToken(event.target.value); setConnectorSessionToken(event.target.value); }} type="password" placeholder="Enter it once in Connected Workspace, or paste it here" className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-100" /></label><button type="button" onClick={runEngineStage} disabled={isRunningEngine || !selectedAgent() || !project.importedRepo?.repoUrl} className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50">{isRunningEngine ? 'Running Engine…' : `Run ${selectedAgent() ? localAgentLabels[selectedAgent()!.id] : 'detected agent'}`}</button></div>{getStudioSettings().preferredAgent !== 'auto' && <p className="mt-2 text-[11px] text-indigo-200">Using your explicit Settings choice; Studio will not switch agents automatically.</p>}{engineError && <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100"><p className="font-bold">Engine needs local pairing</p><p className="mt-1">{engineError}</p><button type="button" onClick={() => onNavigate('workspace')} className="mt-2 font-bold underline">Open Connected Workspace</button></div>}{!selectedAgent() && <p className="mt-2 text-[11px] text-amber-200">Scan Connected Workspace to detect a local agent, or use the Gemini fallback for Stage 2.</p>}{agentJob && <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-[10px] text-zinc-300">{agentJob.output || 'Agent started; waiting for output…'}</pre>}</div>}{!current.ready(project) && <p className="mt-3 flex items-center gap-2 text-xs text-amber-200"><CircleAlert className="h-4 w-4 shrink-0" />{current.readyHint}</p>}</div></div></section>

    <section className="space-y-2"><h2 className="px-1 text-xs font-black uppercase tracking-[0.16em] text-zinc-500">The complete feature journey</h2>{readiness.map(({ stage, ready }, index) => { const isComplete = journey.completedStages.includes(stage.id); const isCurrent = index === currentIndex; return <div key={stage.id} className={`rounded-xl border p-4 transition-colors ${isCurrent ? 'border-cyan-500/35 bg-cyan-500/5' : isComplete ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900/40'}`}><div className="flex gap-3"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black ${isComplete ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300' : isCurrent ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300' : 'border-zinc-700 bg-zinc-900 text-zinc-500'}`}>{isComplete ? <CheckCircle2 className="h-4 w-4" /> : stage.id}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-zinc-100">{stage.title}</h3><span className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">{stage.engineStep}</span>{ready && !isComplete && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">Ready for review</span>}</div><p className="mt-1 text-xs text-zinc-400">{stage.outcome}</p>{isCurrent && <button type="button" onClick={() => startStage(stage)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200">Open this stage <ArrowRight className="h-3.5 w-3.5" /></button>}</div></div></div>; })}</section>

    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400"><div className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" /><p><span className="font-bold text-zinc-200">Human gate:</span> Engine may prepare evidence and artifacts, but it never advances this journey on its own. You approve each completed stage after reviewing its output.</p></div></section>
  </div>;
}
