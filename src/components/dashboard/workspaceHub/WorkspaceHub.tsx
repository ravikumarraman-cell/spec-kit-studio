import { useEffect, useMemo, useState } from 'react';
import type { PersonaId, SpecKitProject, ViewTab } from '../../../types/speckit';
import { createDashboardViewModel } from '../../../lib/dashboard/dashboardViewModel';
import { readDashboardDisclosurePreferences, saveDashboardDisclosurePreference, type DashboardDisclosurePreferences } from '../../../lib/dashboard/dashboardPreferences';
import { WorkspaceCommandBar } from './WorkspaceCommandBar';
import { NextActionCard } from './NextActionCard';
import { DeliveryQueue } from './DeliveryQueue';
import { ActiveDeliveryMap } from './ActiveDeliveryMap';
import { WorkspaceReadinessRow } from './WorkspaceReadinessRow';
import { InsightDisclosure } from './InsightDisclosure';
import { ActiveRunCard } from './ActiveRunCard';
import { PersonaStartCard } from './PersonaStartCard';
import { ResumePersonaCard } from './ResumePersonaCard';
import { PersonaHandoffHomeCard } from './PersonaHandoffHomeCard';
import { useWorkspaceHubRuntime } from './useWorkspaceHubRuntime';
import { readConnectorRunReference } from '../../../lib/connectorRunSession';
import { readLocalAgentJobReference } from '../../../lib/localAgentJobSession';
import { personaContext } from '../../../lib/personas/context';
import { confirmStudioAction } from '../../../lib/confirmation';

interface Props { project: SpecKitProject; onNavigate: (tab: ViewTab) => void; onStartPersona: (personaId: PersonaId) => void; onClearPersonaRoute: () => void; onPrefetchPersona: () => void; personaRoute?: PersonaId; }
export function WorkspaceHub({ project, onNavigate, onStartPersona, onClearPersonaRoute, onPrefetchPersona, personaRoute }: Props) {
  const model = useMemo(() => createDashboardViewModel(project, personaRoute), [project, personaRoute]);
  const selectedFeature = project.featureInbox?.find((item) => item.id === project.journey?.featureId) || project.featureInbox?.at(-1);
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
  const stopRun = async () => {
    if (await confirmStudioAction({ title: 'Stop this local connector run?', description: 'It will not modify workflow approvals or remove retained evidence.', confirmLabel: 'Stop run', tone: 'caution' })) void runtime.stopSafely();
  };
  const hasConnectedWorkspace = Boolean(project.importedRepo?.repoUrl);
  const checking = hasConnectedWorkspace && !runtime.checkedAt && runtime.connector === 'unavailable';
  const statusLabel = !hasConnectedWorkspace ? 'Repository not connected' : checking || runtime.connector === 'checking' ? 'Checking connector' : runtime.connector === 'ready' ? 'Connector ready' : runtime.connector === 'stale' ? 'Connector status stale' : 'Connector unavailable';
  const checkedTime = runtime.checkedAt ? new Date(runtime.checkedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : undefined;
  const statusDetail = !hasConnectedWorkspace ? 'Product and business outcomes can begin without one.' : runtime.connector === 'ready' && checkedTime ? `Live check at ${checkedTime}` : runtime.connector === 'stale' && checkedTime ? `Last verified at ${checkedTime}` : runtime.connector === 'stale' ? 'Live status could not be verified.' : 'Checking the local runtime now.';
  // A retained persona route is historical context once the shared Feature
  // Journey is underway. It must not compete with the current delivery stage.
  const activePersona = model.journeyInProgress ? undefined : personaContext(personaRoute);
  const showEngineeringOverview = Boolean(model.activeDelivery) && !model.personaHandoff && (!activePersona || model.journeyInProgress);
  const showInsights = showEngineeringOverview && model.insights.some((insight) => !['0', '0/0', 'Not run'].includes(insight.value));
  return <main className="mx-auto max-w-6xl space-y-4 pb-10">
    <WorkspaceCommandBar workspaceName={model.workspaceName} repositoryName={model.repositoryName} statusLabel={statusLabel} statusDetail={statusDetail} />
    {model.personaHandoff && selectedFeature ? <PersonaHandoffHomeCard handoff={model.personaHandoff} feature={selectedFeature} /> : activePersona ? <ResumePersonaCard persona={activePersona} onContinue={() => onStartPersona(personaRoute!)} onChooseAnother={onClearPersonaRoute} /> : model.activeDelivery ? <NextActionCard action={model.nextAction} onNavigate={() => onNavigate(model.nextAction.destination.tab)} /> : <PersonaStartCard onStartPersona={onStartPersona} onPrefetch={onPrefetchPersona} />}
    {runtime.message && <p role="status" className="workspace-hub-warning rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs">{runtime.message}</p>}
    {runtime.job && <ActiveRunCard job={runtime.job} stale={runtime.connector === 'stale'} onOpen={() => onNavigate('journey')} onStop={stopRun} />}
    {(showEngineeringOverview || activePersona) && <ActiveDeliveryMap completedStageIds={model.completedStageIds} activeStageId={model.activeStageId} personaId={model.journeyInProgress ? undefined : personaRoute} feature={selectedFeature} onOpenJourney={() => onNavigate(activePersona ? 'personas' : 'journey')} />}
    {!model.personaHandoff && <DeliveryQueue items={model.queue} onOpen={() => onNavigate('journey')} />}
    <div className={`grid gap-4 ${showInsights ? 'lg:grid-cols-2' : ''}`}>
      <WorkspaceReadinessRow items={model.readiness} open={disclosures.readiness} onToggle={(open) => setDisclosure('readiness', open)} onNavigate={(index) => onNavigate(model.readiness[index].destination.tab)} />
      {showInsights && <InsightDisclosure insights={model.insights} open={disclosures.insights} onToggle={(open) => setDisclosure('insights', open)} onOpen={(insight) => onNavigate(insight.destination.tab)} />}
    </div>
  </main>;
}
