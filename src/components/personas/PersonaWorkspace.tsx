import { type ReactNode, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { BusinessAnalysisPackage, DeveloperArchitecturePackage, PersonaId, PersonaDecisionReceipt, ProductOutcomePackage, SecurityResearchPackage, SpecKitProject, TechnicalRole, ViewTab } from '../../types/speckit';
import { activeFeatureForProject, getJourneyStage } from '../../lib/featureJourney';
import { DeliveryScope } from '../../types/speckit';
import { PersonaHandoffStage } from './PersonaHandoffStage';
import { HandoffImportResult, PersonaHandoffImport } from './PersonaHandoffImport';
import { StudioPortableHandoff } from '../../lib/personas/portableHandoff';
import { technicalRoleForFeature } from '../../lib/personas/technicalRoles';
import { personaHandoffPolicy, personaWorkflowRule } from '../../lib/personas/workflowPolicy';
import { PersonaWorkflowProgress } from './PersonaWorkflowProgress';
import { ReceivingRolePreview } from '../common/ReceivingRolePreview';
import { personaCatalogEntry } from '../../lib/personas/catalog';
import { PersonaPanelProps, personaPanelDefinition } from './personaPanelRegistry';

interface Props {
  project: SpecKitProject;
  personaId: PersonaId;
  onCreateFeature: (personaId: PersonaId, title: string, summary: string) => boolean;
  onSaveProductOutcome: (featureId: string, outcome: ProductOutcomePackage) => void;
  onSaveProductManagerDecision: (featureId: string, decision: PersonaDecisionReceipt) => void;
  onSaveDeveloperArchitecture: (featureId: string, artifact: DeveloperArchitecturePackage) => void;
  onSaveTechnicalRole: (featureId: string, role: TechnicalRole) => void;
  onSaveBusinessAnalysis: (featureId: string, artifact: BusinessAnalysisPackage) => void;
  onSaveSecurityResearch: (featureId: string, artifact: SecurityResearchPackage) => void;
  onCompletePersonaWorkflow: (featureId: string, personaId: PersonaId) => void;
  onResumeHandoff: (handoff: StudioPortableHandoff) => HandoffImportResult;
  onStartPersona: (personaId: PersonaId) => void;
  onNavigate: (tab: ViewTab) => void;
  onImportFeature: (personaId: PersonaId, scope?: DeliveryScope) => void;
  onExploreSharedJourney: (featureId: string) => void;
}

/** Shared handoff entry point. A handoff belongs to the feature and engine,
 * not to the screen where it was created, so every persona gets the same safe
 * import/resume behavior. */
function PersonaHandoffEntry({ personaId, onResume }: { personaId: PersonaId; onResume: (handoff: StudioPortableHandoff) => HandoffImportResult }) {
  return <PersonaHandoffImport personaId={personaId} onImport={onResume} />;
}

/** Shared persona chrome: navigation, portable handoff intake, and the
 * feature-owned completion card are consistent regardless of who consumes
 * the work. Individual persona panels only own their specialist editor. */
function PersonaRouteFrame({ project, personaId, feature, onBack, onResume, onContinue, onComplete, onExploreJourney, onStartAsDeveloper, onContinueAsDeveloper, showImport = true, showHandoff = true, children }: {
  project: SpecKitProject;
  personaId: PersonaId;
  feature: ReturnType<typeof activeFeatureForProject>;
  onBack: () => void;
  onResume: (handoff: StudioPortableHandoff) => HandoffImportResult;
  onContinue: () => void;
  onComplete: () => void;
  onExploreJourney: () => void;
  onStartAsDeveloper?: () => void;
  onContinueAsDeveloper?: () => void;
  showImport?: boolean;
  showHandoff?: boolean;
  children: ReactNode;
}) {
  return <main className="mx-auto max-w-5xl space-y-5 pb-12">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-xs font-bold text-violet-200 hover:text-violet-100"><ArrowLeft className="h-3.5 w-3.5" />All delivery options</button>
    <PersonaWorkflowProgress project={project} personaId={personaId} />
    {children}
    {showHandoff && feature && <PersonaHandoffStage project={project} personaId={personaId} feature={feature} onContinue={onContinue} onComplete={onComplete} onExploreJourney={onExploreJourney} onDashboard={onBack} onStartAsDeveloper={onStartAsDeveloper} onContinueAsDeveloper={onContinueAsDeveloper} />}
    {showImport && <PersonaHandoffEntry personaId={personaId} onResume={onResume} />}
  </main>;
}

/**
 * A chosen role is useful context, but it must never hide the active delivery
 * action. Once delivery starts, every stage has one authoritative workspace.
 * Keeping this gate in the common persona frame prevents each role from
 * exposing a stale editor after the Journey has already advanced.
 */
function ActiveJourneyPriority({ stage, onContinue }: { stage: ReturnType<typeof getJourneyStage>; onContinue: () => void }) {
  return <section className="rounded-2xl border border-cyan-400/35 bg-gradient-to-br from-cyan-500/10 via-zinc-900 to-zinc-900 p-6">
    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Feature Journey · Stage {stage.id}</p>
    <h1 className="mt-1 text-2xl font-bold text-zinc-100">{stage.title} is ready for your attention</h1>
    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300">Your selected persona and its accepted handoff remain attached to this feature. The next safe action now belongs in the shared Journey, where Studio can retain the required evidence and review decision.</p>
    <div className="mt-5 rounded-xl border border-cyan-400/20 bg-zinc-950/45 p-4"><p className="text-xs font-bold text-cyan-100">What happens next</p><p className="mt-1 text-xs leading-relaxed text-zinc-300">{stage.outcome}</p></div>
    <button type="button" onClick={onContinue} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-bold text-zinc-950 hover:bg-cyan-300"><ArrowRight className="h-4 w-4" />{stage.action}</button>
    <p className="mt-3 text-xs text-zinc-400">Studio will not create another persona draft or alter the accepted handoff.</p>
  </section>;
}

/** Dedicated role workspace. It intentionally stays outside the engineering
 * stage sequence until the user explicitly hands work to technical planning. */
export function PersonaWorkspace({ project, personaId, onCreateFeature, onSaveProductOutcome, onSaveProductManagerDecision, onSaveDeveloperArchitecture, onSaveTechnicalRole, onSaveBusinessAnalysis, onSaveSecurityResearch, onCompletePersonaWorkflow, onResumeHandoff, onStartPersona, onNavigate, onImportFeature, onExploreSharedJourney }: Props) {
  const feature = activeFeatureForProject(project);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const workflowRule = personaWorkflowRule(personaId);
  const handoff = personaHandoffPolicy(feature, personaId);
  const technicalRole = technicalRoleForFeature(feature);
  const panelDefinition = personaPanelDefinition(personaId);
  const panelProps: PersonaPanelProps = {
    project,
    personaId,
    feature,
    technicalRole,
    onCreateFeature,
    onSaveProductOutcome,
    onSaveProductManagerDecision,
    onSaveDeveloperArchitecture,
    onSaveTechnicalRole,
    onSaveBusinessAnalysis,
    onSaveSecurityResearch,
    onNavigate,
    onImportFeature,
  };
  const frame = (children: ReactNode, showImport = true, showHandoff = true) => <PersonaRouteFrame project={project} personaId={personaId} feature={feature} onBack={() => onNavigate('overview')} onResume={onResumeHandoff} onContinue={() => handoff ? (workflowRule.continuationBehavior === 'preview-recipient' ? setShowRecipientPreview(true) : onStartPersona(handoff.nextPersona)) : onNavigate('journey')} onComplete={() => { if (feature) onCompletePersonaWorkflow(feature.id, personaId); onNavigate('overview'); }} onExploreJourney={() => { if (feature) onExploreSharedJourney(feature.id); onNavigate('journey'); }} onStartAsDeveloper={feature ? () => { onSaveTechnicalRole(feature.id, 'developer'); onExploreSharedJourney(feature.id); onNavigate('journey'); } : undefined} onContinueAsDeveloper={feature ? () => { onSaveTechnicalRole(feature.id, 'combined'); onExploreSharedJourney(feature.id); onNavigate('journey'); } : undefined} showImport={showImport} showHandoff={showHandoff}>{children}</PersonaRouteFrame>;
  const journeyStage = project.journey ? getJourneyStage(project.journey.activeStage) : undefined;
  const journeyTakesPriority = Boolean(feature && project.journey?.featureId === feature.id && journeyStage && !project.journey.completedStages.includes(journeyStage.id));

  // Navigation can briefly retain the former persona tab while a receiving
  // role starts shared delivery. Redirect immediately so the left rail and
  // main content always describe the same active stage.
  useEffect(() => {
    if (journeyTakesPriority) onNavigate('journey');
  }, [journeyTakesPriority, onNavigate]);

  if (journeyTakesPriority && journeyStage) return frame(<ActiveJourneyPriority stage={journeyStage} onContinue={() => onNavigate(journeyStage.destination)} />, false, false);

  // A completed role has one job: hand its accepted artifact to the next
  // receiver. Keeping its editor and an unrelated import affordance visible
  // at the same time makes completion look like unfinished work. This common
  // gate deliberately applies to every persona and every future handoff.
  if (handoff && workflowRule.continuationBehavior === 'preview-recipient' && showRecipientPreview) return frame(<ReceivingRolePreview senderLabel={personaCatalogEntry(personaId).label} recipientLabel={personaCatalogEntry(handoff.nextPersona).label} artifactLabel={handoff.artifactLabel} feature={feature!} onBack={() => setShowRecipientPreview(false)} onOpenRecipient={() => onStartPersona(handoff.nextPersona)} />, false, false);
  if (handoff) return frame(null, false, true);

  return frame(panelDefinition.render(panelProps), true, panelDefinition.shouldShowHandoff?.(panelProps) ?? true);
}
