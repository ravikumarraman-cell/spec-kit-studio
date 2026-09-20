import { FeatureInboxItem, SpecKitProject, TaskItem } from '../types/speckit';
import { FeatureDeliveryTask } from './featureDeliveryTasks';

export type AgentTarget = 'copilot' | 'codex' | 'claude' | 'gemini' | 'cursor';
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
  const requirements = project.spec.functionalRequirements
    .filter((item) => feature.requirementIds.includes(item.id) && (task.requirementIds.length === 0 || task.requirementIds.includes(item.id)));
  const architecture = feature.architecturePlan?.content
    ? `\n## Accepted feature architecture\nSource: \`${feature.architecturePlan.path || 'plan.md'}\`\n${feature.architecturePlan.content}\n`
    : '';

  return `# ${target.toUpperCase()} implementation contract — ${task.id}

## Feature in focus
${feature.title}
${feature.summary}

## Objective
${task.title}

## Requirements this task delivers
${requirements.length
  ? requirements.map((item) => `- ${item.id}: ${item.title} — ${item.description}`).join('\n')
  : '- No task-specific requirement mapping was found. Read the feature specification and stop for clarification before widening scope.'}

## Delivery evidence
Source: \`${feature.deliveryPlan?.path || 'tasks.md'}\`
- This is ${task.id}, one task in the accepted delivery plan for ${feature.title}.
${evidence.length ? evidence.map((item) => `- ${item}`).join('\n') : '- Inspect relevant repository files before editing; do not assume framework conventions.'}
${architecture}
## Constitution
${project.constitution.rules.map((rule) => `- [${rule.strictness}] ${rule.ruleStatement}`).join('\n') || '- No rules defined; request them before security or data-impacting work.'}

## Definition of done
- Implement only ${task.id} for ${feature.title}; do not drift into shared workspace tasks.
- Update or add tests that prove the mapped requirements.
- Run the repository's relevant typecheck, test, and build commands when available.
- Report changed files, commands run, results, and unresolved assumptions.
- Do not invent APIs, dependencies, credentials, or schema behavior.
`;
}
