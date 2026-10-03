import { FeatureInboxItem, PersonaId, SpecKitProject } from '../../types/speckit';
import { downloadBlob } from '../../lib/export';
import { slugify } from '../../lib/projectIdentity';
import { acceptedPersonaArtifact } from '../../lib/personas/consumption';
import { personaHandoffRecipientText } from '../../lib/personas/handoff';
import { productManagerHandoffPackage } from '../../lib/personas/productManagerHandoff';
import { personaCatalogEntry } from '../../lib/personas/catalog';
import { selectedEngineContract } from '../../lib/sddEngineWorkflow';
import { createPersonaHandoffArchive, createReviewedDeliveryHandoffArchive, personaHandoffArchivePaths, personaHandoffSupportingFiles } from '../../lib/personas/portableHandoff';
import { PersonaHandoffCard } from './PersonaHandoffCard';
import { requirementsForDeliveryItem } from '../../lib/deliveryItems';
import { technicalRoleDefinition, technicalRoleForFeature } from '../../lib/personas/technicalRoles';
import { PersonaDeliveryObservability } from './PersonaDeliveryObservability';
import { personaHandoffPolicy, personaWorkflowRule } from '../../lib/personas/workflowPolicy';
import { reviewedDeliveryHandoffPackage } from '../../lib/personas/reviewedDeliveryHandoff';
import { SddWorkflowOwner, sddEngineRoleHandoff } from '../../lib/sddEngineDeliverables';

interface Props { project: SpecKitProject; personaId: PersonaId; feature: FeatureInboxItem; onContinue: () => void; onComplete: () => void; onExploreJourney?: () => void; onDashboard: () => void; onStartAsDeveloper?: () => void; onContinueAsDeveloper?: () => void; }

/** The single completion stage shared by every persona. The policy table
 * determines recipients; the persona configuration supplies plain-language
 * artifact details. */
export function PersonaHandoffStage({ project, personaId, feature, onContinue, onComplete, onExploreJourney, onDashboard, onStartAsDeveloper, onContinueAsDeveloper }: Props) {
  const artifact = acceptedPersonaArtifact(feature, personaId);
  const workflow = personaHandoffPolicy(feature, personaId);
  if (!workflow) return null;
  const rule = personaWorkflowRule(personaId);
  const technicalRole = personaId === 'developer' ? technicalRoleForFeature(feature) : undefined;
  const technicalDefinition = technicalRole === 'architect' ? technicalRoleDefinition('architect') : undefined;
  const markdown = artifact ? (personaId === 'product-manager' ? productManagerHandoffPackage(feature.productOutcome!) : artifact.markdown) : undefined;
  const reviewedDelivery = workflow.kind === 'reviewed-delivery' ? reviewedDeliveryHandoffPackage(project, feature) : undefined;
  const engineOwner: SddWorkflowOwner = technicalDefinition ? 'architect' : personaId;
  const engineRequirement = sddEngineRoleHandoff(project.sddEngine, engineOwner);
  // Feature-owned PM specifications are authoritative. Other personas expose
  // the engine artifact explicitly declared by their adapter.
  const engineArtifact = personaId === 'product-manager' && feature.specification?.path && feature.specification.content && feature.specification.acceptedAt
    ? { kind: 'spec', path: feature.specification.path, content: feature.specification.content }
    : artifact?.specKitProjection;
  const supportingFiles = artifact ? personaHandoffSupportingFiles(project, feature, personaId) : [];
  const download = artifact
    ? async () => downloadBlob(await createPersonaHandoffArchive(project, feature, personaId), `${slugify(artifact.title)}-${rule.downloadSuffix}.zip`)
    : reviewedDelivery ? async () => downloadBlob(await createReviewedDeliveryHandoffArchive(project, feature), `${slugify(feature.title)}-reviewed-delivery-handoff.zip`) : undefined;
  const downloadEngineArtifact = engineArtifact
    ? () => downloadBlob(new Blob([engineArtifact.content], { type: 'text/markdown;charset=utf-8' }), engineArtifact.path.split('/').at(-1) || `${engineArtifact.kind}.md`)
    : undefined;
  const stories = project.spec.userStories.filter((story) => feature.userStoryIds.includes(story.id));
  const requirements = requirementsForDeliveryItem(project, feature);
  const deliverables = [
    { label: 'Feature scope', items: [`${feature.title}${feature.summary ? ` — ${feature.summary}` : ''}`] },
    { label: `User stories (${stories.length})`, items: stories.length ? stories.map((story) => `${story.id}: ${story.title}`) : ['No user stories are attached to this feature.'] },
    { label: `Requirements (${requirements.length})`, items: requirements.length ? requirements.map((requirement) => `${requirement.id}: ${requirement.title}`) : ['No requirements are attached to this feature.'] },
    engineArtifact ? { label: engineRequirement?.deliverable.label || `Canonical ${engineArtifact.kind}.md`, path: engineArtifact.path, items: [engineRequirement?.handoff.purpose || `Accepted ${engineArtifact.kind}.md for the selected SDD engine.`] }
      : undefined,
    artifact ? { label: `Accepted ${technicalDefinition ? 'Architecture package' : rule.artifactLabel}`, path: artifact.path, items: [...(technicalDefinition?.handoffContents || rule.handoffContents)] }
      : { label: 'Product Manager review decision', items: [feature.productManagerDecision?.reason || 'The imported delivery was reviewed and accepted for technical handoff.'] },
  ].filter(Boolean) as Array<{ label: string; path?: string; items: string[] }>;
  if (technicalDefinition) {
    deliverables.splice(3, 0,
      { label: 'Approved architecture plan', path: feature.architecturePlan?.path, items: feature.architecturePlan?.acceptedAt ? ['Stage 4 design is accepted and can be resumed by a Developer.'] : ['Included only when the shared Stage 4 review is accepted.'] },
      { label: 'Impact and security context', items: [feature.impactMap?.acceptedAt ? 'Accepted repository impact map' : 'No accepted impact map was retained.', feature.securityResearch?.acceptedAt ? 'Accepted security review and controls' : 'No accepted security review was retained.'] },
    );
  }
  return <><PersonaHandoffCard personaLabel={technicalDefinition?.label || personaCatalogEntry(personaId).label} artifactLabel={technicalDefinition ? 'Architecture handoff' : workflow.artifactLabel} title={technicalDefinition?.handoffTitle || workflow.title} recipients={technicalDefinition ? 'Developers and the configured Spec-Driven Development engine can consume this accepted architecture package. In this workspace, the Developer resumes at Stage 5: Plan delivery.' : personaHandoffRecipientText(personaId)} deliverables={deliverables} repositoryNote={technicalDefinition ? 'This is a reviewable architecture boundary, not a repository write. The receiving Developer uses it as read-only context, reviews it against the target repository, then plans and implements through the normal quality gates.' : workflow.repositoryNote} artifactPath={artifact?.path || reviewedDelivery?.path} artifactMarkdown={markdown || reviewedDelivery?.markdown} engineContract={selectedEngineContract(project)} engineArtifact={engineArtifact} archivePaths={artifact ? personaHandoffArchivePaths(artifact, supportingFiles) : reviewedDelivery?.archivePaths} onDownload={download} onDownloadEngineArtifact={downloadEngineArtifact} onContinue={technicalDefinition && onStartAsDeveloper ? onStartAsDeveloper : onContinue} onDashboard={onDashboard} continueLabel={technicalDefinition ? 'Start as receiving Developer — Stage 5' : workflow.continueLabel} primaryActionDescription={technicalDefinition ? 'Opens Stage 5 for the receiving Developer with the accepted architecture attached. It does not start implementation.' : workflow.primaryActionDescription} onFinish={onComplete} finishLabel={technicalDefinition ? 'Done with architecture work' : workflow.completionLabel} downloadLabel={technicalDefinition ? 'Download architecture artifacts (.zip)' : workflow.kind === 'reviewed-delivery' ? 'Download reviewed delivery handoff (.zip)' : undefined} nextStepGuidance={technicalDefinition ? 'Architecture is complete. You can finish here. Technical delivery remains available later to the receiving Developer with this approved context.' : workflow.completionGuidance} onAlternativeContinue={technicalDefinition ? onContinueAsDeveloper : onExploreJourney} alternativeContinueLabel={technicalDefinition ? 'Continue as Architect + Developer' : workflow.explorationLabel} /><PersonaDeliveryObservability feature={feature} personaId={personaId} /></>;
}
