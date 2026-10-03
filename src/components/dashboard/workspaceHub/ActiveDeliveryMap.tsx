import { WorkflowMap } from '../../common/WorkflowMap';
import { featureJourneyStages } from '../../../lib/featureJourney';
import type { FeatureInboxItem, PersonaId } from '../../../types/speckit';
import { personaCatalogEntry } from '../../../lib/personas/catalog';
import { personaWorkflowCurrentStep, personaWorkflowRule } from '../../../lib/personas/workflowPolicy';
import { personaHandoffPolicy } from '../../../lib/personas/workflowPolicy';

interface Props { completedStageIds: number[]; activeStageId?: number; onOpenJourney: () => void; personaId?: PersonaId; feature?: FeatureInboxItem; }

/** One map surface with role-aware stages. The engineering Journey is never
 * presented as the current path while a specialist persona owns the work. */
export function ActiveDeliveryMap({ completedStageIds, activeStageId, onOpenJourney, personaId, feature }: Props) {
  const persona = personaId ? personaCatalogEntry(personaId) : undefined;
  const personaWorkflow = personaId ? personaWorkflowRule(personaId) : undefined;
  const personaStep = personaId ? personaWorkflowCurrentStep(feature, personaId) : undefined;
  const personaHandoff = personaId ? personaHandoffPolicy(feature, personaId) : undefined;
  const personaWorkflowComplete = Boolean(personaHandoff);
  if (!personaWorkflow && !activeStageId) return null;
  const stages = personaWorkflow
    ? personaWorkflow.mandatoryStages.map((stage, index) => ({ id: index + 1, label: stage.label }))
    : featureJourneyStages.map((stage) => ({ id: stage.id, label: stage.shortLabel }));
  const currentStage = personaWorkflow ? (personaStep || 0) + 1 : activeStageId!;
  const completeIds = personaWorkflow ? stages.filter((stage) => stage.id < currentStage).map((stage) => stage.id) : completedStageIds;
  return <section className="workspace-hub-surface workspace-hub-delivery-map rounded-2xl border p-4 shadow-xs"><div className="flex items-center justify-between gap-3"><div><h2 className="workspace-hub-title text-base font-bold">{persona ? `${persona.label} workflow` : 'Delivery map'}</h2><p className="workspace-hub-muted mt-1 text-xs">{personaWorkflowComplete ? 'Review complete. The approved handoff is ready for its receiving role.' : persona ? 'A focused path to a reviewable handoff.' : 'One clear route from intent to a verified handoff.'}</p></div><button type="button" onClick={onOpenJourney} className="workspace-hub-link shrink-0 text-xs font-semibold">{personaWorkflowComplete ? 'View completed handoff' : persona ? 'Continue review' : 'Open journey'}</button></div><WorkflowMap steps={stages} activeStepId={currentStage} completedStepIds={completeIds} isComplete={personaWorkflowComplete} completionTitle={persona ? `${persona.label} handoff ready` : undefined} ariaLabel={persona ? `${persona.label} workflow progress` : 'Delivery progress'} /></section>;
}
