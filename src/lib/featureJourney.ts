import { FeatureJourney, SpecKitProject, ViewTab } from '../types/speckit';
import { isFeatureArtifactScoped } from './featureArtifactScope';
import { auditPassesQualityGate } from './auditGate';
import { parseFeatureDeliveryTasks, visualDeliveryPlanIssue } from './featureDeliveryTasks';
import { activeDeliveryItemForProject, deliveryScope, primaryStoryForItem, requirementsForDeliveryItem, validateDeliveryItem } from './deliveryItems';
import { validateSpecKitArtifacts } from './specKitCompliance';

/**
 * The single source of truth for Studio's guided feature workflow.
 *
 * UI components deliberately consume this model instead of owning their own
 * copies of stage order, destinations, or completion rules. That keeps the
 * journey portable: a future workflow can provide another definition without
 * changing the sidebar, handoff banner, or progress view.
 */
export interface FeatureJourneyStage {
  id: number;
  title: string;
  shortLabel: string;
  destination: ViewTab;
  outcome: string;
  evidence: string;
  engineStep: string;
  action: string;
  handoffTitle: string;
  handoffGuidance: string;
  ready: (project: SpecKitProject) => boolean;
  readyHint: string;
}

/** Controls delivery-plan granularity without changing review or evidence rules. */
export type DeliveryPlanMode = 'detailed' | 'compact';
/**
 * Resolve feature context by durable identity. The last inbox item is only a
 * legacy migration fallback; new work must store journey.featureId explicitly.
 */
export function activeFeatureForProject(project: SpecKitProject) {
  return activeDeliveryItemForProject(project);
}
function latestFeature(project: SpecKitProject) { return activeFeatureForProject(project); }
function hasImportedFeatureDescription(project: SpecKitProject) {
  const feature = latestFeature(project);
  if (!feature?.id || !feature.userStoryIds.length || !feature.requirementIds.length || validateDeliveryItem(project, feature).length) return false;
  const storyIds = new Set(project.spec.userStories.map((story) => story.id));
  const requirementIds = new Set(project.spec.functionalRequirements.map((requirement) => requirement.id));
  const storyReady = deliveryScope(feature) === 'user-story'
    ? Boolean(primaryStoryForItem(project, feature)?.acceptanceCriteria.length)
    : feature.userStoryIds.every((id) => storyIds.has(id));
  const officialStorySpecReady = deliveryScope(feature) !== 'user-story' || Boolean(
    feature.specification?.acceptedAt
    && feature.specification.path
    && validateSpecKitArtifacts(feature, [{ ...feature.specification, path: feature.specification.path, kind: 'spec' }], ['spec']).length === 0,
  );
  return storyReady
    && feature.requirementIds.every((id) => requirementIds.has(id))
    && officialStorySpecReady;
}
/**
 * A reference image is a product requirement when an imported feature carries
 * one.  We deliberately do not try to OCR or invent data semantics from an
 * image; instead, Studio requires a written, reviewable contract that maps
 * each visual region to an authoritative source (or to the explicit
 * `No Source` state).  That makes visual fidelity testable and portable
 * across connectors and coding agents.
 */
export function featureHasVisualReference(project: SpecKitProject): boolean {
  const feature = latestFeature(project);
  if (!feature) return false;
  const story = deliveryScope(feature) === 'user-story' ? primaryStoryForItem(project, feature) : undefined;
  return Boolean(feature.referenceImages?.length || story?.referenceImages?.length);
}

export function hasVisualAcceptanceContract(content = ''): boolean {
  const normalized = content.toLowerCase();
  return /visual\s+acceptance\s+contract/.test(normalized)
    && /(source|data)\s+(mapping|map)/.test(normalized)
    && /no\s+source/.test(normalized)
    && /(screenshot|visual\s+(regression|verification)|reference\s+image)/.test(normalized)
    && /(hierarchy|grouping|category|component)/.test(normalized)
    && /(narrow|mobile|responsive)/.test(normalized)
    && /(contrast|accessib|theme|design.system|token)/.test(normalized);
}

function visualAcceptanceContract(project: SpecKitProject, artifact: 'plan' | 'tasks' | 'implementation'): string {
  if (!featureHasVisualReference(project)) return '';
  const feature = latestFeature(project)!;
  const story = deliveryScope(feature) === 'user-story' ? primaryStoryForItem(project, feature) : undefined;
  const images = [...(feature.referenceImages || []), ...(story?.referenceImages || [])]
    .filter((image, index, all) => all.findIndex((candidate) => candidate.url === image.url) === index);
  const references = images.map((image) => `- ${image.alt}: ${image.url}`).join('\n');
  const artifactRequirement = artifact === 'plan'
    ? 'Write a `## Visual Acceptance Contract` section in plan.md.'
    : artifact === 'tasks'
      ? 'Write a `## Visual Acceptance Contract` section in tasks.md and include a dedicated visual-verification task that names the reference image, the required layout regions, source mapping/`No Source` behavior, and screenshot/viewport evidence.'
      : 'Implement the approved visual contract exactly; do not replace it with a generic dashboard, a raw data list, or a new visual language.';
  return `\n\n## Binding visual acceptance contract — required\nThis feature includes visual reference material. It is a binding acceptance target for information hierarchy, layout regions, density, component composition, responsive behavior, and existing product theme usage—not optional inspiration. Do not invent business values from an image. For every visible label, count, status, owner, timestamp, component, and action: map it to an authoritative existing repository/API source. When a source or value is absent, render exactly \`No Source\`; never fabricate a value, silently substitute an unrelated field, or flatten a structured data hierarchy into a raw list.\n\n${artifactRequirement}\nThe contract must enumerate: (1) ordered visual regions and their required widgets, (2) a source/data mapping for every displayed field, (3) explicit \`No Source\` behavior, (4) existing design-system components/tokens to reuse, (5) desktop and narrow-viewport behavior, and (6) visual verification against the supplied reference. The source map must preserve hierarchies the reference communicates (for example category → component/service → count) rather than only category totals.\n\nReference material:\n${references}`;
}

/** Keep the authoritative visual section, not the entire imported ticket, in
 * an Engine packet. This retains precise source mappings while preserving the
 * connector's bounded-prompt behavior. */
function bindingSourceContract(sourceContent?: string): string {
  const source = String(sourceContent || '');
  const sections = [...source.matchAll(/(?:^|\n)##\s+(?:Authoritative source-backed implementation contract|Mandatory visual acceptance contract|Outcome Refinery Contract)[\s\S]*?(?=\n##\s+|$)/gi)]
    .map((match) => match[0].trim())
    .filter(Boolean);
  return sections.length ? sections.join('\n\n').slice(0, 12_000) : '';
}

function featureBrief(project: SpecKitProject) {
  const feature = latestFeature(project);
  if (!feature) return 'No imported feature is selected; stop and ask the reviewer to select one.';
  const imageEvidence = (images: Array<{ alt: string; url: string }> = []) => images.length
    ? `\nREFERENCE IMAGES (binding visual acceptance material; inspect locally when accessible, preserve the shown layout and hierarchy, and use \`No Source\` for any data without an authoritative source):\n${images.map((image) => `- ${image.alt}: ${image.url}`).join('\n')}`
    : '';
  if (deliveryScope(feature) === 'user-story') {
    const story = primaryStoryForItem(project, feature);
    const requirements = requirementsForDeliveryItem(project, feature).map((requirement) => `${requirement.id}: ${requirement.title}`).join('; ');
    const images = [...(feature.referenceImages || []), ...(story?.referenceImages || [])].filter((image, index, all) => all.findIndex((candidate) => candidate.url === image.url) === index);
    return `USER STORY IN FOCUS: ${story?.id || feature.primaryStoryId} — ${story?.title || feature.title}\nAS A: ${story?.asA || 'unresolved'}\nI WANT TO: ${story?.iWantTo || 'unresolved'}\nSO THAT: ${story?.soThat || 'unresolved'}\nACCEPTANCE CRITERIA:\n${story?.acceptanceCriteria.map((criterion) => `- ${criterion}`).join('\n') || '- none recorded'}\nSCOPED REQUIREMENTS: ${requirements || 'none recorded'}\nSCOPE BOUNDARY: Implement only this user story. Sibling stories and broad feature redesign are out of scope.${imageEvidence(images)}`;
  }
  const stories = project.spec.userStories.filter((story) => feature.userStoryIds.includes(story.id)).map((story) => `${story.id}: ${story.title}`).join('; ');
  const requirements = project.spec.functionalRequirements.filter((requirement) => feature.requirementIds.includes(requirement.id)).map((requirement) => `${requirement.id}: ${requirement.title}`).join('; ');
  const sourceContract = bindingSourceContract(feature.sourceContent);
  return `FEATURE IN FOCUS: ${feature.title}\nFEATURE SUMMARY: ${feature.summary}\nUSER STORIES: ${stories || 'none recorded'}\nFUNCTIONAL REQUIREMENTS: ${requirements || 'none recorded'}${sourceContract ? `\n\nSOURCE-BACKED VISUAL CONTRACT (authoritative):\n${sourceContract}` : ''}${imageEvidence(feature.referenceImages)}`;
}
function hasAcceptedImpactMap(project: SpecKitProject) { return Boolean(latestFeature(project)?.impactMap?.acceptedAt); }
function hasAcceptedFeaturePlan(project: SpecKitProject) {
  const feature = latestFeature(project); const plan = feature?.architecturePlan;
  return Boolean(plan?.acceptedAt && plan.path && isFeatureArtifactScoped(plan.content, feature, plan.path)
    && (!featureHasVisualReference(project) || hasVisualAcceptanceContract(plan.content))
    && (deliveryScope(feature!) !== 'user-story' || validateSpecKitArtifacts(feature!, [{ ...plan, path: plan.path, kind: 'plan' }], ['plan']).length === 0));
}
function hasAcceptedDeliveryPlan(project: SpecKitProject) {
  const feature = latestFeature(project); const plan = feature?.deliveryPlan;
  const tasks = parseFeatureDeliveryTasks(plan?.content);
  return Boolean(plan?.acceptedAt && plan.path && isFeatureArtifactScoped(plan.content, feature, plan.path) && tasks.length > 0
    && (!featureHasVisualReference(project) || (hasVisualAcceptanceContract(plan.content) && !visualDeliveryPlanIssue(plan.content)))
    && (deliveryScope(feature!) !== 'user-story' || validateSpecKitArtifacts(feature!, [{ ...plan, path: plan.path, kind: 'tasks' }], ['tasks']).length === 0));
}
function hasFeatureScopedDeliveryTasks(project: SpecKitProject) {
  const feature = latestFeature(project);
  const plan = feature?.deliveryPlan;
  return Boolean(plan?.path && isFeatureArtifactScoped(plan.content, feature, plan.path) && parseFeatureDeliveryTasks(plan.content).length > 0);
}
function allFeatureTasksReviewed(project: SpecKitProject) {
  const feature = latestFeature(project);
  // Workspace-wide tasks are context, never completion evidence for a feature
  // Journey. Without a retained feature identity there is nothing safe to hand off.
  if (!feature) return false;
  const tasks = hasFeatureScopedDeliveryTasks(project) ? parseFeatureDeliveryTasks(feature?.deliveryPlan?.content) : [];
  if (!tasks.length) return false;
  const reviewed = new Set(feature?.implementationReceipts?.map((receipt) => receipt.taskId) || []);
  // Completion requires both signals: the reviewed plan checklist proves the
  // ordered task was closed, and the receipt proves a human reviewed the
  // task-scoped changed-file and verification evidence. Legacy Stage 7 flags
  // are historical only; they cannot satisfy a current feature handoff.
  return tasks.every((task) => task.done && reviewed.has(task.id));
}

export const featureJourneyStages: readonly FeatureJourneyStage[] = [
  { id: 1, title: 'Connect safely', shortLabel: 'Connect safely', destination: 'workspace', outcome: 'Establish a reviewable repository baseline.', evidence: 'Repository path, Git state, test commands, Spec-Kit status, and local-agent readiness.', engineStep: 'Read-only repository grounding', action: 'Connect and scan repository', handoffTitle: 'Connected Workspace', handoffGuidance: 'Scan the repository and establish a baseline before beginning feature work.', ready: (project) => Boolean(project.importedRepo?.repoUrl), readyHint: 'Scan the connected repository first.' },
  { id: 2, title: 'Describe the feature', shortLabel: 'Describe feature', destination: 'spec', outcome: 'Agree on the user outcome and compatibility boundaries.', evidence: 'Feature brief, source ticket/PRD, success measure, and “must not break” constraints.', engineStep: 'speckit.specify', action: 'Describe feature with Engine', handoffTitle: 'Feature description ready for review', handoffGuidance: 'Save the feature spec, then confirm the user stories and requirements capture the intended outcome and compatibility boundaries.', ready: hasImportedFeatureDescription, readyHint: 'Import one feature and confirm its stories and requirements. Story journeys also require a reviewed official spec.md from speckit.specify.' },
  { id: 3, title: 'Ground the impact map', shortLabel: 'Ground impact', destination: 'constitution', outcome: 'Know the owning code, neighbours, tests, contracts, and guardrails before design.', evidence: 'Scanned technology evidence, project constitution, key directories, and referenced code paths.', engineStep: 'Repository-evidence review + speckit.constitution when governance changes', action: 'Run Codex to prepare impact map', handoffTitle: 'Impact and guardrails ready for review', handoffGuidance: 'Accept the read-only impact map and confirm the applicable rules before approving the stage.', ready: (project) => Boolean(latestFeature(project)) && Boolean(project.journey?.completedStages.includes(1)) && project.constitution.rules.length > 0 && hasAcceptedImpactMap(project), readyHint: 'Import a feature, then run and accept its read-only impact map and confirm the applicable constitution rules.' },
  { id: 4, title: 'Design safely', shortLabel: 'Design safely', destination: 'plan', outcome: 'Approve a compatible technical plan.', evidence: 'Components, API contracts, schema changes, ADRs, test approach, and rollback considerations.', engineStep: 'speckit.plan + speckit.checklist', action: 'Run Codex to prepare architecture plan', handoffTitle: 'Architecture plan ready for review', handoffGuidance: 'Accept the feature-scoped plan, then verify its contracts, tests, risks, and rollback considerations before approving the design.', ready: (project) => hasAcceptedFeaturePlan(project), readyHint: 'Run, review, and accept a feature-scoped architecture plan before approval.' },
  { id: 5, title: 'Make delivery actionable', shortLabel: 'Plan delivery', destination: 'tasks', outcome: 'Approve a dependency-ordered, traceable delivery plan.', evidence: 'Tasks, requirement mappings, dependencies, phases, and test tasks.', engineStep: 'speckit.tasks + speckit.analyze', action: 'Run Codex to prepare delivery plan', handoffTitle: 'Delivery plan ready for review', handoffGuidance: 'Accept the feature-scoped task breakdown, then verify its mappings and dependency order before approving delivery planning.', ready: (project) => hasAcceptedDeliveryPlan(project), readyHint: 'Run, review, and accept feature-scoped delivery tasks before approval.' },
  { id: 6, title: 'Pass the quality gate', shortLabel: 'Quality gate', destination: 'audit', outcome: 'Resolve specification gaps before code changes begin.', evidence: 'Cross-artifact consistency report, unresolved ambiguities, and reviewer decisions.', engineStep: 'Studio Spec Quality Audit', action: 'Open Spec Quality Audit', handoffTitle: 'Quality-gate results ready for review', handoffGuidance: 'Resolve or explicitly document every blocking finding. The Journey will show when the quality threshold is met.', ready: (project) => { const item = latestFeature(project); return Boolean(item) && auditPassesQualityGate(deliveryScope(item!) === 'user-story' ? item!.qualityAudit : item!.qualityAudit || project.audit); }, readyHint: 'Select a delivery item, then run its audit and resolve the blocking gaps.' },
  { id: 7, title: 'Implement deliberately', shortLabel: 'Implement', destination: 'prompt', outcome: 'Choose and execute one approved task or phase at a time.', evidence: 'Task-scoped agent prompt, changed files, command output, and focused test results.', engineStep: 'Task-scoped speckit.implement', action: 'Choose an implementation task', handoffTitle: 'Implementation work is ready to verify', handoffGuidance: 'Choose each task, review its scoped result, and retain a verified receipt for every task before approving implementation.', ready: allFeatureTasksReviewed, readyHint: 'Complete and retain a reviewed receipt for every task in the accepted feature delivery plan before approving this stage.' },
  { id: 8, title: 'Verify and hand off', shortLabel: 'Verify & hand off', destination: 'export', outcome: 'Run deterministic verification, then retain a durable handoff record.', evidence: 'Git diff, declared verification results, task receipts, and exported Spec-Kit artifacts.', engineStep: 'Deterministic repository verification', action: 'Run handoff verification', handoffTitle: 'Handoff package ready for review', handoffGuidance: 'Review the deterministic verification and final change set, then export the approved artifacts. Ask Codex for reconciliation only when a finding needs judgment.', ready: allFeatureTasksReviewed, readyHint: 'Complete and retain review evidence for the approved feature tasks before final verification.' },
];

export function createFeatureJourney(now = new Date().toISOString()): FeatureJourney {
  return { activeStage: featureJourneyStages[0].id, completedStages: [], startedAt: now, updatedAt: now };
}

export function getJourneyStage(id: number): FeatureJourneyStage {
  return featureJourneyStages.find((stage) => stage.id === id) || featureJourneyStages[0];
}

/** Returns a real successor only; the final stage intentionally has none. */
export function nextFeatureJourneyStage(id: number): FeatureJourneyStage | undefined {
  return featureJourneyStages.find((stage) => stage.id === id + 1);
}

export function getJourneyStageForTab(tab: ViewTab): FeatureJourneyStage | undefined {
  return featureJourneyStages.find((stage) => stage.destination === tab);
}

export function getProjectJourney(project: SpecKitProject): FeatureJourney {
  return project.journey || createFeatureJourney();
}

export function approveJourneyStage(journey: FeatureJourney, stageId: number, now = new Date().toISOString()): FeatureJourney {
  const completedStages = [...new Set([...journey.completedStages, stageId])].sort((left, right) => left - right);
  const nextStage = featureJourneyStages.find((stage) => stage.id === stageId + 1);
  return { ...journey, completedStages, activeStage: nextStage?.id || stageId, updatedAt: now };
}

/**
 * Shared sequential-workflow revision rule: keep evidence, but invalidate
 * approvals from the edited stage onward so later conclusions are re-reviewed.
 */
export function reopenJourneyStage(journey: FeatureJourney, stageId: number, now = new Date().toISOString()): FeatureJourney {
  const safeStage = getJourneyStage(stageId).id;
  return { ...journey, activeStage: safeStage, completedStages: journey.completedStages.filter((completed) => completed < safeStage), updatedAt: now };
}

export function engineInstructionForStage(stageId: number, project: SpecKitProject, deliveryPlanMode: DeliveryPlanMode = 'detailed'): string | null {
  const nextTask = project.tasks.tasks.find((task) => task.status !== 'done');
  const feature = latestFeature(project);
  const artifactRoot = feature ? `specs/${feature.slug}` : 'specs/<numbered-feature-name>';
  const artifactCompletionProtocol = (artifact: string) => `\n\nArtifact completion contract (required): use the installed Spec-Kit workflow when it is available. If a slash command, skill, or integration command is unavailable, do not stop and do not leave the official template unchanged: author the required official ${artifact} directly from the feature brief and repository evidence. Before returning, read the actual file, replace every official template marker (including [FEATURE NAME], [###-feature-name], [Brief Title], [ACTION REQUIRED], and [NEEDS CLARIFICATION: ...]) with feature-specific content, and verify that no marker remains. The workflow is complete only when a human can review a completed artifact.`;
  // Final prose is never proof that an agent wrote a file. Keep the physical
  // proof at the tail: the connector retains that portion of a large packet.
  const artifactWriteProof = (artifact: string) => `\n\n## Studio physical artifact proof — required\nThe only successful outcome is a non-empty file at \`${artifact}\` in the current workspace. If a Spec-Kit command reports missing prerequisites or cannot run, do not spend time repairing the toolchain and do not merely describe a proposed file: directly write the completed artifact at that exact path. Before your final response, run \`test -s '${artifact}'\` and read the file back. Do not claim that the artifact was created unless that command succeeds. Do not write application code.`;
  // The connector preserves the tail of an oversized packet. Keep the compact
  // invariant there so a large feature brief can never silently remove it.
  const compactDeliveryContract = deliveryPlanMode === 'compact'
    ? `\n\n## Studio bounded delivery contract — non-negotiable\nReplace this feature's existing feature-scoped tasks.md only with the selected bounded task count (3–12 individual T001-style tasks). Keep every task within the approved feature scope, include implementation and focused verification, and do not run lint or implement application code while planning.`
    : '';
  const deliveryPlanExecution = deliveryPlanMode === 'compact'
    ? `BOUNDED CODEX MODE: Create exactly the selected number of individual T001-style tasks—no more and no fewer. First inspect the repository and the approved feature artifacts. Use the installed Spec-Kit tasks workflow only when its prerequisites exist; otherwise directly author the completed official artifact. Do not invoke an unbounded task-generation or analyze command after writing the bounded artifact. Studio will reject the run unless the final file contains exactly the requested task count.`
    : `First inspect whether ${artifactRoot}/spec.md and ${artifactRoot}/plan.md exist. If both exist, invoke the installed Spec-Kit tasks workflow for the exact feature below; invoke the optional read-only analyze workflow only after the completed task artifact has been written. If either prerequisite is missing, skip those commands and directly author the completed delivery artifact from the approved feature brief and plan context.`;
  const instructions: Partial<Record<number, string>> = {
    ...(feature && deliveryScope(feature) === 'user-story' ? {
      2: `Invoke the installed Spec-Kit specify workflow for exactly the single user story below. Use the integration's official command syntax (for example /speckit-specify in GitHub Copilot skills mode or /speckit.specify where slash-command syntax applies). Treat this story as one independently deliverable Spec-Kit feature, not as a partial multi-story specification. Create the canonical numbered branch and specs/NNN-short-name/spec.md using the installed official template. Include exactly one User Story 1, its independent test, Given/When/Then acceptance scenarios, scoped functional requirements, measurable success criteria, edge cases, and assumptions. Do not include sibling stories, technical implementation details, plan.md, tasks.md, or application code.\n\n${featureBrief(project)}${artifactCompletionProtocol(`${artifactRoot}/spec.md`)}${artifactWriteProof(`${artifactRoot}/spec.md`)}`,
    } : {}),
    3: `Feature Journey stage 3: inspect ${project.name} read-only and produce an evidence-backed impact map. Identify owning code paths, neighboring implementation, relevant tests, APIs, schemas, deployment workflows, and applicable constitution rules. Do not change files.`,
    4: `Invoke the installed Spec-Kit plan workflow for the exact feature below, using the integration's official command syntax. Then invoke the official checklist workflow when requirements-quality review is appropriate.\n\n${featureBrief(project)}\n\nCreate or repair the official ${artifactRoot}/plan.md and its applicable research.md, data-model.md, contracts/, and quickstart.md design artifacts from the installed templates. If an existing plan is incomplete, repair that exact feature-scoped file rather than leaving it unchanged or creating a second plan. Its title and summary must name the feature in focus, and every proposed component, API, schema, test, risk, and rollback decision must trace to its requirements. Do not use or overwrite a workspace-wide .specify/studio/plan.md. Do not generate tasks or application code.\n\nRequired plan structure (non-negotiable): retain these exact top-level headings in the completed plan: \`# Implementation Plan:\`, \`## Summary\`, \`## Technical Context\`, \`## Constitution Check\`, and \`## Project Structure\`. Fill each with feature-specific content; a human-review gate or a visual contract supplements these sections and never replaces them.\n\nCompletion check (required): before returning, read the generated plan and replace every template marker with feature-specific content.${visualAcceptanceContract(project, 'plan')}${artifactCompletionProtocol(`${artifactRoot}/plan.md`)}${artifactWriteProof(`${artifactRoot}/plan.md`)}`,
    5: `${deliveryPlanExecution}\n\n${featureBrief(project)}\n\nCreate the official ${artifactRoot}/tasks.md. Its title must name the feature in focus; every implementation task must carry the [US1] label for a story-scoped journey, use T001-style IDs, include exact file paths, and include implementation plus verification work. Do not use or overwrite a workspace-wide .specify/studio/tasks.md. Do not implement code; stop for human review.${visualAcceptanceContract(project, 'tasks')}${artifactCompletionProtocol(`${artifactRoot}/tasks.md`)}${compactDeliveryContract}${artifactWriteProof(`${artifactRoot}/tasks.md`)}`,
    7: `Feature Journey stage 7: use the integration-appropriate Spec-Kit implement workflow for exactly this approved task in ${project.name}: ${nextTask?.id || 'the task selected in Studio'} — ${nextTask?.title || 'selected task'}. Respect checklist review state and task boundaries. Run focused checks, summarize changed files and results, then stop.${visualAcceptanceContract(project, 'implementation')}`,
  };
  return instructions[stageId] || null;
}

/**
 * Planning produces reviewable Spec-Kit artifacts in the connected checkout.
 * Only implementation and final convergence operate on feature code, so only
 * those stages may require the feature's registered worktree and branch.
 */
export function stageRequiresFeatureWorktree(stageId: number): boolean {
  return stageId >= 7;
}

/** Keep planning bound to the connected checkout and implementation bound to
 * the isolated feature worktree when one has been registered. */
export function repositoryPathForEngineStage(stageId: number, connectedRepositoryPath?: string, featureWorktreePath?: string): string | undefined {
  // When a feature already has a worktree, replacement delivery plans belong
  // there too. Otherwise an old same-path tasks.md in that worktree can
  // overwrite the newer reviewed plan created in the main checkout.
  if (stageId === 5 && featureWorktreePath) return featureWorktreePath;
  return stageRequiresFeatureWorktree(stageId)
    ? featureWorktreePath || connectedRepositoryPath
    : connectedRepositoryPath;
}

/** Feature-identity preflight enforces the expected branch/worktree. That
 * identity is intentionally absent before implementation is allowed. */
export function featureIdForEnginePreflight(stageId: number, featureId?: string): string | undefined {
  return stageRequiresFeatureWorktree(stageId) ? featureId : undefined;
}
