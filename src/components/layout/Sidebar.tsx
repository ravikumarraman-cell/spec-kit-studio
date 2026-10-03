import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, Bot, CheckCircle2, CheckSquare, ChevronRight, Circle, FileText, FolderGit2, HardDrive, LayoutDashboard, Map, Pencil, Settings, Sparkles, Terminal, Workflow, Wrench } from 'lucide-react';
import { FeatureInboxItem, PersonaId, SpecKitProject, ViewTab } from '../../types/speckit';
import { getStudioSettings } from '../../lib/studioSettings';
import { featureJourneyStages, getJourneyStage, getProjectJourney } from '../../lib/featureJourney';
import { processDefinitions } from '../../lib/processCases';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';
import { configuredConnectorClient } from '../../lib/connector';
import { useSerialAsyncInterval } from '../../hooks/useSerialAsyncInterval';
import { personaContext } from '../../lib/personas/context';
import { confirmStudioAction } from '../../lib/confirmation';
import { OtherWorkNavigationItem, StudioSidebarNav, WorkspaceMigrationNavigationItem } from './StudioSidebarNav';
import { personaHandoffPolicy, personaWorkflowCurrentStep, personaWorkflowRule, resolveDeliveryPersona, resolveWorkingPersona, shouldShowPersonaHandoffNavigation } from '../../lib/personas/workflowPolicy';
import { personaCatalogEntry } from '../../lib/personas/catalog';

const PersonaHandoffSidebar = lazy(() => import('./PersonaHandoffSidebar').then((module) => ({ default: module.PersonaHandoffSidebar })));

interface SidebarProps { activeTab: ViewTab; onTabChange: (tab: ViewTab) => void; project: SpecKitProject; isCollapsed?: boolean; personaRoute?: PersonaId; onStartPersona?: (personaId: PersonaId) => void; onStartHandoffJourney?: (personaId: PersonaId, featureId: string) => void; onReopenJourneyStage?: (stageId: number) => void; onReturnToPersonaHandoff?: (featureId: string, personaId: PersonaId) => void; }
const sidebarClassName = 'studio-sidebar hidden min-w-0 shrink-0 select-none overflow-y-auto border-r border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70 md:flex md:w-72 md:flex-col';
const stageIcons: Record<ViewTab, React.ReactNode> = {
  overview: <LayoutDashboard className="h-4 w-4" />, personas: <Sparkles className="h-4 w-4" />, journey: <Workflow className="h-4 w-4" />, refinery: <Wrench className="h-4 w-4" />, workflows: <Wrench className="h-4 w-4" />, workspace: <HardDrive className="h-4 w-4" />, spec: <FileText className="h-4 w-4" />, constitution: <Map className="h-4 w-4" />, plan: <Workflow className="h-4 w-4" />, tasks: <CheckSquare className="h-4 w-4" />, audit: <Activity className="h-4 w-4" />, prompt: <Bot className="h-4 w-4" />, export: <Terminal className="h-4 w-4" />, import: <FolderGit2 className="h-4 w-4" />, settings: <Settings className="h-4 w-4" />,
};

// Adapters keep the journey-specific sidebar concise while labels, styles, and
// accessibility behavior live in the shared navigation primitives.
function OtherWorkNavItem({ active, onOpen, className }: { active: boolean; onOpen: () => void; className?: string }) {
  return <OtherWorkNavigationItem active={active} onNavigate={() => onOpen()} className={className} />;
}
function WorkspaceMigrationNavItem({ active, onOpen }: { active: boolean; onOpen: () => void }) {
  return <WorkspaceMigrationNavigationItem active={active} onNavigate={() => onOpen()} />;
}

function ActivePersonaSidebar({ activeTab, feature, personaId, onNavigate, showMigration, isCollapsed }: { activeTab: ViewTab; feature: FeatureInboxItem | undefined; personaId: PersonaId; onNavigate: (tab: ViewTab) => void; showMigration: boolean; isCollapsed: boolean }) {
  const persona = personaCatalogEntry(personaId);
  const workflow = personaWorkflowRule(personaId);
  const currentIndex = personaWorkflowCurrentStep(feature, personaId);
  return <aside id="studio-sidebar" aria-label="Workspace navigation" aria-hidden={isCollapsed} inert={isCollapsed || undefined} className={`${sidebarClassName}${isCollapsed ? ' studio-sidebar--collapsed' : ''}`}>
    <section className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-3" aria-label={`${persona.label} workflow`}>
      <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">{persona.label} workflow</span><span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-200">{currentIndex + 1}/{workflow.mandatoryStages.length}</span></div>
      <p className="mt-2 text-xs font-bold text-slate-900 dark:text-zinc-100">{workflow.mandatoryStages[currentIndex].label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400">{workflow.mandatoryStages[currentIndex].description}</p>
    </section>
    <div className="mt-5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Your workflow</div>
    <nav className="mt-2 space-y-1" aria-label={`${persona.label} workflow stages`}>
      {workflow.mandatoryStages.map((stage, index) => <button key={stage.id} type="button" onClick={() => onNavigate('personas')} aria-current={index === currentIndex ? 'step' : undefined} className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs ${index === currentIndex ? 'bg-violet-500/10 text-violet-800 dark:text-violet-100' : index < currentIndex ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-zinc-500'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">{index < currentIndex ? '✓' : index + 1}</span><span className="font-semibold">{stage.label}</span></button>)}
    </nav>
    <p className="mt-4 rounded-lg border border-slate-200 bg-white/70 p-2.5 text-[11px] leading-relaxed text-slate-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">The engineering Feature Journey starts only after this role completes its explicit handoff.</p>
    <StudioSidebarNav activeTab={activeTab} onNavigate={onNavigate} showMigration={showMigration} />
  </aside>;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, project, isCollapsed = false, personaRoute, onStartPersona, onStartHandoffJourney, onReopenJourneyStage, onReturnToPersonaHandoff }) => {
  const [showAdvancedTools, setShowAdvancedTools] = useState(() => getStudioSettings().showAdvancedTools);
  const [connectorState, setConnectorState] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  useEffect(() => {
    const refresh = () => setShowAdvancedTools(getStudioSettings().showAdvancedTools);
    window.addEventListener('speckit-settings-change', refresh);
    return () => window.removeEventListener('speckit-settings-change', refresh);
  }, []);
  useSerialAsyncInterval(async (isCurrent) => {
    try {
      const health = await configuredConnectorClient().health();
      if (isCurrent()) setConnectorState(health.status === 'ok' ? 'ready' : 'unavailable');
    } catch {
      if (isCurrent()) setConnectorState('unavailable');
    }
  }, 15_000, !isCollapsed, 'sidebar-connector-health');
  const personaFeature = project.featureInbox?.find((item) => item.id === project.journey?.featureId) || project.featureInbox?.at(-1);
  const handoffPersonaId = resolveDeliveryPersona(personaFeature, project.journey?.personaRoute);
  const completedPersonaHandoff = handoffPersonaId && personaFeature ? personaHandoffPolicy(personaFeature, handoffPersonaId) : undefined;
  const personaJourney = getProjectJourney(project);
  // A completed handoff is provenance. It has its own compact completion
  // navigation only before the shared Feature Journey starts. From the first
  // shared stage onward, the common Journey sidebar is authoritative—even
  // after a refresh has cleared the transient role selection.
  if (completedPersonaHandoff && handoffPersonaId && shouldShowPersonaHandoffNavigation(true, personaJourney)) return <Suspense fallback={null}><PersonaHandoffSidebar activeTab={activeTab} feature={personaFeature!} personaId={handoffPersonaId} handoff={completedPersonaHandoff} onNavigate={onTabChange} onOpenPersona={(personaId) => { onStartPersona?.(personaId); onTabChange('personas'); }} onOpenRecipient={(personaId, featureId, entry) => { if (entry === 'shared-journey') { onStartHandoffJourney?.(personaId, featureId); return; } onStartPersona?.(personaId); onTabChange('personas'); }} onReturnToHandoff={onReturnToPersonaHandoff ? () => onReturnToPersonaHandoff(personaFeature!.id, handoffPersonaId) : undefined} journey={undefined} showMigration={showAdvancedTools} isCollapsed={isCollapsed} /></Suspense>;
  if (personaRoute && activeTab === 'personas') return <ActivePersonaSidebar activeTab={activeTab} feature={personaFeature} personaId={personaRoute} onNavigate={onTabChange} showMigration={showAdvancedTools} isCollapsed={isCollapsed} />;
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
    return <aside id="studio-sidebar" aria-label="Workspace navigation" aria-hidden={isCollapsed} inert={isCollapsed || undefined} className={`${sidebarClassName}${isCollapsed ? ' studio-sidebar--collapsed' : ''}`}>
      <button type="button" onClick={() => onTabChange('workflows')} className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-left"><div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{definition.label} workflow</span><span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-300">{completedSteps.length}/{definition.steps.length}</span></div><p className="mt-2 text-xs font-bold text-zinc-100">{activeCase?.title || definition.steps[currentStep].title}</p><p className="mt-1 text-[11px] text-zinc-400">{definition.steps.length - completedSteps.length} step{definition.steps.length - completedSteps.length === 1 ? '' : 's'} remaining</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.round((completedSteps.length / definition.steps.length) * 100)}%` }} /></div></button>
      <div className="mt-5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Your workflow</div><nav className="mt-2 space-y-1" aria-label={`${definition.label} steps`}>{definition.steps.map((step, index) => <button key={step.artifact} type="button" onClick={() => openWorkflowStep(index)} aria-current={index === currentStep ? 'step' : undefined} className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs ${index === currentStep ? 'bg-cyan-500/10 text-cyan-200' : completedSteps.includes(index) ? 'text-emerald-300' : 'text-zinc-500'}`}><span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px]">{completedSteps.includes(index) ? '✓' : index + 1}</span><span className="font-semibold">{step.title}</span></button>)}</nav>
      <StudioSidebarNav activeTab={activeTab} onNavigate={onTabChange} otherWork="always" />
      <button type="button" onClick={() => onTabChange('overview')} className="mt-auto rounded-xl border border-zinc-800 p-3 text-left text-[11px] text-zinc-400 hover:border-cyan-400/40">Return to workspace hub <span className="block pt-1 font-bold text-cyan-300">See your next action →</span></button>
    </aside>;
  }
  // A journey belongs to an imported feature, not to a newly opened workspace.
  // Until someone chooses a delivery route (or imports a feature), keep the
  // navigation neutral instead of silently presenting Engineering as the
  // user's selected workflow.
  const hasSelectedDelivery = Boolean(project.journey?.featureId || project.featureInbox?.length);
  if (!hasSelectedDelivery) {
    const activePersona = personaContext(personaRoute);
    return <aside id="studio-sidebar" aria-label="Workspace navigation" aria-hidden={isCollapsed} inert={isCollapsed || undefined} className={`${sidebarClassName}${isCollapsed ? ' studio-sidebar--collapsed' : ''}`}>
      {(activePersona || activeTab !== 'overview') && <section className="rounded-xl border border-violet-400/30 bg-violet-500/10 p-3" aria-label={activePersona ? 'Active delivery role' : 'Delivery setup'}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">{activePersona ? 'Active delivery role' : 'Delivery setup'}</p>
        <p className="mt-2 text-xs font-bold text-slate-900 dark:text-zinc-100">{activePersona ? `${activePersona.label} in progress` : 'No delivery role selected'}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400">{activePersona ? activePersona.summary : 'Choose a role to begin a focused workflow. A delivery journey appears after that choice.'}</p>
        <button type="button" onClick={() => onTabChange(activePersona ? 'personas' : 'overview')} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-violet-300"><Sparkles className="h-3.5 w-3.5" />{activePersona ? activePersona.nextAction : 'Choose an outcome'}</button>
      </section>}
      <StudioSidebarNav activeTab={activeTab} onNavigate={onTabChange} showMigration={showAdvancedTools} />
    </aside>;
  }
  const journey = getProjectJourney(project);
  const current = getJourneyStage(journey.activeStage);
  // Keep the sidebar and content area in the same role context even for an
  // imported or legacy feature that has Journey state but no completed
  // persona-handoff record to render the specialised sidebar.
  const journeyPersona = resolveWorkingPersona(personaRoute, personaJourney) || resolveDeliveryPersona(personaFeature, personaJourney.personaRoute);
  const journeyPersonaLabel = journeyPersona ? personaCatalogEntry(journeyPersona).label : undefined;
  const handoffPersonaLabel = handoffPersonaId && handoffPersonaId !== journeyPersona ? personaCatalogEntry(handoffPersonaId).label : undefined;
  const completed = journey.completedStages.length;
  const remaining = Math.max(0, featureJourneyStages.length - completed);
  const currentLabel = current.id === 2 && project.featureInbox?.length ? 'Review feature' : current.shortLabel;
  const completedStages = featureJourneyStages.filter((item) => journey.completedStages.includes(item.id));
  const upcomingStages = featureJourneyStages.filter((item) => !journey.completedStages.includes(item.id) && item.id !== current.id);
  const stageLink = (item: typeof current) => {
    const label = item.id === 2 && project.featureInbox?.length ? 'Review feature' : item.shortLabel;
    const isComplete = journey.completedStages.includes(item.id); const isCurrent = current.id === item.id; const isWorkspaceOpen = activeTab === item.destination;
    const editStage = async () => {
      if (!onReopenJourneyStage) return;
      const confirmed = await confirmStudioAction({
        title: `Edit ${item.title}?`,
        description: 'Its approved evidence remains retained, but this stage and later stages will need review again.',
        confirmLabel: 'Reopen and edit',
        tone: 'caution',
      });
      if (!confirmed) return;
      onReopenJourneyStage(item.id);
      onTabChange(item.destination);
    };
    return <div key={item.id} className="flex items-center gap-1"><button type="button" disabled={!isComplete && !isCurrent} onClick={() => { if (isComplete || isCurrent) onTabChange(item.destination); }} aria-label={isComplete && !isCurrent ? `View approved evidence for ${item.title}` : undefined} aria-current={isCurrent ? 'step' : undefined} className={`group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left text-xs transition-all disabled:cursor-not-allowed ${isCurrent ? 'border-cyan-500/40 bg-cyan-500/10 text-slate-950 dark:text-cyan-100' : isWorkspaceOpen ? 'border-slate-300 bg-slate-200/70 text-slate-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100' : 'border-transparent text-slate-700 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'} ${!isComplete && !isCurrent ? 'opacity-60' : ''}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isComplete ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : isCurrent ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' : 'border-slate-300 text-slate-500 dark:border-zinc-700 dark:text-zinc-500'}`}>{isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : item.id}</span><span className={isCurrent ? 'text-cyan-600 dark:text-cyan-300' : isComplete ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-zinc-500'}>{stageIcons[item.destination]}</span><span className="min-w-0 flex-1 font-semibold">{label}</span>{isCurrent && <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Now</span>}{isComplete && !isCurrent && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300">View</span>}{!isComplete && !isCurrent && <Circle className="h-2.5 w-2.5 text-slate-400 dark:text-zinc-600" />}</button>{isComplete && !isCurrent && <button type="button" onClick={() => { void editStage(); }} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-bold text-amber-700 hover:bg-amber-500/10 dark:text-amber-200" aria-label={`Edit ${item.title}`}><Pencil className="h-3.5 w-3.5" />Edit</button>}</div>;
  };

  return <aside id="studio-sidebar" aria-label="Workspace navigation" aria-hidden={isCollapsed} inert={isCollapsed || undefined} className={`${sidebarClassName}${isCollapsed ? ' studio-sidebar--collapsed' : ''}`}>
    <div className={`rounded-xl border p-3 transition-colors ${activeTab === 'journey' ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-slate-200 bg-white hover:border-cyan-500/30 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-cyan-500/30'}`}>
      <button type="button" onClick={() => onTabChange('journey')} className="w-full text-left">
      <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700 dark:text-cyan-300">{journeyPersonaLabel ? 'Delivery journey' : 'Feature journey'}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{completed}/8</span></div>
      {journeyPersonaLabel && <p className="mt-1 text-[11px] font-semibold text-violet-700 dark:text-violet-200">Working as: {journeyPersonaLabel}</p>}
      {handoffPersonaLabel && <p className="mt-0.5 text-[10px] text-slate-500 dark:text-zinc-400">Handoff context: {handoffPersonaLabel}</p>}
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

    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-zinc-800"><div className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Studio</div><button type="button" onClick={() => onTabChange('overview')} className={`mt-2 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold ${activeTab === 'overview' ? 'bg-slate-200 text-slate-950 dark:bg-zinc-900 dark:text-zinc-100' : 'text-slate-600 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}><LayoutDashboard className="h-4 w-4" />Home</button><button type="button" onClick={() => onTabChange('refinery')} className={`mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold ${activeTab === 'refinery' ? 'bg-violet-500/10 text-violet-800 dark:text-violet-200' : 'text-slate-600 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}><Wrench className="h-4 w-4" />Outcome Refinery</button>{activeTab === 'workflows' ? <OtherWorkNavItem active onOpen={() => onTabChange('workflows')} className="mt-1" /> : <ProgressiveDisclosure className="mt-1" label="Other work" summary="bug fix or assessment"><OtherWorkNavItem active={false} onOpen={() => onTabChange('workflows')} /></ProgressiveDisclosure>}<button type="button" onClick={() => onTabChange('settings')} className={`mt-1 flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs font-semibold ${activeTab === 'settings' ? 'bg-slate-200 text-slate-950 dark:bg-zinc-900 dark:text-zinc-100' : 'text-slate-600 hover:bg-slate-200/70 dark:text-zinc-400 dark:hover:bg-zinc-900'}`}><Settings className="h-4 w-4" />Settings</button>{showAdvancedTools && (activeTab === 'import' ? <WorkspaceMigrationNavItem active onOpen={() => onTabChange('import')} /> : <ProgressiveDisclosure className="mt-1" label="Advanced" summary="migrate a workspace"><WorkspaceMigrationNavItem active={false} onOpen={() => onTabChange('import')} /></ProgressiveDisclosure>)}</div>

  </aside>;
};
