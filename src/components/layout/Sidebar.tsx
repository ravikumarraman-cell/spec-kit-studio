import React, { useEffect, useState } from 'react';
import { Activity, Bot, CheckCircle2, CheckSquare, ChevronRight, Circle, FileText, FolderGit2, HardDrive, Map, Settings, Terminal, Workflow, Wrench } from 'lucide-react';
import { SpecKitProject, ViewTab } from '../../types/speckit';
import { getStudioSettings } from '../../lib/studioSettings';
import { featureJourneyStages, getJourneyStage, getProjectJourney } from '../../lib/featureJourney';
import { processDefinitions } from '../../lib/processCases';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';
import { configuredConnectorClient } from '../../lib/connector';

interface SidebarProps { activeTab: ViewTab; onTabChange: (tab: ViewTab) => void; project: SpecKitProject; onReopenFeatureStage?: (stageId: number) => void; isCollapsed?: boolean; }
const stageIcons: Record<ViewTab, React.ReactNode> = {
  overview: <Workflow className="h-4 w-4" />, workflows: <Wrench className="h-4 w-4" />, workspace: <HardDrive className="h-4 w-4" />, spec: <FileText className="h-4 w-4" />, constitution: <Map className="h-4 w-4" />, plan: <Workflow className="h-4 w-4" />, tasks: <CheckSquare className="h-4 w-4" />, audit: <Activity className="h-4 w-4" />, prompt: <Bot className="h-4 w-4" />, export: <Terminal className="h-4 w-4" />, import: <FolderGit2 className="h-4 w-4" />, settings: <Settings className="h-4 w-4" />,
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, project, onReopenFeatureStage, isCollapsed = false }) => {
  const [showAdvancedTools, setShowAdvancedTools] = useState(() => getStudioSettings().showAdvancedTools);
  const [connectorState, setConnectorState] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  useEffect(() => {
    const refresh = () => setShowAdvancedTools(getStudioSettings().showAdvancedTools);
    window.addEventListener('speckit-settings-change', refresh);
    return () => window.removeEventListener('speckit-settings-change', refresh);
  }, []);
  useEffect(() => {
    let active = true;
    const checkConnector = async () => {
      try {
        const health = await configuredConnectorClient().health();
        if (active) setConnectorState(health.status === 'ok' ? 'ready' : 'unavailable');
      } catch {
        if (active) setConnectorState('unavailable');
      }
    };
    void checkConnector();
    const interval = window.setInterval(() => void checkConnector(), 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  if (isCollapsed) return null;
  const workflowFocus = project.workflowFocus;
  if (workflowFocus === 'bug' || workflowFocus === 'assessment') {
    const definition = processDefinitions[workflowFocus];
    const activeCase = project.processCases?.filter((item) => item.kind === workflowFocus).at(-1);
    const currentStep = activeCase?.currentStep || 0;
    const completedSteps = activeCase?.completedSteps || [];
    const openWorkflowStep = (index: number) => {
      onTabChange('workflows');
      // Wait for the workflow screen to mount when navigation starts on another tab.
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('speckit-process-step-focus', { detail: { caseId: activeCase?.id, step: index } })), 0);
    };
    return <aside className="hidden shrink-0 select-none overflow-y-auto border-r border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70 md:flex md:w-72 md:flex-col">
      <button type="button" onClick={() => onTabChange('workflows')} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-left"><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{definition.label} workflow</span><span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300">{completedSteps.length}/{definition.steps.length}</span></div><p className="mt-2 text-xs font-bold text-zinc-100">{activeCase?.title || definition.steps[currentStep].title}</p><p className="mt-1 text-[11px] text-zinc-400">{definition.steps.length - completedSteps.length} step{definition.steps.length - completedSteps.length === 1 ? '' : 's'} remaining</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.round((completedSteps.length / definition.steps.length) * 100)}%` }} /></div></button>
      <div className="mt-5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Your workflow</div><nav className="mt-2 space-y-1" aria-label={`${definition.label} steps`}>{definition.steps.map((step, index) => <button key={step.artifact} type="button" onClick={() => openWorkflowStep(index)} aria-current={index === currentStep ? 'step' : undefined} className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs ${index === currentStep ? 'bg-cyan-500/10 text-cyan-200' : completedSteps.includes(index) ? 'text-emerald-300' : 'text-zinc-500'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">{completedSteps.includes(index) ? '✓' : index + 1}</span><span className="font-semibold">{step.title}</span></button>)}</nav>
      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800"><div className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Studio</div><button type="button" onClick={() => onTabChange('workflows')} className="mt-2 flex w-full items-center gap-2.5 rounded-xl bg-slate-200 px-2.5 py-2 text-left text-xs font-semibold text-slate-950 dark:bg-zinc-900 dark:text-zinc-100"><Wrench className="h-4 w-4" />Workflows</button><button type="button" onClick={() => onTabChange('settings')} className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900"><Settings className="h-4 w-4" />Settings</button></div>
      <button type="button" onClick={() => onTabChange('overview')} className="mt-auto rounded-xl border border-zinc-800 p-3 text-left text-[11px] text-zinc-400 hover:border-cyan-400/40">Switch to feature delivery <span className="block pt-1 font-bold text-cyan-300">Feature Journey →</span></button>
    </aside>;
  }
  const journey = getProjectJourney(project);
  const current = getJourneyStage(journey.activeStage);
  const completed = journey.completedStages.length;
  const remaining = Math.max(0, featureJourneyStages.length - completed);
  const currentLabel = current.id === 2 && project.featureInbox?.length ? 'Review feature' : current.shortLabel;
  const completedStages = featureJourneyStages.filter((item) => journey.completedStages.includes(item.id));
  const upcomingStages = featureJourneyStages.filter((item) => !journey.completedStages.includes(item.id) && item.id !== current.id);
  const stageLink = (item: typeof current) => {
    const label = item.id === 2 && project.featureInbox?.length ? 'Review feature' : item.shortLabel;
    const isComplete = journey.completedStages.includes(item.id); const isCurrent = current.id === item.id; const isWorkspaceOpen = activeTab === item.destination;
    return <button key={item.id} type="button" onClick={() => { if (isComplete && !isCurrent && onReopenFeatureStage && window.confirm(`Reopen “${item.title}” for editing? Its evidence stays intact, but this stage and later stages will need review again.`)) onReopenFeatureStage(item.id); onTabChange(item.destination); }} aria-current={isCurrent ? 'step' : undefined} className={`group flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-xs transition-all ${isCurrent ? 'border-cyan-500/40 bg-cyan-500/10 text-slate-950 dark:text-cyan-100' : isWorkspaceOpen ? 'border-slate-300 bg-slate-200/70 text-slate-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100' : 'border-transparent text-slate-700 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'} ${!isComplete && !isCurrent ? 'opacity-70 hover:opacity-100' : ''}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isComplete ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : isCurrent ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' : 'border-slate-300 text-slate-500 dark:border-zinc-700 dark:text-zinc-500'}`}>{isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.id}</span><span className={isCurrent ? 'text-cyan-600 dark:text-cyan-300' : isComplete ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-zinc-500'}>{stageIcons[item.destination]}</span><span className="min-w-0 flex-1 font-semibold">{label}</span>{isCurrent && <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Now</span>}{isComplete && !isCurrent && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300">Edit</span>}{!isComplete && !isCurrent && <Circle className="h-2.5 w-2.5 text-slate-400 dark:text-zinc-600" />}</button>;
  };

  return <aside className="hidden shrink-0 select-none overflow-y-auto border-r border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70 md:flex md:w-72 md:flex-col">
    <div className={`rounded-xl border p-3 transition-colors ${activeTab === 'overview' ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-slate-200 bg-white hover:border-cyan-500/30 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-cyan-500/30'}`}>
      <button type="button" onClick={() => onTabChange('overview')} className="w-full text-left">
      <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700 dark:text-cyan-300">Feature journey</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{completed}/8</span></div>
      <div className="mt-2 flex items-end justify-between gap-3"><div><p className="text-xs font-bold text-slate-900 dark:text-zinc-100">{current.id}. {currentLabel}</p><p className="mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">{remaining} stage{remaining === 1 ? '' : 's'} remaining</p></div><ChevronRight className="h-4 w-4 text-cyan-500" /></div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.round((completed / featureJourneyStages.length) * 100)}%` }} /></div>
      </button>
      {connectorState !== 'ready' && <button type="button" onClick={() => onTabChange('workspace')} className="mt-3 flex w-full items-center gap-2 rounded-lg border border-amber-400/35 bg-amber-500/10 px-2.5 py-2 text-left text-[11px] font-bold text-amber-800 hover:bg-amber-500/15 dark:text-amber-200"><Terminal className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1">{connectorState === 'checking' ? 'Checking local connector…' : 'Set up local connector'}</span><ChevronRight className="h-3.5 w-3.5" /></button>}
    </div>

    <div className="mt-5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Your journey</div>
    <nav aria-label="Feature journey stages" className="mt-2 space-y-1">
      {stageLink(current)}
      {completedStages.length > 0 && <ProgressiveDisclosure className="mt-1" tone="complete" label={`${completedStages.length} completed stage${completedStages.length === 1 ? '' : 's'}`} summary="show">{completedStages.map(stageLink)}</ProgressiveDisclosure>}
      {upcomingStages.length > 0 && <ProgressiveDisclosure className="mt-1" label={`${upcomingStages.length} upcoming stage${upcomingStages.length === 1 ? '' : 's'}`} summary="show">{upcomingStages.map(stageLink)}</ProgressiveDisclosure>}
    </nav>

    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800"><div className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Studio</div><button type="button" onClick={() => onTabChange('workflows')} className={`mt-2 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold ${activeTab === 'workflows' ? 'bg-slate-200 text-slate-950 dark:bg-zinc-900 dark:text-zinc-100' : 'text-slate-600 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}><Wrench className="h-4 w-4" />Workflows</button><button type="button" onClick={() => onTabChange('settings')} className={`mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold ${activeTab === 'settings' ? 'bg-slate-200 text-slate-950 dark:bg-zinc-900 dark:text-zinc-100' : 'text-slate-600 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}><Settings className="h-4 w-4" />Settings</button>{showAdvancedTools && <button type="button" onClick={() => onTabChange('import')} className={`mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold ${activeTab === 'import' ? 'bg-slate-200 text-slate-950 dark:bg-zinc-900 dark:text-zinc-100' : 'text-slate-600 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}><FolderGit2 className="h-4 w-4" />Repository import <span className="ml-auto text-[10px] text-slate-400 dark:text-zinc-600">Advanced</span></button>}</div>

  </aside>;
};
