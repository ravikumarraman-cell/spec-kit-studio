import { useEffect, useMemo, useState } from 'react';
import type { SpecKitProject, ViewTab } from '../../../types/speckit';
import { createDashboardViewModel } from '../../../lib/dashboard/dashboardViewModel';
import { readDashboardDisclosurePreferences, saveDashboardDisclosurePreference, type DashboardDisclosurePreferences } from '../../../lib/dashboard/dashboardPreferences';
import { WorkspaceCommandBar } from './WorkspaceCommandBar';
import { NextActionCard } from './NextActionCard';
import { DeliveryQueue } from './DeliveryQueue';
import { ActiveDeliveryMap } from './ActiveDeliveryMap';
import { WorkspaceReadinessRow } from './WorkspaceReadinessRow';
import { InsightDisclosure } from './InsightDisclosure';
import { ActiveRunCard } from './ActiveRunCard';
import { useWorkspaceHubRuntime } from './useWorkspaceHubRuntime';
import { readConnectorRunReference } from '../../../lib/connectorRunSession';
import { readLocalAgentJobReference } from '../../../lib/localAgentJobSession';

interface Props { project: SpecKitProject; onNavigate: (tab: ViewTab) => void; onOpenSearch: () => void; onStartDelivery: () => void; }
export function WorkspaceHub({ project, onNavigate, onOpenSearch, onStartDelivery }: Props) {
  const model = useMemo(() => createDashboardViewModel(project), [project]);
  const recoveredJobIds = useMemo(() => {
    const repositoryPath = project.importedRepo?.repoUrl;
    const delivery = project.featureInbox?.find((item) => item.id === project.journey?.featureId) || project.featureInbox?.at(-1);
    if (!repositoryPath || !delivery) return [];
    return [
      readConnectorRunReference(project.id, 'journey-stage', delivery.id, repositoryPath)?.jobId,
      delivery.worktreePath ? readLocalAgentJobReference(project.id, delivery.id, delivery.worktreePath)?.jobId : undefined,
    ].filter((id): id is string => Boolean(id));
  }, [project.featureInbox, project.id, project.importedRepo?.repoUrl, project.journey?.featureId]);
  const runtime = useWorkspaceHubRuntime(project.importedRepo?.repoUrl, recoveredJobIds);
  const [disclosures, setDisclosures] = useState<DashboardDisclosurePreferences>(() => readDashboardDisclosurePreferences(project.id));
  useEffect(() => setDisclosures(readDashboardDisclosurePreferences(project.id)), [project.id]);
  const setDisclosure = (section: keyof DashboardDisclosurePreferences, open: boolean) => {
    setDisclosures((current) => ({ ...current, [section]: open }));
    saveDashboardDisclosurePreference(project.id, section, open);
  };
  const stopRun = () => {
    if (window.confirm('Stop this local connector run? It will not modify workflow approvals or remove retained evidence.')) void runtime.stopSafely();
  };
  const connectorLabel = runtime.connector === 'ready' ? 'Connector ready' : runtime.connector === 'stale' ? 'Connector status stale' : model.connectorLabel;
  const hasConnectedWorkspace = Boolean(project.importedRepo?.repoUrl);
  const needsDeliveryChoice = hasConnectedWorkspace && !model.activeDelivery;
  const openNextAction = () => { if (needsDeliveryChoice) onStartDelivery(); else onNavigate(model.nextAction.destination.tab); };
  return <main className="mx-auto max-w-6xl space-y-4 pb-10"><WorkspaceCommandBar workspaceName={model.workspaceName} repositoryName={model.repositoryName} connectorLabel={connectorLabel} onOpenSearch={onOpenSearch} /><NextActionCard action={model.nextAction} onNavigate={openNextAction} />{runtime.job && <ActiveRunCard job={runtime.job} stale={runtime.connector === 'stale'} onOpen={() => onNavigate('journey')} onStop={stopRun} />}{runtime.connector === 'stale' && <p role="status" className="workspace-hub-muted px-1 text-xs">Connector refresh is delayed. Existing run information is retained; {runtime.message || 'check Connected Workspace if this continues.'}</p>}<DeliveryQueue items={model.queue} onOpen={() => onNavigate('journey')} /><ActiveDeliveryMap completedStageIds={model.completedStageIds} activeStageId={model.activeStageId} onOpenJourney={() => onNavigate('journey')} /><WorkspaceReadinessRow items={model.readiness} open={disclosures.readiness} onToggle={(open) => setDisclosure('readiness', open)} onNavigate={(index) => onNavigate(model.readiness[index].destination.tab)} /><InsightDisclosure insights={model.insights} open={disclosures.insights} onToggle={(open) => setDisclosure('insights', open)} onOpen={(insight) => onNavigate(insight.destination.tab)} /></main>;
}
