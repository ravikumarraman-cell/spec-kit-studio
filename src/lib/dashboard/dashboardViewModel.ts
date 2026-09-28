import type { FeatureInboxItem, SpecKitProject, ViewTab } from '../../types/speckit';
import { activeDeliveryItemForProject, deliveryItemLabel } from '../deliveryItems';
import { createFeatureJourney, featureJourneyStages, getJourneyStage } from '../featureJourney';
import { activeWorkflowContext } from '../workflowContext';
import { dashboardDestination, type DashboardDestination } from './dashboardNavigation';
import { dashboardPriority, type DashboardDominantRegion } from './dashboardPriority';

export interface DashboardNextAction {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  destination: DashboardDestination;
}

export interface DeliverySummary {
  id: string;
  type: string;
  title: string;
  summary: string;
  status: string;
  isActive: boolean;
}

export interface ReadinessSummary {
  label: string;
  detail: string;
  state: 'ready' | 'attention';
  destination: DashboardDestination;
}

export interface DashboardInsight {
  id: 'coverage' | 'quality' | 'evidence';
  label: string;
  value: string;
  detail: string;
  destination: DashboardDestination;
}

export interface DashboardViewModel {
  dominant: DashboardDominantRegion;
  workspaceName: string;
  repositoryName?: string;
  connectorLabel: string;
  nextAction: DashboardNextAction;
  activeDelivery?: DeliverySummary;
  queue: DeliverySummary[];
  completedStageIds: number[];
  activeStageId?: number;
  readiness: ReadinessSummary[];
  insights: DashboardInsight[];
  workflowLabel?: string;
}

function summaryFor(item: FeatureInboxItem, activeId?: string): DeliverySummary {
  const lifecycle = item.lifecycle ? item.lifecycle.replace('-', ' ') : 'Ready to continue';
  return { id: item.id, type: deliveryItemLabel(item), title: item.title, summary: item.summary || 'No outcome summary recorded yet.', status: lifecycle, isActive: item.id === activeId };
}

export function createDashboardViewModel(project: SpecKitProject): DashboardViewModel {
  const activeDelivery = activeDeliveryItemForProject(project);
  const journey = project.journey || createFeatureJourney();
  const stage = getJourneyStage(journey.activeStage);
  const isComplete = journey.completedStages.includes(featureJourneyStages.at(-1)?.id || 8);
  const hasRepository = Boolean(project.importedRepo?.repoUrl);
  const workflow = activeWorkflowContext(project);
  const queue = (project.featureInbox || []).slice().reverse().map((item) => summaryFor(item, activeDelivery?.id)).sort((a, b) => Number(b.isActive) - Number(a.isActive)).slice(0, 3);
  const dominant = dashboardPriority({ hasRepository, hasDelivery: Boolean(activeDelivery), isComplete });
  const repoDestination = dashboardDestination('workspace', hasRepository ? 'View connection details' : 'Connect repository');
  const readiness: ReadinessSummary[] = [
    { label: hasRepository ? 'Repository connected' : 'Repository not connected', detail: hasRepository ? 'Baseline evidence is available for this workspace.' : 'Connect and scan a repository before delivery work.', state: hasRepository ? 'ready' : 'attention', destination: repoDestination },
    { label: activeDelivery ? 'Delivery item selected' : 'No delivery item selected', detail: activeDelivery ? `${deliveryItemLabel(activeDelivery)} scope is retained locally in this workspace.` : 'Import a feature or choose one user story to begin.', state: activeDelivery ? 'ready' : 'attention', destination: dashboardDestination(activeDelivery ? 'journey' : 'workspace', activeDelivery ? 'Open guided journey' : 'Start delivery work') },
  ];
  const scopedRequirementCount = activeDelivery?.requirementIds.length || project.spec.functionalRequirements.length;
  const plannedTaskCount = activeDelivery?.taskIds.length || project.tasks.tasks.length;
  const audit = activeDelivery?.qualityAudit || project.audit;
  const receiptCount = activeDelivery?.implementationReceipts?.length || 0;
  const insights: DashboardInsight[] = [
    { id: 'coverage', label: 'Traceability', value: `${plannedTaskCount}/${scopedRequirementCount || 0}`, detail: scopedRequirementCount ? 'planned tasks / scoped requirements' : 'Add scoped requirements to measure coverage.', destination: dashboardDestination('tasks', 'Open task traceability') },
    { id: 'quality', label: 'Quality audit', value: audit ? `${audit.overallScore}%` : 'Not run', detail: audit ? `${audit.gaps.length + audit.ambiguities.length} open finding${audit.gaps.length + audit.ambiguities.length === 1 ? '' : 's'}` : 'Run the audit when specification evidence is ready.', destination: dashboardDestination('audit', 'Open quality audit') },
    { id: 'evidence', label: 'Implementation evidence', value: `${receiptCount}`, detail: receiptCount === 1 ? 'reviewed local receipt retained' : 'reviewed local receipts retained', destination: dashboardDestination('journey', 'Open delivery evidence') },
  ];

  let nextAction: DashboardNextAction;
  if (!hasRepository) {
    nextAction = { eyebrow: 'WORKSPACE SETUP', title: 'Connect a repository', description: 'Scan the repository to establish a grounded baseline before planning delivery work.', actionLabel: 'Open Connected Workspace', destination: dashboardDestination('workspace', 'Open Connected Workspace') };
  } else if (!activeDelivery) {
    nextAction = { eyebrow: 'READY TO BEGIN', title: 'Choose a delivery outcome', description: 'Start with one feature or one independently deliverable user story. The scope stays visible through handoff.', actionLabel: 'Start delivery work', destination: dashboardDestination('workspace', 'Start delivery work') };
  } else if (isComplete) {
    nextAction = { eyebrow: 'DELIVERY COMPLETE', title: 'Review the handoff package', description: 'The journey is complete. Keep the reviewed evidence with the repository before beginning another delivery item.', actionLabel: 'Open handoff', destination: dashboardDestination('export', 'Open handoff') };
  } else if (workflow) {
    nextAction = { eyebrow: workflow.label.toUpperCase(), title: workflow.nextStep, description: workflow.caseTitle ? `Continue “${workflow.caseTitle}” in its dedicated workflow.` : 'Create or continue the focused workflow.', actionLabel: 'Continue workflow', destination: dashboardDestination('workflows', 'Continue workflow') };
  } else {
    nextAction = { eyebrow: `STAGE ${stage.id} OF ${featureJourneyStages.length}`, title: stage.title, description: stage.outcome, actionLabel: stage.action, destination: dashboardDestination('journey', stage.action) };
  }

  return {
    dominant, workspaceName: project.name, repositoryName: project.importedRepo?.repoName, connectorLabel: hasRepository ? 'Repository ready' : 'Needs setup', nextAction,
    activeDelivery: activeDelivery ? summaryFor(activeDelivery, activeDelivery.id) : undefined, queue, completedStageIds: journey.completedStages, activeStageId: activeDelivery ? stage.id : undefined, readiness, insights, workflowLabel: workflow?.label,
  };
}
