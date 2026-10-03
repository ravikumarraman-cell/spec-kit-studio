import { useCallback, useEffect, useState } from 'react';
import { TruthReport } from '../lib/connector';
import { FeatureExtractionPackage } from '../lib/api/imports';
import { createFeatureInboxItem, createStoryInboxItem } from '../lib/featureInbox';
import { deliveryScope } from '../lib/deliveryItems';
import { storageService } from '../lib/storage';
import { normalizeGitRemote } from '../lib/projectIdentity';
import { engineProjectionIssue } from '../lib/personas/specKitProjection';
import { requirementsFromCanonicalSpecification, specificationFromProductOutcome, specificationFromReviewedDelivery, storiesFromCanonicalSpecification } from '../lib/personas/productManagerSpecification';
import { handoffArtifactPayload, studioHandoffImportRule, StudioPortableHandoff } from '../lib/personas/portableHandoff';
import { continueJourneyFromHandoff, featureHandoffContinuation, personaHandoffContinuation, personaHandoffIntake } from '../lib/personas/handoffContinuation';
import { selectedEngineContract } from '../lib/sddEngineWorkflow';
import { recordFeatureImplementationReceipt } from '../lib/featureReceipts';
import { reconcileDeliveryPlanReceipts } from '../lib/featureDeliveryPlanRevision';
import { activeFeatureForProject, createFeatureJourney, featureJourneyStages, reopenJourneyStage } from '../lib/featureJourney';
import {
  FeatureSpec,
  FeatureJourney,
  FunctionalRequirement,
  ImplementationPlan,
  ProjectConstitution,
  SpecAuditResult,
  SpecKitProject,
  TaskBreakdown,
  TaskItem,
  UserStory,
  FeatureImportSource,
  FeatureImplementationReceipt,
  DeliveryPullRequest,
  StudioProcessCase,
  ReferenceImage,
  OutcomeRefineryRun,
  ProductOutcomePackage,
  DeveloperArchitecturePackage,
  BusinessAnalysisPackage,
  SecurityResearchPackage,
  PersonaDecisionReceipt,
  PersonaId,
  TechnicalRole,
  WorkspaceBaselineEvidence,
  SddEngineId,
} from '../types/speckit';

type ImportedTask = Partial<TaskItem>;
export interface ImportedFeatureData {
  title?: string;
  summary?: string;
  source?: FeatureImportSource;
  functionalRequirements?: FunctionalRequirement[];
  tasks?: ImportedTask[];
  referenceImages?: ReferenceImage[];
}
export interface StoryDeliveryStartResult { status: 'created' | 'resumed'; itemId: string; }
export interface PersonaHandoffResumeResult { ok: boolean; message: string; }

const taskPhases = new Set<TaskItem['phase']>([
  'Phase 1: Setup',
  'Phase 2: Core Infrastructure',
  'Phase 3: Integration',
  'Phase 4: Polish & Testing',
]);

function createImportedTask(task: ImportedTask, index: number): TaskItem {
  return {
    id: task.id || `TASK-${200 + index}`,
    title: task.title || `Task ${index + 1}`,
    phase: task.phase && taskPhases.has(task.phase) ? task.phase : 'Phase 2: Core Infrastructure',
    description: task.description || 'Task description',
    status: 'todo',
    estimatedHours: task.estimatedHours || 3,
    mappedRequirementId: task.mappedRequirementId || 'FR-101',
    dependencies: [],
    targetAgentPromptSnippet: task.targetAgentPromptSnippet || `Implement ${task.title || `Task ${index + 1}`}`,
  };
}

/**
 * Application-facing project controller. Components receive stable, domain-specific
 * callbacks and do not need to know how projects are persisted.
 */
export function useProjectWorkspace() {
  const [projects, setProjects] = useState<SpecKitProject[]>([]);
  const [activeProject, setActiveProject] = useState<SpecKitProject | null>(null);

  const refresh = useCallback(() => {
    setProjects(storageService.getProjects());
    setActiveProject(storageService.getActiveProject());
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsubscribe = storageService.subscribe(() => {
      if (mounted) refresh();
    });
    // IndexedDB hydration is asynchronous. Do not populate the workspace from
    // the sample fallback until the durable store (and any legacy migration)
    // has had a chance to complete.
    void storageService.initialize().then(() => {
      if (mounted) refresh();
    });
    return () => { mounted = false; unsubscribe(); };
  }, [refresh]);

  const updateActiveProject = useCallback((updater: (project: SpecKitProject) => SpecKitProject) => {
    const current = storageService.getActiveProject();
    const updated = { ...updater(current), updatedAt: new Date().toISOString() };
    if (!storageService.updateActiveProject(updated)) return null;

    // Re-read after the write. This makes a feature import a durable
    // transaction: the receipt must exist in the persisted aggregate before
    // React state can claim the operation succeeded.
    const persisted = storageService.getProjects().find((project) => project.id === updated.id);
    if (!persisted) return null;
    setActiveProject(persisted);
    setProjects(storageService.getProjects());
    return persisted;
  }, []);

  const selectProject = useCallback((id: string) => {
    storageService.setActiveProjectId(id);
    const selected = storageService.getActiveProject();
    // A completed feature is the safe default when re-entering a workspace.
    // Independent workflows remain available, but require a fresh explicit choice
    // so an old bug/assessment context cannot masquerade as the active journey.
    if (selected.journey?.completedStages.includes(8) && selected.workflowFocus !== 'feature') {
      storageService.updateActiveProject({ ...selected, workflowFocus: 'feature', updatedAt: new Date().toISOString() });
    }
    refresh();
  }, [refresh]);

  const createProject = useCallback((name: string, description: string) => {
    const created = storageService.createNewProject(name, description);
    setActiveProject(created);
    setProjects(storageService.getProjects());
    return created;
  }, []);

  const deleteProject = useCallback((id: string) => {
    // Storage preserves a recoverable snapshot before removal. Keep one
    // workspace available so Studio never falls into an empty state.
    if (storageService.getProjects().length <= 1) return false;
    const deleted = storageService.deleteProject(id);
    if (deleted) refresh();
    return deleted;
  }, [refresh]);

  const resetProjects = useCallback(() => {
    storageService.resetToSampleProjects();
    refresh();
  }, [refresh]);

  const saveSpec = useCallback((spec: FeatureSpec) => updateActiveProject((project) => ({ ...project, spec })), [updateActiveProject]);
  const savePlan = useCallback((plan: ImplementationPlan) => updateActiveProject((project) => ({ ...project, plan })), [updateActiveProject]);
  const saveTasks = useCallback((tasks: TaskBreakdown) => updateActiveProject((project) => ({ ...project, tasks })), [updateActiveProject]);
  const saveConstitution = useCallback((constitution: ProjectConstitution) => updateActiveProject((project) => ({ ...project, constitution })), [updateActiveProject]);
  const saveAudit = useCallback((audit: SpecAuditResult) => updateActiveProject((project) => {
    const activeItem = activeFeatureForProject(project);
    if (!activeItem || deliveryScope(activeItem) === 'feature') return { ...project, audit };
    return {
      ...project,
      audit,
      featureInbox: (project.featureInbox || []).map((item) => item.id === activeItem.id ? { ...item, qualityAudit: audit } : item),
    };
  }), [updateActiveProject]);
  const saveJourney = useCallback((journey: FeatureJourney) => updateActiveProject((project) => ({
    ...project,
    journey,
    featureInbox: (project.featureInbox || []).map((item) => item.id === journey.featureId ? { ...item, journey } : item),
  })), [updateActiveProject]);
  /** Start shared delivery from retained persona evidence. Accepted persona
   * work is credited once; Stage 1 remains the repository-baseline gate. */
  const startJourneyFromPersonaHandoff = useCallback((featureId: string, activePersona?: PersonaId) => updateActiveProject((project) => {
    const feature = (project.featureInbox || []).find((item) => item.id === featureId);
    const continuation = feature ? featureHandoffContinuation(feature) : undefined;
    if (!feature || !continuation) return project;
    const priorJourney = project.journey?.featureId === featureId ? project.journey : createFeatureJourney();
    const journey = { ...continueJourneyFromHandoff(priorJourney, continuation, featureJourneyStages.map((stage) => stage.id), new Date().toISOString()), featureId, personaRoute: feature.personaRoute || priorJourney.personaRoute || activePersona, activePersona: activePersona || priorJourney.activePersona || 'developer' as PersonaId };
    return { ...project, journey, featureInbox: (project.featureInbox || []).map((item) => item.id === featureId ? { ...item, journey } : item) };
  }), [updateActiveProject]);
  const saveStackProfile = useCallback((stackProfile: SpecKitProject['stackProfile']) => updateActiveProject((project) => ({ ...project, stackProfile })), [updateActiveProject]);
  const saveProcessCases = useCallback((processCases: StudioProcessCase[]) => updateActiveProject((project) => ({ ...project, processCases })), [updateActiveProject]);
  const saveWorkflowFocus = useCallback((workflowFocus: SpecKitProject['workflowFocus']) => updateActiveProject((project) => ({ ...project, workflowFocus })), [updateActiveProject]);
  const saveOutcomeRefinery = useCallback((featureId: string, outcomeRefinery: OutcomeRefineryRun) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => item.id === featureId ? { ...item, outcomeRefinery } : item),
  })), [updateActiveProject]);
  const saveProductOutcome = useCallback((featureId: string, productOutcome: ProductOutcomePackage) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => {
      if (item.id !== featureId) return item;
      const acceptedAt = productOutcome.acceptedAt || new Date().toISOString();
      const specification = specificationFromProductOutcome(item, productOutcome, acceptedAt);
      return { ...item, productOutcome: { ...productOutcome, acceptedAt, specKitProjection: { kind: 'spec', path: specification.path, content: specification.content } }, specification, productManagerDecision: { personaId: 'product-manager', status: 'accepted', recordedAt: acceptedAt } };
    }),
  })), [updateActiveProject]);
  const saveProductManagerDecision = useCallback((featureId: string, productManagerDecision: PersonaDecisionReceipt) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => item.id === featureId ? {
      ...item,
      productManagerDecision,
      ...(productManagerDecision.status === 'accepted' ? { specification: specificationFromReviewedDelivery(project, item, productManagerDecision) } : {}),
    } : item),
  })), [updateActiveProject]);
  const saveDeveloperArchitecture = useCallback((featureId: string, developerArchitecture: DeveloperArchitecturePackage) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => item.id === featureId ? {
      ...item,
      developerArchitecture,
      ...(developerArchitecture.acceptedAt ? { architecturePlan: { path: `specs/${item.slug}/plan.md`, content: developerArchitecture.specKitProjection.content, acceptedAt: developerArchitecture.acceptedAt } } : {}),
    } : item),
  })), [updateActiveProject]);
  const saveTechnicalRole = useCallback((featureId: string, technicalRole: TechnicalRole) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => item.id === featureId ? { ...item, technicalRole } : item),
  })), [updateActiveProject]);
  const saveBusinessAnalysis = useCallback((featureId: string, businessAnalysis: BusinessAnalysisPackage) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => item.id === featureId ? {
      ...item,
      businessAnalysis,
      ...(businessAnalysis.acceptedAt ? { specification: { path: `specs/${item.slug}/spec.md`, content: businessAnalysis.specKitProjection.content, acceptedAt: businessAnalysis.acceptedAt } } : {}),
    } : item),
  })), [updateActiveProject]);
  const saveSecurityResearch = useCallback((featureId: string, securityResearch: SecurityResearchPackage) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => item.id === featureId ? { ...item, securityResearch } : item),
  })), [updateActiveProject]);
  const completePersonaWorkflow = useCallback((featureId: string, personaId: PersonaId) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => {
      if (item.id !== featureId || item.personaWorkflowCompletions?.some((completion) => completion.personaId === personaId)) return item;
      return { ...item, personaWorkflowCompletions: [...(item.personaWorkflowCompletions || []), { personaId, completedAt: new Date().toISOString() }] };
    }),
  })), [updateActiveProject]);
  /** Leave a shared delivery route without deleting its retained evidence.
   * The feature keeps its last Journey snapshot; the workspace simply stops
   * treating it as the active route and can return to its persona handoff. */
  const returnToPersonaHandoff = useCallback((featureId: string) => {
    let returned = false;
    updateActiveProject((project) => {
      if (project.journey?.featureId !== featureId) return project;
      returned = true;
      return {
        ...project,
        journey: undefined,
        workflowFocus: 'feature',
        featureInbox: (project.featureInbox || []).map((item) => item.id === featureId ? { ...item, journey: project.journey } : item),
      };
    });
    return returned;
  }, [updateActiveProject]);
  const resumePersonaHandoff = useCallback((handoff: StudioPortableHandoff): PersonaHandoffResumeResult => {
    let result: PersonaHandoffResumeResult = { ok: false, message: 'Studio could not resume this handoff.' };
    updateActiveProject((project) => {
      const contract = selectedEngineContract(project);
      if (!contract.available || handoff.engine.id !== contract.engineId || handoff.engine.version !== contract.version) {
        result = { ok: false, message: `This handoff targets ${handoff.engine.label} ${handoff.engine.version}. Select that same supported engine before importing it.` };
        return project;
      }
      if (handoff.packageType === 'studio-reviewed-delivery-handoff') {
        const items = project.featureInbox || [];
        const existing = items.find((item) => item.slug && item.slug === handoff.feature.slug) || items.find((item) => item.title === handoff.feature.title && item.summary === handoff.feature.summary);
        if (existing?.productManagerDecision?.status === 'accepted') { result = { ok: false, message: 'This feature already has an accepted Product Manager review. Studio did not overwrite it.' }; return project; }
        const importRule = studioHandoffImportRule(handoff.packageType);
        if (!handoff.specification?.path || !handoff.specification.content || handoff.specification.acceptedAt !== handoff.review.recordedAt) { result = { ok: false, message: `${importRule.missingEvidenceMessage} Nothing was imported.` }; return project; }
        const base = existing || createFeatureInboxItem({ title: handoff.feature.title, summary: handoff.feature.summary, userStories: [], functionalRequirements: [], tasks: [] }, 'file', items.length, new Date().toISOString());
        const target = handoff.feature.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handoff.feature.slug) ? { ...base, slug: handoff.feature.slug, scope: handoff.feature.scope || base.scope } : base;
        const issue = engineProjectionIssue(project, target, { kind: importRule.requiredEngineArtifact || 'spec', path: handoff.specification.path, content: handoff.specification.content });
        if (issue) { result = { ok: false, message: `The reviewed-delivery handoff does not satisfy the selected SDD engine contract: ${issue}` }; return project; }
        const now = new Date().toISOString();
        // A reviewed-delivery handoff is a portable unit of traceability. Its
        // scoped stories and requirements must be restored with the feature;
        // retaining only the rendered Markdown leaves later quality gates with
        // no way to prove what the plan and tasks are intended to satisfy.
        const importedStories = handoff.delivery?.userStories || [];
        const importedRequirements = handoff.delivery?.functionalRequirements || [];
        const mergedSpec = {
          ...project.spec,
          userStories: [...project.spec.userStories.filter((story) => !importedStories.some((incoming) => incoming.id === story.id)), ...importedStories],
          functionalRequirements: [...project.spec.functionalRequirements.filter((requirement) => !importedRequirements.some((incoming) => incoming.id === requirement.id)), ...importedRequirements],
        };
        const resumed = {
          ...target,
          userStoryIds: importedStories.length ? importedStories.map((story) => story.id) : target.userStoryIds,
          requirementIds: importedRequirements.length ? importedRequirements.map((requirement) => requirement.id) : target.requirementIds,
          sourceContent: handoff.sourceContent || target.sourceContent,
          productManagerDecision: handoff.review,
          specification: handoff.specification,
        };
        const priorJourney = project.journey?.featureId === target.id ? project.journey : createFeatureJourney(now);
        const continuation = { creditedStages: [2], nextEngineeringStage: 3, summary: 'Accepted Product Manager review and canonical specification restored. After the target repository is connected and baselined, continue at Stage 3: Ground the impact map.' };
        const journey = { ...continueJourneyFromHandoff(priorJourney, continuation, featureJourneyStages.map((stage) => stage.id), now), featureId: target.id };
        result = { ok: true, message: `${handoff.engine.label} ${handoff.engine.version} reviewed-delivery handoff restored. ${continuation.summary}` };
        return { ...project, spec: mergedSpec, featureInbox: existing ? items.map((item) => item.id === target.id ? resumed : item) : [...items, resumed], journey };
      }
      let artifact;
      try { artifact = handoffArtifactPayload(handoff); } catch (cause) { result = { ok: false, message: cause instanceof Error ? cause.message : 'The handoff artifact is invalid.' }; return project; }
      const items = project.featureInbox || [];
      const existing = items.find((item) => item.slug && item.slug === handoff.feature.slug) || items.find((item) => item.title === handoff.feature.title && item.summary === handoff.feature.summary);
      const created = !existing;
      const base = existing || createFeatureInboxItem({ title: handoff.feature.title, summary: handoff.feature.summary, userStories: [], functionalRequirements: [], tasks: [] }, 'file', items.length, new Date().toISOString());
      const target = handoff.feature.slug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(handoff.feature.slug) ? { ...base, slug: handoff.feature.slug, scope: handoff.feature.scope || base.scope } : base;
      const issue = engineProjectionIssue(project, target, artifact.specKitProjection);
      if (issue) { result = { ok: false, message: `The handoff does not satisfy the selected engine contract: ${issue}` }; return project; }
      const field = handoff.artifact.personaId === 'product-manager' ? 'productOutcome' : handoff.artifact.personaId === 'business-analyst' ? 'businessAnalysis' : handoff.artifact.personaId === 'developer' ? 'developerArchitecture' : 'securityResearch';
      if (target[field]?.acceptedAt) { result = { ok: false, message: `This feature already has an accepted ${handoff.artifact.personaId} handoff. Studio did not overwrite it.` }; return project; }
      const architecture = handoff.continuation;
      if (architecture && ((target.specification?.content && target.specification.content !== architecture.specification.content) || (target.impactMap?.content && target.impactMap.content !== architecture.impactMap.content) || (target.architecturePlan?.content && target.architecturePlan.content !== architecture.architecturePlan.content))) {
        result = { ok: false, message: 'This workspace already contains different feature, impact, or architecture evidence. Studio did not overwrite it.' };
        return project;
      }
      const continuation = personaHandoffContinuation(handoff.artifact.personaId, artifact, architecture);
      const intake = personaHandoffIntake(handoff.artifact.personaId, artifact, project.spec.userStories.map((story) => story.id), project.spec.functionalRequirements.map((requirement) => requirement.id));
      const resumed = {
        ...target,
        // Retain any existing feature definition and attach the imported,
        // source-labelled definition as well. This prevents a matching title
        // from silently dropping the handoff's acceptance evidence.
        userStoryIds: [...new Set([...target.userStoryIds, ...intake.userStories.map((story) => story.id)])],
        requirementIds: [...new Set([...target.requirementIds, ...intake.functionalRequirements.map((requirement) => requirement.id)])],
        ...(artifact.specKitProjection.kind === 'spec' ? { specification: { path: artifact.specKitProjection.path, content: artifact.specKitProjection.content, acceptedAt: artifact.acceptedAt } } : {}),
        ...(architecture ? { specification: architecture.specification, impactMap: { content: architecture.impactMap.content, acceptedAt: architecture.impactMap.acceptedAt }, architecturePlan: { path: architecture.architecturePlan.path, content: architecture.architecturePlan.content, acceptedAt: architecture.architecturePlan.acceptedAt }, technicalRole: 'developer' as const } : {}),
        [field]: artifact,
      };
      const now = new Date().toISOString();
      const priorJourney = project.journey?.featureId === target.id ? project.journey : createFeatureJourney(now);
      const journey = { ...continueJourneyFromHandoff(priorJourney, continuation, featureJourneyStages.map((stage) => stage.id), now), featureId: target.id };
      result = { ok: true, message: `${handoff.engine.label} ${handoff.engine.version} handoff restored. ${continuation.summary}` };
      return {
        ...project,
        featureInbox: created ? [...items, resumed] : items.map((item) => item.id === target.id ? resumed : item),
        spec: { ...project.spec, userStories: [...project.spec.userStories, ...intake.userStories], functionalRequirements: [...project.spec.functionalRequirements, ...intake.functionalRequirements], lastUpdated: now },
        journey,
      };
    });
    return result;
  }, [updateActiveProject]);
  const attachFeatureReferenceImage = useCallback((featureId: string, image: import('../types/speckit').ReferenceImage) => updateActiveProject((project) => ({
    ...project,
    featureInbox: (project.featureInbox || []).map((item) => item.id === featureId
      ? { ...item, referenceImages: [...(item.referenceImages || []).filter((current) => current.url !== image.url), image].slice(-4) }
      : item),
  })), [updateActiveProject]);
  const saveWorkspaceBaseline = useCallback((workspaceBaseline?: WorkspaceBaselineEvidence) => updateActiveProject((project) => ({ ...project, workspaceBaseline })), [updateActiveProject]);
  const applyOutcomeRefineryContract = useCallback((featureId: string, outcomeRefinery: OutcomeRefineryRun) => updateActiveProject((project) => {
    const reopen = (journey: FeatureJourney | undefined) => journey ? reopenJourneyStage(journey, 4) : journey;
    const projectJourney = project.journey?.featureId === featureId ? reopen(project.journey) : project.journey;
    return {
    ...project,
    journey: projectJourney,
    featureInbox: (project.featureInbox || []).map((item) => {
      if (item.id !== featureId) return item;
      const current = item.sourceContent || '';
      const contract = outcomeRefinery.contractMarkdown || '';
      const withoutPriorContract = current.replace(/\n*# Outcome Refinery Contract[\s\S]*$/m, '').trim();
      // Keep accepted specification evidence immutable. The repaired source
      // brief is the authoritative input for the next explicitly reviewed run.
      return { ...item, journey: reopen(item.journey), outcomeRefinery, sourceContent: `${withoutPriorContract}\n\n${contract}`.trim() };
    }),
  }; }), [updateActiveProject]);

  const applyAiSpecData = useCallback((spec: FeatureSpec, plan?: ImplementationPlan, tasks?: TaskBreakdown) => {
    updateActiveProject((project) => ({ ...project, spec, plan: plan || project.plan, tasks: tasks || project.tasks }));
  }, [updateActiveProject]);

  const attachTruth = useCallback((report: TruthReport) => {
    const allowedCategories = new Set(['Frontend', 'Backend', 'Database', 'State', 'Styling', 'Testing', 'Infra/DevOps', 'Other']);
    updateActiveProject((project) => ({
      ...project,
      importedRepo: {
        repoUrl: report.repositoryPath,
        repoName: report.repositoryName,
        description: `Local repository evidence scan completed ${new Date(report.scannedAt).toLocaleString()}.`,
        primaryLanguage: report.technologies.find((item) => ['Python', 'Go', 'Rust', 'Java', '.NET', 'Ruby', 'PHP'].includes(item.name))?.name || report.technologies.find((item) => item.name === 'React' || item.name === 'Next.js') ? 'TypeScript/JavaScript' : 'Unknown / mixed stack',
        detectedTechStack: report.technologies.map((item, index) => ({
          id: `EVIDENCE-${index + 1}`,
          category: allowedCategories.has(item.category) ? item.category as NonNullable<SpecKitProject['importedRepo']>['detectedTechStack'][number]['category'] : 'Other',
          name: item.name,
          version: item.version,
          confidence: item.confidence === 'high' ? 'High' : 'Medium',
          fileEvidence: item.evidence,
          selectedForNewFeature: true,
        })),
        architectureSummary: `Evidence-backed local scan of ${report.files.length}${report.filesTruncated ? '+' : ''} files.`,
        keyDirectories: [...new Set(report.files.map((file) => file.split('/')[0]).filter((part) => part && !part.includes('.')))].slice(0, 12).map((part) => `/${part}`),
        suggestedNewFeatures: [],
        importedAt: report.scannedAt,
      },
      repositoryIdentity: {
        canonicalRemote: normalizeGitRemote(report.git.remotes.split('\n').find((line) => /\borigin\b.*\(fetch\)/.test(line))?.split(/\s+/)[1] || report.repositoryPath),
        lastScannedBranch: report.git.branch || undefined,
        lastScannedAt: report.scannedAt,
      },
    }));
  }, [updateActiveProject]);

  const replaceFromImport = useCallback((project: SpecKitProject) => {
    // A new imported project has a different ID from the workspace that opened
    // the dialog. Persist and select it atomically; updating the old active
    // project alone makes the UI fall back to that blank workspace on refresh.
    const imported = storageService.saveImportedProject(project);
    setActiveProject(imported);
    setProjects(storageService.getProjects());
    return imported;
  }, []);

  const mergeImportedFeature = useCallback((stories: UserStory[], data: ImportedFeatureData, personaRoute?: PersonaId) => {
    let importedFeatureId = '';
    const updated = updateActiveProject((project) => {
      const now = new Date().toISOString();
      const extraction: FeatureExtractionPackage = { ...data, userStories: stories };
      const importedFeature = createFeatureInboxItem(extraction, data.source || 'unknown', project.featureInbox?.length || 0, now);
      importedFeature.referenceImages = data.referenceImages || [];
      importedFeature.personaRoute = personaRoute;
      importedFeatureId = importedFeature.id;
      const featureInbox = [...(project.featureInbox || []), importedFeature];
      return {
        ...project,
        featureInbox,
        journey: project.journey ? { ...project.journey, featureId: importedFeature.id, updatedAt: now } : project.journey,
        spec: {
          ...project.spec,
          userStories: [...project.spec.userStories, ...stories],
          functionalRequirements: [...project.spec.functionalRequirements, ...(data.functionalRequirements || [])],
          lastUpdated: now,
        },
        tasks: {
          ...project.tasks,
          tasks: [...project.tasks.tasks, ...(data.tasks || []).map(createImportedTask)],
          lastUpdated: now,
        },
      };
    });
    // The dialog may close only after the durable aggregate contains the new
    // feature receipt. This protects against stale workspace selection and
    // makes a failed browser persistence operation visible to the caller.
    return Boolean(importedFeatureId && updated?.featureInbox?.some((feature) => feature.id === importedFeatureId));
  }, [updateActiveProject]);
  const startPersonaFeature = useCallback((personaId: PersonaId, title: string, summary: string) => {
    let created = false;
    const updated = updateActiveProject((project) => {
      const now = new Date().toISOString();
      const feature = createFeatureInboxItem({ title, summary, userStories: [], functionalRequirements: [], tasks: [] }, 'text', project.featureInbox?.length || 0, now);
      feature.personaRoute = personaId;
      created = true;
      const journey = project.journey || createFeatureJourney();
      return { ...project, featureInbox: [...(project.featureInbox || []), feature], journey: { ...journey, featureId: feature.id, updatedAt: now } };
    });
    return Boolean(created && updated);
  }, [updateActiveProject]);

  const startStoryDelivery = useCallback((storyInput: UserStory, requirementsInput: FunctionalRequirement[], source: FeatureImportSource, parentFeatureId?: string, referenceImages: ReferenceImage[] = []): StoryDeliveryStartResult | null => {
    let result: StoryDeliveryStartResult | null = null;
    const updated = updateActiveProject((project) => {
      const now = new Date().toISOString();
      const existingStory = project.spec.userStories.find((story) => story.id === storyInput.id);
      const isExistingSelection = source === 'repository' && Boolean(existingStory);
      const usedStoryIds = new Set(project.spec.userStories.map((story) => story.id));
      let storyId = storyInput.id || `US-${101 + project.spec.userStories.length}`;
      if (!isExistingSelection && usedStoryIds.has(storyId)) {
        let ordinal = 101 + project.spec.userStories.length;
        while (usedStoryIds.has(`US-${ordinal}`)) ordinal += 1;
        storyId = `US-${ordinal}`;
      }

      const duplicate = (project.featureInbox || []).find((item) => deliveryScope(item) === 'user-story' && item.primaryStoryId === storyId);
      if (duplicate) {
        result = { status: 'resumed', itemId: duplicate.id };
        return { ...project, journey: { ...(project.journey || { activeStage: 2, completedStages: [], startedAt: now, updatedAt: now }), featureId: duplicate.id, updatedAt: now } };
      }

      const usedRequirementIds = new Set(project.spec.functionalRequirements.map((requirement) => requirement.id));
      const requirementIdMap = new Map<string, string>();
      const requirements = requirementsInput.map((requirement, index) => {
        if (isExistingSelection && usedRequirementIds.has(requirement.id)) { requirementIdMap.set(requirement.id, requirement.id); return requirement; }
        let id = requirement.id || `FR-${101 + project.spec.functionalRequirements.length + index}`;
        if (usedRequirementIds.has(id)) {
          let ordinal = 101 + project.spec.functionalRequirements.length + index;
          while (usedRequirementIds.has(`FR-${ordinal}`)) ordinal += 1;
          id = `FR-${ordinal}`;
        }
        usedRequirementIds.add(id); requirementIdMap.set(requirement.id, id);
        return { ...requirement, id };
      });
      const story: UserStory = { ...storyInput, id: storyId, requirementIds: requirements.map((requirement) => requirementIdMap.get(requirement.id) || requirement.id) };
      const item = createStoryInboxItem(story, requirements, source, project.featureInbox?.length || 0, parentFeatureId, now, referenceImages);
      result = { status: 'created', itemId: item.id };
      const completedStages = project.journey?.completedStages.includes(1) ? [1] : [];
      const storyJourney: FeatureJourney = { featureId: item.id, activeStage: 2, completedStages, startedAt: now, updatedAt: now };
      item.journey = storyJourney;
      return {
        ...project,
        featureInbox: [...(project.featureInbox || []), item],
        journey: storyJourney,
        spec: {
          ...project.spec,
          userStories: isExistingSelection
            ? project.spec.userStories.map((candidate) => candidate.id === story.id ? story : candidate)
            : [...project.spec.userStories, story],
          functionalRequirements: [
            ...project.spec.functionalRequirements,
            ...requirements.filter((requirement) => !project.spec.functionalRequirements.some((existing) => existing.id === requirement.id)),
          ],
          lastUpdated: now,
        },
      };
    });
    return updated ? result : null;
  }, [updateActiveProject]);

  const saveLatestFeatureReview = useCallback((review: { specification?: { path?: string; content: string; acceptedAt?: string }; impactMap?: { content: string; acceptedAt?: string }; architecturePlan?: { path?: string; content: string; acceptedAt?: string }; deliveryPlan?: { path?: string; content: string; acceptedAt?: string; repositoryPath?: string; executionMode?: 'standard' | 'demo' }; finalVerification?: import('../types/speckit').FeatureFinalVerificationReceipt }) => {
    updateActiveProject((project) => {
      const items = project.featureInbox || [];
      const activeFeature = activeFeatureForProject(project);
      if (!activeFeature || !items.length) return project;
      return {
        ...project,
        featureInbox: items.map((item) => {
          if (item.id !== activeFeature.id) return item;
          if (!review.deliveryPlan || item.deliveryPlan?.content === review.deliveryPlan.content) return { ...item, ...review };
          const receiptRevision = reconcileDeliveryPlanReceipts(item.deliveryPlan?.content, review.deliveryPlan.content, item.implementationReceipts);
          return {
            ...item,
            ...review,
            implementationReceipts: receiptRevision.active,
            supersededImplementationReceipts: [
              ...(item.supersededImplementationReceipts || []),
              ...receiptRevision.superseded,
            ],
          };
        }),
      };
    });
  }, [updateActiveProject]);

  const saveFeatureImplementation = useCallback((featureId: string, receipt: FeatureImplementationReceipt) => {
    let saved = false;
    updateActiveProject((project) => {
      const updated = recordFeatureImplementationReceipt(project, featureId, receipt);
      saved = updated !== project;
      return updated;
    });
    return saved;
  }, [updateActiveProject]);

  const saveFeaturePullRequest = useCallback((featureId: string, pullRequest: DeliveryPullRequest) => {
    updateActiveProject((project) => ({
      ...project,
      featureInbox: (project.featureInbox || []).map((feature) => feature.id === featureId ? { ...feature, pullRequest } : feature),
    }));
  }, [updateActiveProject]);

  const updateFeatureIdentity = useCallback((featureId: string, identity: Partial<Pick<import('../types/speckit').FeatureInboxItem, 'featureKey' | 'slug' | 'branch' | 'worktreePath' | 'baselineCommit'>>) => {
    updateActiveProject((project) => ({ ...project, featureInbox: (project.featureInbox || []).map((feature) => feature.id === featureId ? { ...feature, ...identity } : feature) }));
  }, [updateActiveProject]);

  const restoreUnlinkedFeatureScope = useCallback(() => {
    let message = 'Studio could not find unlinked scope to restore.';
    updateActiveProject((project) => {
      const feature = activeFeatureForProject(project);
      if (!feature) { message = 'Select a delivery item before restoring its scope.'; return project; }
      const otherFeatures = (project.featureInbox || []).filter((item) => item.id !== feature.id);
      const claimedStoryIds = new Set(otherFeatures.flatMap((item) => item.userStoryIds));
      const claimedRequirementIds = new Set(otherFeatures.flatMap((item) => item.requirementIds));
      const availableStories = project.spec.userStories.filter((story) => !claimedStoryIds.has(story.id));
      const availableRequirements = project.spec.functionalRequirements.filter((requirement) => !claimedRequirementIds.has(requirement.id));
      const recoveredStories = !feature.userStoryIds.length && !availableStories.length && feature.specification?.content
        ? storiesFromCanonicalSpecification(feature.specification.content)
        : [];
      const recoveredRequirements = !feature.requirementIds.length && !availableRequirements.length && feature.specification?.content
        ? requirementsFromCanonicalSpecification(feature.specification.content)
        : [];
      const nextStoryIds = feature.userStoryIds.length
        ? feature.userStoryIds
        : (availableStories.length ? availableStories : recoveredStories).map((story) => story.id);
      const nextRequirementIds = feature.requirementIds.length
        ? feature.requirementIds
        : (availableRequirements.length ? availableRequirements : recoveredRequirements).map((requirement) => requirement.id);
      if (!nextStoryIds.length && !nextRequirementIds.length) { message = 'This handoff has no recoverable scoped records. Re-export it from the original Product Manager workspace with the current Studio version, then import it again.'; return project; }
      message = `Restored ${nextStoryIds.length} user ${nextStoryIds.length === 1 ? 'story' : 'stories'} and ${nextRequirementIds.length} requirement${nextRequirementIds.length === 1 ? '' : 's'} to this delivery item. Re-run quality checks to verify.`;
      return {
        ...project,
        spec: recoveredStories.length || recoveredRequirements.length ? {
          ...project.spec,
          userStories: recoveredStories.length ? [...project.spec.userStories.filter((story) => !recoveredStories.some((recovered) => recovered.id === story.id)), ...recoveredStories] : project.spec.userStories,
          functionalRequirements: recoveredRequirements.length ? [...project.spec.functionalRequirements.filter((requirement) => !recoveredRequirements.some((recovered) => recovered.id === requirement.id)), ...recoveredRequirements] : project.spec.functionalRequirements,
        } : project.spec,
        featureInbox: (project.featureInbox || []).map((item) => item.id === feature.id ? { ...item, userStoryIds: nextStoryIds, requirementIds: nextRequirementIds } : item),
      };
    });
    return message;
  }, [updateActiveProject]);

  const selectVersion = useCallback((version: string) => updateActiveProject((project) => ({ ...project, version })), [updateActiveProject]);
  const selectSddEngine = useCallback((sddEngine: SddEngineId) => updateActiveProject((project) => ({ ...project, sddEngine })), [updateActiveProject]);
  const restoreProjectSnapshot = useCallback((savedAt: string) => {
    const active = storageService.getActiveProject();
    const restored = storageService.restoreProjectBackup(active.id, savedAt);
    if (restored) refresh();
    return restored;
  }, [refresh]);

  return {
    projects, activeProject, selectProject, createProject, deleteProject, resetProjects,
    saveSpec, savePlan, saveTasks, saveConstitution, saveAudit, saveJourney, startJourneyFromPersonaHandoff, saveStackProfile, saveProcessCases, saveWorkflowFocus, saveOutcomeRefinery, saveProductOutcome, saveProductManagerDecision, saveDeveloperArchitecture, saveTechnicalRole, saveBusinessAnalysis, saveSecurityResearch, completePersonaWorkflow, returnToPersonaHandoff, attachFeatureReferenceImage, saveWorkspaceBaseline, applyOutcomeRefineryContract,
    applyAiSpecData, attachTruth, replaceFromImport, mergeImportedFeature, startPersonaFeature, startStoryDelivery, saveLatestFeatureReview, saveFeatureImplementation, saveFeaturePullRequest, updateFeatureIdentity, restoreUnlinkedFeatureScope, selectVersion, selectSddEngine, restoreProjectSnapshot, resumePersonaHandoff,
  };
}
