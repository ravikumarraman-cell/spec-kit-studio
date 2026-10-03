import { useEffect, useState } from 'react';
import type { ImportedFeatureData } from '../hooks/useProjectWorkspace';
import type { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import { approveJourneyStage, completeJourneyPrerequisite, createFeatureJourney, getJourneyStage, reopenJourneyStage as reopenJourney } from '../lib/featureJourney';
import { resumablePersonaRoute } from '../lib/personas/context';
import { isSharedFeatureJourneyActive, sharedFeatureJourneyRule } from '../lib/personas/workflowPolicy';
import { OUTCOME_REFINERY_REQUEST_EVENT } from '../lib/studioGuide';
import { getStudioSettings, saveStudioSettings } from '../lib/studioSettings';
import type { DeliveryScope, FeatureSpec, ImplementationPlan, PersonaId, SpecKitProject, TaskBreakdown, ViewTab } from '../types/speckit';

type ProjectWorkspace = ReturnType<typeof useProjectWorkspace>;

export interface DeliveryIntake {
  scope: DeliveryScope;
  storyId?: string;
  personaRoute?: PersonaId;
}

const DEFAULT_LANDING_TAB: ViewTab = 'overview';

/** Owns cross-screen navigation and dialog state, leaving App as layout only. */
export function useStudioShell(activeProject: SpecKitProject | null, workspace: ProjectWorkspace) {
  const [activeTab, setActiveTab] = useState<ViewTab>(DEFAULT_LANDING_TAB);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => getStudioSettings().sidebarOpen);
  const [personaRoute, setPersonaRoute] = useState<PersonaId>();
  const [targetPromptTaskId, setTargetPromptTaskId] = useState<string>();
  const [deliveryIntake, setDeliveryIntake] = useState<DeliveryIntake>({ scope: 'feature' });
  const [dialogs, setDialogs] = useState({ quickSearch: false, aiSpec: false, newProject: false, featureImport: false, integrations: false });

  const openDialog = (dialog: keyof typeof dialogs) => setDialogs((current) => ({ ...current, [dialog]: true }));
  const closeDialog = (dialog: keyof typeof dialogs) => setDialogs((current) => ({ ...current, [dialog]: false }));
  const setSidebarOpen = (open: boolean) => {
    setIsSidebarOpen(open);
    saveStudioSettings({ ...getStudioSettings(), sidebarOpen: open });
  };

  useEffect(() => {
    const openRefinery = () => setActiveTab('refinery');
    window.addEventListener(OUTCOME_REFINERY_REQUEST_EVENT, openRefinery);
    return () => window.removeEventListener(OUTCOME_REFINERY_REQUEST_EVENT, openRefinery);
  }, []);

  useEffect(() => {
    if (!activeProject) return;
    const sharedJourneyActive = isSharedFeatureJourneyActive(activeProject.journey);
    const persistedPersona = sharedJourneyActive ? activeProject.journey?.activePersona || sharedFeatureJourneyRule.defaultWorkingPersona : resumablePersonaRoute(activeProject);
    setPersonaRoute(persistedPersona);
    if (sharedJourneyActive) setActiveTab('journey');
    else if (persistedPersona) setActiveTab('personas');
  }, [activeProject?.id]);

  const openDeliveryIntake = (scope: DeliveryScope, storyId?: string, route?: PersonaId) => { setDeliveryIntake({ scope, storyId, personaRoute: route }); openDialog('featureImport'); };
  const startPersonaRoute = (personaId: PersonaId) => {
    setPersonaRoute(personaId);
    const stage = activeProject?.journey ? getJourneyStage(activeProject.journey.activeStage) : undefined;
    setActiveTab(stage && stage.id >= 6 && !activeProject!.journey!.completedStages.includes(stage.id) ? stage.destination : 'personas');
  };
  const startHandoffJourney = (personaId: PersonaId, featureId: string) => {
    workspace.startJourneyFromPersonaHandoff(featureId, personaId);
    setPersonaRoute(personaId);
    setActiveTab('journey');
  };
  const startFeatureFromWorkspace = () => {
    if (!activeProject) return;
    const journey = activeProject.journey || createFeatureJourney();
    if (!journey.completedStages.includes(1)) workspace.saveJourney(approveJourneyStage(journey, 1));
    openDeliveryIntake('feature');
  };
  const continueImportedHandoffFromWorkspace = () => {
    if (!activeProject) return;
    const journey = completeJourneyPrerequisite(activeProject.journey || createFeatureJourney(), 1);
    workspace.saveJourney({ ...journey, activePersona: personaRoute || sharedFeatureJourneyRule.defaultWorkingPersona });
    setActiveTab('journey');
  };
  const reopenJourneyStage = (stageId: number) => {
    if (!activeProject) return;
    const journey = activeProject.journey || createFeatureJourney();
    if (journey.completedStages.includes(stageId)) workspace.saveJourney(reopenJourney(journey, stageId));
  };
  const returnToPersonaHandoff = (featureId: string, personaId: PersonaId) => {
    if (!workspace.returnToPersonaHandoff(featureId)) return;
    setPersonaRoute(personaId);
    setActiveTab('overview');
  };
  const applyAiSpec = (spec: FeatureSpec, plan?: ImplementationPlan, tasks?: TaskBreakdown) => { workspace.applyAiSpecData(spec, plan, tasks); closeDialog('aiSpec'); };
  const mergeImportedFeature = (stories: Parameters<ProjectWorkspace['mergeImportedFeature']>[0], data: ImportedFeatureData, route?: PersonaId) => {
    const saved = workspace.mergeImportedFeature(stories, data, route);
    // A selected persona owns the first human review. The feature is already
    // saved at this point; this navigation merely opens that review and never
    // asks the user to save the same feature again. Generic imports continue
    // straight to the authoritative Journey.
    if (saved) setActiveTab(route ? 'personas' : 'journey');
    return saved;
  };

  return { activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen: setSidebarOpen, personaRoute, setPersonaRoute, targetPromptTaskId, setTargetPromptTaskId, deliveryIntake, dialogs, openDialog, closeDialog, openDeliveryIntake, startPersonaRoute, startHandoffJourney, startFeatureFromWorkspace, continueImportedHandoffFromWorkspace, reopenJourneyStage, returnToPersonaHandoff, applyAiSpec, mergeImportedFeature, defaultLandingTab: DEFAULT_LANDING_TAB };
}
