import { SpecKitProject } from '../types/speckit';
import { processDefinitions } from './processCases';

/** One resolver keeps workflow-specific copy and destinations out of generic setup screens. */
export function workflowBaselineContext(project: SpecKitProject) {
  const focus = project.workflowFocus || 'feature';
  if (focus === 'feature') return { label: 'Feature delivery', title: 'Stage 1 is ready to hand off', description: 'Your repository is grounded and the baseline is recorded. Describe the feature next.', action: 'Describe feature' };
  const definition = processDefinitions[focus];
  const activeCase = project.processCases?.filter((item) => item.kind === focus).at(-1);
  const step = definition.steps[activeCase?.currentStep || 0];
  return { label: definition.label, title: `${definition.label} is ready to begin`, description: activeCase ? `The repository baseline is recorded for “${activeCase.title}”. Next, ${step.title.toLowerCase()}.` : `The repository baseline is recorded. Create a case, then ${step.title.toLowerCase()}.`, action: activeCase ? step.title : `Create ${focus === 'bug' ? 'bug case' : 'assessment'}` };
}

export function activeWorkflowContext(project: SpecKitProject) {
  const focus = project.workflowFocus;
  if (!focus || focus === 'feature') return null;
  const definition = processDefinitions[focus];
  const activeCase = project.processCases?.filter((item) => item.kind === focus).at(-1);
  const step = definition.steps[activeCase?.currentStep || 0];
  return { label: definition.label, caseTitle: activeCase?.title, nextStep: step.title };
}
