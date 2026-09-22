import React, { useEffect, useMemo, useState } from 'react';
import { Bug, CheckCircle2, Clipboard, Lightbulb, Play, ShieldCheck } from 'lucide-react';
import { SpecKitProject, StudioProcessCase, StudioProcessKind } from '../../types/speckit';
import { approveProcessStep, createProcessCase, processDefinitions } from '../../lib/processCases';
import { configuredConnectorClient, ConnectorJob } from '../../lib/connector';
import { LocalAgentStatus, localAgentLabels, recommendedLocalAgent } from '../../lib/agentAvailability';
import { getStudioSettings } from '../../lib/studioSettings';
import { AgentJobStatus } from '../common/AgentJobStatus';

interface Props { project: SpecKitProject; onSaveCases: (cases: StudioProcessCase[]) => void; onStartFeature: () => void; onOpenWorkspace: () => void; onSelectWorkflow: (workflow: 'feature' | StudioProcessKind) => void; }

export function ProcessStudio({ project, onSaveCases, onStartFeature, onOpenWorkspace, onSelectWorkflow }: Props) {
  const [kind, setKind] = useState<StudioProcessKind>(project.workflowFocus === 'assessment' ? 'assessment' : 'bug');
  const [mode, setMode] = useState<'feature' | StudioProcessKind>(project.workflowFocus || 'bug');
  const [title, setTitle] = useState(''); const [input, setInput] = useState(''); const [selectedId, setSelectedId] = useState<string | undefined>();
  const [job, setJob] = useState<ConnectorJob | null>(null); const [engineError, setEngineError] = useState(''); const [isRunning, setIsRunning] = useState(false);
  useEffect(() => {
    const focus = project.workflowFocus || 'feature';
    setMode(focus);
    setKind(focus === 'assessment' ? 'assessment' : 'bug');
    setSelectedId(undefined);
    setJob(null);
    setEngineError('');
  }, [project.id, project.workflowFocus]);
  const cases = project.processCases || [];
  const selected = useMemo(() => cases.find((item) => item.id === selectedId) || cases.at(-1), [cases, selectedId]);
  const definition = processDefinitions[kind];
  const start = () => { if (!title.trim() || !input.trim()) return; const item = createProcessCase(kind, title, input); onSaveCases([...cases, item]); setSelectedId(item.id); setTitle(''); setInput(''); };
  const copy = async (text: string) => { await navigator.clipboard?.writeText(text); };
  const approve = (verdict?: StudioProcessCase['verdict']) => { if (!selected) return; onSaveCases(cases.map((item) => item.id === selected.id ? approveProcessStep(item, verdict) : item)); };
  const agent = useMemo(() => { try { const agents = JSON.parse(window.localStorage.getItem('speckit_local_agents') || '[]') as LocalAgentStatus[]; return recommendedLocalAgent(agents, getStudioSettings().preferredAgent); } catch { return undefined; } }, []);
  const runInStudio = async (item: StudioProcessCase) => {
    const repo = project.importedRepo?.repoUrl; const flow = processDefinitions[item.kind]; const step = flow.steps[item.currentStep];
    if (!repo || !agent) { setEngineError(!repo ? 'Connect and scan a repository in Connected Workspace before running this workflow.' : 'Scan Connected Workspace to detect a local coding agent.'); return; }
    if (!window.confirm(`Run ${localAgentLabels[agent.id]} for ${step.title}? ${step.writeScope === 'source-change' ? 'This step can change source code.' : 'This step is read-only with respect to source code.'}`)) return;
    setIsRunning(true); setEngineError(''); setJob(null);
    const extension = item.kind === 'bug' ? 'bug' : 'assess';
    const prompt = `You are executing a Studio-managed Spec Kit ${flow.label.toLowerCase()} workflow. Work only in ${flow.root(item.slug)} and follow this exact command intent: ${step.command(item)}. First ensure the bundled ${extension} extension is available; if it is not, install it with \`specify extension add ${extension}\` from this repository. ${step.writeScope === 'source-change' ? 'This is the only approved source-code-changing step. Follow assessment.md, keep changes scoped, and record deviations in fix.md.' : 'Do not edit source code. Create or update only the official workflow artifact for this step.'} Do not commit, push, create branches, or start another workflow. Finish with the artifact path, evidence reviewed, commands run, and unresolved limitations.`;
    try { let next = await configuredConnectorClient().startSpecKitAgent(repo, agent.id, prompt); setJob(next); while (next.status === 'running') { await new Promise((resolve) => window.setTimeout(resolve, 750)); next = await configuredConnectorClient().getJob(next.id); setJob(next); } if (!next.ok) setEngineError(next.output || 'The local agent did not complete this workflow step.'); } catch (error) { setEngineError(error instanceof Error ? error.message : 'Studio could not start the local agent.'); } finally { setIsRunning(false); }
  };

  return <div className="mx-auto max-w-5xl space-y-6 pb-12">
    <section className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-zinc-900 p-6">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Choose work, not a phase</p><h1 className="mt-2 text-2xl font-bold text-zinc-100">What are you trying to do?</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">Each workflow keeps its own evidence and never changes the Feature Journey. Choose the smallest process that fits the outcome.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <button type="button" onClick={() => { setMode('feature'); onSelectWorkflow('feature'); }} className={`rounded-xl border p-4 text-left ${mode === 'feature' ? 'border-cyan-400/60 bg-cyan-500/10' : 'border-zinc-700 bg-zinc-950/60'}`}><ShieldCheck className="h-5 w-5 text-cyan-300" /><p className="mt-3 font-bold text-zinc-100">Build a feature</p><p className="mt-1 text-xs text-zinc-400">Specify, plan, implement, and hand off.</p></button>
        <button type="button" onClick={() => { setKind('bug'); setMode('bug'); onSelectWorkflow('bug'); }} className={`rounded-xl border p-4 text-left ${mode === 'bug' ? 'border-rose-400/60 bg-rose-500/10' : 'border-zinc-700 bg-zinc-950/60'}`}><Bug className="h-5 w-5 text-rose-300" /><p className="mt-3 font-bold text-zinc-100">Fix a bug</p><p className="mt-1 text-xs text-zinc-400">Assess → scoped fix → verify.</p></button>
        <button type="button" onClick={() => { setKind('assessment'); setMode('assessment'); onSelectWorkflow('assessment'); }} className={`rounded-xl border p-4 text-left ${mode === 'assessment' ? 'border-violet-400/60 bg-violet-500/10' : 'border-zinc-700 bg-zinc-950/60'}`}><Lightbulb className="h-5 w-5 text-violet-300" /><p className="mt-3 font-bold text-zinc-100">Assess an idea</p><p className="mt-1 text-xs text-zinc-400">Evidence first; decide go, clarify, or stop.</p></button>
      </div>
    </section>

    {mode === 'feature' ? <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-zinc-100">Build a feature</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">Use this when you know what needs to be built. Studio will collect a focused brief first, then guide it through specification, design, delivery, implementation, and handoff. It is separate from bug repair and idea assessment.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={onStartFeature} className="rounded-lg bg-cyan-400 px-4 py-2.5 text-xs font-bold text-zinc-950">Describe a new feature</button></div></section> : <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><h2 className="font-bold text-zinc-100">Start {definition.label.toLowerCase()}</h2><p className="mt-1 text-xs text-zinc-400">{definition.description}</p>
      <div className="mt-4 grid gap-3"><label className="text-xs text-zinc-300">Short name<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'bug' ? 'Login form crashes on empty password' : 'Offline mode for field users'} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-zinc-100" /></label><label className="text-xs text-zinc-300">{kind === 'bug' ? 'What happened, how to reproduce it, and what should happen instead' : 'What is the idea, who has the problem, and why it matters'}<textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-zinc-100" /></label></div>
      <button type="button" disabled={!title.trim() || !input.trim()} onClick={start} className="mt-4 rounded-lg bg-cyan-400 px-4 py-2.5 text-xs font-bold text-zinc-950 disabled:opacity-40">Create {kind === 'bug' ? 'bug case' : 'assessment'}</button>
    </section>}

    {selected && (() => { const flow = processDefinitions[selected.kind]; const step = flow.steps[selected.currentStep]; const done = selected.completedSteps.includes(selected.currentStep); return <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Active {selected.kind === 'bug' ? 'bug case' : 'assessment'}</p><h2 className="mt-1 text-lg font-bold text-zinc-100">{selected.title}</h2><p className="mt-1 font-mono text-xs text-zinc-500">{flow.root(selected.slug)}</p></div><span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300">Step {selected.currentStep + 1} of {flow.steps.length}</span></div>
      <div className="mt-5 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4"><p className="font-bold text-cyan-100">Next: {step.title}</p><p className="mt-1 text-xs text-zinc-400">Creates {step.artifact}. {step.writeScope === 'source-change' ? 'This is the only step allowed to edit source code; review the assessment first.' : 'This step must not edit source code.'}</p>{!project.importedRepo?.repoUrl && <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100"><p className="font-bold">Connect a repository before running this workflow</p><p className="mt-1 text-amber-200">Studio needs a local repository to inspect the evidence and retain this case’s artifacts.</p><button type="button" onClick={onOpenWorkspace} className="mt-3 rounded-lg bg-amber-400 px-3 py-2 font-bold text-zinc-950 hover:bg-amber-300">Connect repository</button></div>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => runInStudio(selected)} disabled={isRunning || done || !project.importedRepo?.repoUrl} className="inline-flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-zinc-950 disabled:opacity-40"><Play className="h-3.5 w-3.5" />{isRunning ? 'Running in Studio…' : `Run with ${agent ? localAgentLabels[agent.id] : 'local agent'}`}</button>{!done && job?.ok && <button type="button" onClick={() => approve()} className="rounded-lg border border-emerald-400/35 px-3 py-2 text-xs font-bold text-emerald-200">I reviewed {step.artifact}</button>}<button type="button" onClick={() => copy(step.command(selected))} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200"><Clipboard className="h-3.5 w-3.5" />Copy for another agent</button></div>{engineError && <p className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">{engineError}</p>}{job && <div className="mt-3"><AgentJobStatus job={job} preparingLabel="Preparing workflow step…" /></div>}</div>
      {selected.kind === 'assessment' && selected.completedSteps.includes(flow.steps.length - 1) && <div className="mt-4 flex flex-wrap gap-2"><span className="self-center text-xs text-zinc-400">Decision after reviewing decision.md:</span>{(['go', 'needs-clarification', 'kill'] as const).map((verdict) => <button key={verdict} type="button" onClick={() => approve(verdict)} className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200">{verdict}</button>)}</div>}
      {selected.verdict === 'go' && <button type="button" onClick={onStartFeature} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950"><CheckCircle2 className="h-3.5 w-3.5" />Start a feature from this decision</button>}
    </section>; })()}
  </div>;
}
