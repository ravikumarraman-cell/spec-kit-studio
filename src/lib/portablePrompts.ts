import { FeatureInboxItem, SpecKitProject, TaskItem } from '../types/speckit';
import { FeatureDeliveryTask } from './featureDeliveryTasks';
import { resolveStackProfile } from './stackProfiles';

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
  return `# ${target.toUpperCase()} implementation contract — ${task.id}\n\n## Objective\n${task.title}\n\n${task.description}\n\n## Requirement\n${requirement ? `${requirement.id}: ${requirement.title}\n${requirement.description}` : 'No mapped requirement; stop and request clarification.'}\n\n## Repository evidence\n${evidence.length ? evidence.map((item) => `- ${item}`).join('\n') : '- Inspect the relevant files before editing; do not assume framework conventions.'}\n\n## Constitution\n${project.constitution.rules.map((rule) => `- [${rule.strictness}] ${rule.ruleStatement}`).join('\n') || '- No rules defined; request them before work with security or data impact.'}\n\n## Definition of done\n- Implement only this task and its mapped requirement.\n- Update or add tests that prove the acceptance criteria.\n- Run the repository’s typecheck, test, and build commands when available.\n- Report changed files, commands run, results, and unresolved assumptions.\n- Do not invent APIs, dependencies, credentials, or schema behavior.\n`;
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
  const requirements = project.spec.functionalRequirements
    .filter((item) => feature.requirementIds.includes(item.id) && (task.requirementIds.length === 0 || task.requirementIds.includes(item.id)));
  const architecture = feature.architecturePlan?.content
    ? focusedVerification
      ? `\n## Accepted feature architecture\nSource: \`${feature.architecturePlan.path || 'plan.md'}\`\nRead only the sections relevant to this verification task from the repository. Do not copy or re-plan the full architecture.\n`
      : `\n## Accepted feature architecture\nSource: \`${feature.architecturePlan.path || 'plan.md'}\`\n${feature.architecturePlan.content}\n`
    : '';
  const requirementSummary = requirements.length
    ? requirements.map((item) => focusedVerification
      ? `- ${item.id}: ${item.title}`
      : `- ${item.id}: ${item.title} — ${item.description}`).join('\n')
    : '- No task-specific requirement mapping was found. Read the feature specification and stop for clarification before widening scope.';

  return `# ${target.toUpperCase()} implementation contract — ${task.id}

## Feature in focus
${feature.title}
${feature.summary}

## Objective
${task.title}

## Requirements this task delivers
${requirementSummary}

## Delivery evidence
Source: \`${feature.deliveryPlan?.path || 'tasks.md'}\`
- This is ${task.id}, one task in the accepted delivery plan for ${feature.title}.
${evidence.length ? evidence.map((item) => `- ${item}`).join('\n') : '- Inspect relevant repository files before editing; do not assume framework conventions.'}
${architecture}
## Constitution
${project.constitution.rules.map((rule) => `- [${rule.strictness}] ${rule.ruleStatement}`).join('\n') || '- No rules defined; request them before security or data-impacting work.'}

## Stack execution contract
${profile.label}: ${profile.guidance}
- Run: ${profile.testCommands.join('; ') || 'the repository-declared checks'}.
- Never edit: ${profile.prohibitedPaths.join(', ')}.

## Definition of done
- ${focusedVerification ? `Verify only ${task.id} for ${feature.title}; do not redesign, re-plan, or drift into shared workspace tasks.` : `Implement only ${task.id} for ${feature.title}; do not drift into shared workspace tasks.`}
- ${focusedVerification ? 'Run only the focused repository checks that prove this task, then report any failing command or missing evidence.' : 'Update or add tests that prove the mapped requirements.'}
- ${focusedVerification ? 'Do not make unrelated application changes while verifying.' : "Run the repository's relevant typecheck, test, and build commands when available."}
- Only after implementation and relevant verification pass, update exactly this
  task's checklist entry in ${feature.deliveryPlan?.path || 'tasks.md'} from
  [ ] to [x]. Never mark another task complete or alter task scope.
- Report changed files, commands run, results, and unresolved assumptions.
- Do not invent APIs, dependencies, credentials, or schema behavior.
`;
}
