import { FeatureInboxItem, SpecKitProject, TaskItem } from '../types/speckit';
import { FeatureDeliveryTask } from './featureDeliveryTasks';
import { resolveStackProfile } from './stackProfiles';
import { deliveryScope, primaryStoryForItem } from './deliveryItems';
import { AGENT_PROMPT_LIMITS, compactAgentPacket, conciseAgentReceipt, excerptForAgent } from './agentPromptBudget';

export type AgentTarget = 'copilot' | 'codex' | 'claude' | 'gemini' | 'cursor';

/**
 * Verification and review tasks need the feature boundary, but not a copy of
 * every planning artifact. Supplying those artifacts inline makes the handoff
 * slow, obscures the actual check being requested, and can cause a local agent
 * to spend its entire run re-reading planning prose. This classification is
 * deliberately based on the task contract rather than task numbers, so it
 * applies consistently to every imported feature plan.
 */
export function isFocusedVerificationTask(task: FeatureDeliveryTask): boolean {
  const contract = `${task.title}\n${task.detail || ''}`;
  return /\b(?:verify|verification|validate|validation|review|audit|regression|test(?:ing)?|quality check)\b/i.test(contract)
    && !/\b(?:implement|build|create|add|develop|refactor|migrate)\b/i.test(contract);
}

export function portableTaskPrompt(project: SpecKitProject, task: TaskItem, target: AgentTarget, evidence: string[] = []) {
  const requirement = project.spec.functionalRequirements.find((item) => item.id === task.mappedRequirementId);
  const requirementText = requirement ? `${requirement.id}: ${requirement.title}\n${excerptForAgent(requirement.description, AGENT_PROMPT_LIMITS.requirementDescription, 'the mapped requirement')}` : 'No mapped requirement; stop and request clarification.';
  const constitution = project.constitution.rules.map((rule) => `- [${rule.strictness}] ${excerptForAgent(rule.ruleStatement, AGENT_PROMPT_LIMITS.ruleStatement, 'the constitution')}`).join('\n');
  return compactAgentPacket(`# ${target.toUpperCase()} implementation contract — ${task.id}\n\n## Objective\n${task.title}\n\n${excerptForAgent(task.description, AGENT_PROMPT_LIMITS.taskDescription, 'the task record')}\n\n## Requirement\n${requirementText}\n\n## Repository evidence\n${evidence.length ? evidence.map((item) => `- ${item}`).join('\n') : '- Inspect the relevant files before editing; do not assume framework conventions.'}\n\n## Constitution\n${constitution || '- No rules defined; request them before work with security or data impact.'}\n\n## Definition of done\n- Implement only this task and its mapped requirement.\n- Update or add tests that prove the acceptance criteria.\n- Run the focused checks named by this task. Do not run workspace-wide checks unless the task explicitly requires them.\n- ${conciseAgentReceipt()}\n- Do not invent APIs, dependencies, credentials, or schema behavior.\n`);
}

/**
 * Builds a feature-scoped handoff from the accepted Spec-Kit artifacts.  This
 * prevents an unrelated shared-workspace task from silently becoming the
 * implementation prompt for the feature currently in focus.
 */
export function portableFeatureTaskPrompt(
  project: SpecKitProject,
  feature: FeatureInboxItem,
  task: FeatureDeliveryTask,
  target: AgentTarget,
  evidence: string[] = [],
) {
  const profile = resolveStackProfile(project);
  const focusedVerification = isFocusedVerificationTask(task);
  const demoMode = feature.deliveryPlan?.executionMode === 'demo';
  const story = deliveryScope(feature) === 'user-story' ? primaryStoryForItem(project, feature) : undefined;
  const requirements = project.spec.functionalRequirements
    .filter((item) => feature.requirementIds.includes(item.id) && (task.requirementIds.length === 0 || task.requirementIds.includes(item.id)));
  // The authoritative plan is already in the worktree. Serializing it into
  // every invocation wastes context and makes the task itself less visible.
  const architecture = feature.architecturePlan?.content
    ? `\n## Accepted feature architecture\nSource: \`${feature.architecturePlan.path || 'plan.md'}\`\nRead only the section needed for ${task.id} from the repository. Do not copy or re-plan the full architecture.\n`
    : '';
  const requirementSummary = requirements.length
    ? requirements.map((item) => focusedVerification
      ? `- ${item.id}: ${item.title}`
      : `- ${item.id}: ${item.title} — ${excerptForAgent(item.description, AGENT_PROMPT_LIMITS.requirementDescription, 'the feature specification')}`).join('\n')
    : '- No task-specific requirement mapping was found. Read the feature specification and stop for clarification before widening scope.';
  const refineryContract = feature.outcomeRefinery?.contractMarkdown?.trim();
  const hasVisualContract = Boolean(feature.referenceImages?.length || refineryContract || /visual acceptance contract/i.test(feature.sourceContent || ''));
  const visualContract = hasVisualContract ? `
## Binding visual and source contract
${refineryContract ? excerptForAgent(refineryContract, 6_000, 'the retained Outcome Refinery contract') : 'The accepted feature artifacts contain the visual contract. Read its relevant section before editing.'}

- Treat the reference hierarchy as acceptance criteria, not inspiration. Preserve category → subcategory/component → value relationships; never replace them with a raw list, generic cards, or proxy metrics.
- Map every visible field to an authoritative repository/API source. Render exactly \`No Source\` when the source or value is unavailable; never fabricate, reuse an unrelated signal, or infer a business value from an image.
- Reuse the host application’s existing design-system components, typography, spacing, and color tokens. Do not introduce a standalone visual language or hard-coded low-contrast status colors.
- Verify desktop and narrow/mobile behavior. Check semantic hierarchy, contrast, text scale, keyboard/accessibility behavior, and the reference layout before reporting completion.
` : '';

  const scopeContract = story ? `## User story in focus
${story.id}: ${story.title}
As a ${story.asA}, I want to ${story.iWantTo}, so that ${story.soThat}.

### Acceptance criteria
${story.acceptanceCriteria.map((criterion) => `- [ ] ${criterion}`).join('\n')}

Sibling stories and broad feature cleanup are out of scope. Stop and ask before changing behavior beyond this story.
` : `## Feature in focus
${feature.title}
${excerptForAgent(feature.summary, AGENT_PROMPT_LIMITS.featureSummary, 'the feature specification')}
`;

  return compactAgentPacket(`# ${target.toUpperCase()} implementation contract — ${task.id}

${scopeContract}

## Objective
${task.title}
${task.detail ? `\n${excerptForAgent(task.detail, AGENT_PROMPT_LIMITS.taskDescription, 'the accepted task list')}` : ''}

## Requirements this task delivers
${requirementSummary}

## Delivery evidence
Source: \`${feature.deliveryPlan?.path || 'tasks.md'}\`
- This is ${task.id}, one task in the accepted delivery plan for ${story ? story.id : feature.title}.
${evidence.length ? evidence.map((item) => `- ${item}`).join('\n') : '- Inspect relevant repository files before editing; do not assume framework conventions.'}
${architecture}
${visualContract}
## Constitution
${project.constitution.rules.map((rule) => `- [${rule.strictness}] ${excerptForAgent(rule.ruleStatement, AGENT_PROMPT_LIMITS.ruleStatement, 'the constitution')}`).join('\n') || '- No rules defined; request them before security or data-impacting work.'}

## Stack execution contract
${profile.label}: ${excerptForAgent(profile.guidance, AGENT_PROMPT_LIMITS.stackGuidance, 'the repository guidance')}
- ${demoMode ? 'Demo mode: never run lint. Use only the focused functional test named by this task.' : 'Use the focused command named in this task. Do not run every repository check by default.'}
- Never edit: ${profile.prohibitedPaths.join(', ')}.

## Definition of done
- ${focusedVerification ? `Verify only ${task.id} for ${story ? story.id : feature.title}; do not redesign, re-plan, or drift into shared workspace tasks.` : `Implement only ${task.id} for ${story ? story.id : feature.title}; do not drift into shared workspace tasks.`}
- ${focusedVerification ? 'Run only the focused repository checks that prove this task, then report any failing command or missing evidence.' : 'Update or add tests that prove the mapped requirements.'}
- ${hasVisualContract ? 'For this visual contract, add or update focused source-mapping and semantic hierarchy checks plus desktop and narrow-viewport visual evidence. A generic rendering test is insufficient.' : 'Keep verification focused on the approved task.'}
- ${demoMode ? 'Demo-mode override: do not run lint, even if a task artifact or repository default mentions it.' : focusedVerification ? 'Do not make unrelated application changes while verifying.' : 'Run the focused checks named by this task. Do not run workspace-wide lint, typecheck, test, or build unless the task explicitly requires it.'}
- Only after implementation and relevant verification pass, update exactly this
  task's checklist entry in ${feature.deliveryPlan?.path || 'tasks.md'} from
  [ ] to [x]. Never mark another task complete or alter task scope.
- ${conciseAgentReceipt()}
- Do not invent APIs, dependencies, credentials, or schema behavior.
`);
}
