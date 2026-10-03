import { lazy, Suspense } from 'react';
import type { ImportedFeatureData } from '../hooks/useProjectWorkspace';
import type { useProjectWorkspace } from '../hooks/useProjectWorkspace';
import type { DeliveryIntake } from './useStudioShell';
import type { PersonaId, SpecKitProject, ViewTab } from '../types/speckit';

const QuickSearchModal = lazy(() => import('../components/common/QuickSearchModal').then((module) => ({ default: module.QuickSearchModal })));
const AiSpecModal = lazy(() => import('../components/common/AiSpecModal').then((module) => ({ default: module.AiSpecModal })));
const FeatureImportModal = lazy(() => import('../components/import/FeatureImportModal').then((module) => ({ default: module.FeatureImportModal })));
const IntegrationsModal = lazy(() => import('../components/integrations/IntegrationsModal').then((module) => ({ default: module.IntegrationsModal })));
const NewProjectModal = lazy(() => import('../components/project/NewProjectModal').then((module) => ({ default: module.NewProjectModal })));

type ProjectWorkspace = ReturnType<typeof useProjectWorkspace>;
type DialogState = { quickSearch: boolean; aiSpec: boolean; newProject: boolean; featureImport: boolean; integrations: boolean };

interface StudioDialogsProps {
  project: SpecKitProject;
  workspace: ProjectWorkspace;
  dialogs: DialogState;
  deliveryIntake: DeliveryIntake;
  closeDialog: (dialog: keyof DialogState) => void;
  onNavigate: (tab: ViewTab) => void;
  onCreateProject: (name: string, description: string) => void;
  onApplyAiSpec: (spec: SpecKitProject['spec'], plan?: SpecKitProject['plan'], tasks?: SpecKitProject['tasks']) => void;
  onOpenDeliveryIntake: (scope: DeliveryIntake['scope'], storyId?: string, route?: PersonaId) => void;
  onMergeIntoActiveProject: (stories: Parameters<ProjectWorkspace['mergeImportedFeature']>[0], data: ImportedFeatureData, route?: PersonaId) => boolean;
}

/** Keeps globally reachable, lazy-loaded dialogs out of the application layout. */
export function StudioDialogs({ project, workspace, dialogs, deliveryIntake, closeDialog, onNavigate, onCreateProject, onApplyAiSpec, onOpenDeliveryIntake, onMergeIntoActiveProject }: StudioDialogsProps) {
  return (
    <Suspense fallback={null}>
      {dialogs.quickSearch && <QuickSearchModal isOpen onClose={() => closeDialog('quickSearch')} project={project} onNavigateTab={(tab) => { onNavigate(tab); closeDialog('quickSearch'); }} onStartStoryDelivery={(storyId) => { closeDialog('quickSearch'); onOpenDeliveryIntake('user-story', storyId); }} />}
      {dialogs.aiSpec && <AiSpecModal isOpen onClose={() => closeDialog('aiSpec')} project={project} onApplySpecData={onApplyAiSpec} />}
      {dialogs.featureImport && <FeatureImportModal isOpen onClose={() => closeDialog('featureImport')} onImportComplete={(newProject) => { workspace.replaceFromImport(newProject); onNavigate('overview'); }} activeProject={project} initialScope={deliveryIntake.scope} initialStoryId={deliveryIntake.storyId} personaRoute={deliveryIntake.personaRoute} onMergeIntoActiveProject={onMergeIntoActiveProject} onStartStoryDelivery={(story, requirements, source, parentFeatureId, referenceImages) => { const started = workspace.startStoryDelivery(story, requirements, source, parentFeatureId, referenceImages); if (started) onNavigate('overview'); return Boolean(started); }} onOpenWorkspace={() => { closeDialog('featureImport'); onNavigate('workspace'); }} />}
      {dialogs.integrations && <IntegrationsModal isOpen onClose={() => closeDialog('integrations')} specData={project.spec} planData={project.plan} tasksData={project.tasks} rulesData={project.constitution} />}
      {dialogs.newProject && <NewProjectModal isOpen onClose={() => closeDialog('newProject')} onCreate={onCreateProject} />}
    </Suspense>
  );
}
