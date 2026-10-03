import { ArrowRight, BadgeCheck, CheckCircle2, Circle, FileCheck2, Undo2 } from 'lucide-react';
import type { FeatureInboxItem, FeatureJourney, PersonaId, ViewTab } from '../../types/speckit';
import { personaCatalogEntry } from '../../lib/personas/catalog';
import type { PersonaHandoffPolicy, PersonaRecipientEntry } from '../../lib/personas/workflowPolicy';
import { StudioSidebarNav } from './StudioSidebarNav';
import { featureJourneyStages, getJourneyStage } from '../../lib/featureJourney';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';
import { confirmStudioAction } from '../../lib/confirmation';

interface Props {
  activeTab: ViewTab;
  feature: FeatureInboxItem;
  personaId: PersonaId;
  handoff: PersonaHandoffPolicy;
  onNavigate: (tab: ViewTab) => void;
  onOpenPersona: (personaId: PersonaId) => void;
  onOpenRecipient: (personaId: PersonaId, featureId: string, entry: PersonaRecipientEntry) => void;
  onReturnToHandoff?: () => void;
  journey?: FeatureJourney;
  showMigration: boolean;
  isCollapsed: boolean;
}

/** Shared sidebar state for a finished persona workflow. Engineering stages
 * remain absent until a user intentionally opens the receiving role. */
export function PersonaHandoffSidebar({ activeTab, feature, personaId, handoff, onNavigate, onOpenPersona, onOpenRecipient, onReturnToHandoff, journey, showMigration, isCollapsed }: Props) {
  const persona = personaCatalogEntry(personaId);
  const recipient = personaCatalogEntry(handoff.nextPersona);
  const currentStage = journey ? getJourneyStage(journey.activeStage) : undefined;
  const completedStages = journey ? featureJourneyStages.filter((stage) => journey.completedStages.includes(stage.id)) : [];
  const upcomingStages = journey ? featureJourneyStages.filter((stage) => !journey.completedStages.includes(stage.id) && stage.id !== currentStage?.id) : [];
  const returnToHandoff = async () => {
    if (!onReturnToHandoff) return;
    const confirmed = await confirmStudioAction({ title: 'Return to the completed handoff?', description: 'This pauses the shared Feature Journey and returns you to the original handoff. No stage evidence, drafts, or repository work is deleted.', confirmLabel: 'Return to handoff', tone: 'caution' });
    if (confirmed) onReturnToHandoff();
  };
  const stageLink = (stage: typeof featureJourneyStages[number], state: 'complete' | 'current' | 'upcoming') => <button key={stage.id} type="button" disabled={state === 'upcoming'} onClick={() => onNavigate('journey')} aria-current={state === 'current' ? 'step' : undefined} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs disabled:cursor-not-allowed ${state === 'current' ? 'bg-cyan-500/10 font-bold text-cyan-800 dark:text-cyan-100' : state === 'complete' ? 'text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300' : 'text-slate-500 dark:text-zinc-500'}`}><span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${state === 'current' ? 'border-cyan-400/60 text-cyan-700 dark:text-cyan-300' : state === 'complete' ? 'border-emerald-400/50 text-emerald-700 dark:text-emerald-300' : 'border-slate-300 dark:border-zinc-700'}`}>{state === 'complete' ? <CheckCircle2 className="h-3.5 w-3.5" /> : state === 'upcoming' ? <Circle className="h-2.5 w-2.5" /> : stage.id}</span><span className="min-w-0 flex-1 font-semibold">{stage.shortLabel}</span>{state === 'current' && <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide">Now</span>}</button>;
  return <aside id="studio-sidebar" aria-label="Workspace navigation" aria-hidden={isCollapsed} inert={isCollapsed || undefined} className={`studio-sidebar hidden min-w-0 shrink-0 select-none overflow-y-auto border-r border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70 md:flex md:w-72 md:flex-col${isCollapsed ? ' studio-sidebar--collapsed' : ''}`}>
    <section className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3" aria-label="Persona handoff complete">
      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300"><BadgeCheck className="h-3.5 w-3.5" />{persona.label} HANDOFF COMPLETE</p>
      <p className="mt-2 text-xs font-bold text-slate-900 dark:text-zinc-100">{feature.title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400">Accepted {handoff.artifactLabel} saved. {journey ? 'Shared delivery is underway; this handoff remains attached as context.' : 'Engineering delivery has not started.'}</p>
    </section>
    <div className="mt-5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Handoff status</div>
    <nav className="mt-2 space-y-1" aria-label="Persona handoff status">
      <button type="button" onClick={() => onOpenPersona(personaId)} className="flex w-full items-center gap-2 rounded-xl bg-emerald-500/10 px-2.5 py-2 text-left text-xs font-bold text-emerald-800 dark:text-emerald-200"><span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-400/50">✓</span>Review {persona.label} handoff</button>
      {!journey && <><button type="button" onClick={() => onOpenRecipient(handoff.nextPersona, feature.id, handoff.recipientEntry)} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-200/70 dark:text-zinc-300 dark:hover:bg-zinc-900"><ArrowRight className="h-4 w-4 text-cyan-600 dark:text-cyan-300" />{handoff.recipientEntry === 'shared-journey' ? `Start Feature Journey as ${recipient.label}` : `Open ${recipient.label}`}</button>{handoff.recipientEntry === 'shared-journey' && <p className="px-2.5 text-[10px] leading-4 text-slate-500 dark:text-zinc-400">Starts at Connect safely. Your accepted product definition is already complete, so the next stage after the baseline is Ground impact.</p>}</>}
    </nav>
    {journey && currentStage ? <><div className="mt-5 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">Feature Journey · delivery started</div><section className="mt-2 rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-2" aria-label="Active Feature Journey"><button type="button" onClick={() => onNavigate('journey')} className="w-full rounded-lg px-1 py-1 text-left"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Shared delivery</span><span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-200">{journey.completedStages.length}/8</span></div><p className="mt-2 text-xs font-bold text-slate-900 dark:text-zinc-100">{currentStage.id}. {currentStage.shortLabel}</p><p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400">This is now the single active route for this feature.</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-zinc-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${Math.round((journey.completedStages.length / featureJourneyStages.length) * 100)}%` }} /></div></button><nav className="mt-2 border-t border-cyan-300/20 pt-2" aria-label="Feature Journey stages">{stageLink(currentStage, 'current')}{completedStages.length > 0 && <ProgressiveDisclosure className="mt-1" tone="complete" label={`${completedStages.length} completed stages`} summary="show">{completedStages.map((stage) => stageLink(stage, 'complete'))}</ProgressiveDisclosure>}{upcomingStages.length > 0 && <ProgressiveDisclosure className="mt-1" label={`${upcomingStages.length} upcoming stages`} summary="show">{upcomingStages.map((stage) => stageLink(stage, 'upcoming'))}</ProgressiveDisclosure>}</nav>{onReturnToHandoff && <div className="mt-2 border-t border-cyan-300/20 px-1 pt-2"><button type="button" onClick={() => { void returnToHandoff(); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-violet-800 hover:bg-violet-500/10 dark:text-violet-200"><Undo2 className="h-3.5 w-3.5" />Return to completed handoff</button><p className="px-2.5 pt-1 text-[10px] leading-4 text-slate-500 dark:text-zinc-400">Pauses this route. All shared-delivery evidence stays with the feature.</p></div>}</section></> : <p className="mt-4 rounded-lg border border-slate-200 bg-white/70 p-2.5 text-[11px] leading-relaxed text-slate-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"><FileCheck2 className="mr-1 inline h-3.5 w-3.5" />The engineering Journey appears when the receiving role begins delivery.</p>}
    <StudioSidebarNav activeTab={activeTab} onNavigate={onNavigate} showMigration={showMigration} />
  </aside>;
}
