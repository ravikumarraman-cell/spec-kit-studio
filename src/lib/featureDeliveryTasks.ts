/**
 * A portable view of an official Spec-Kit delivery task. It deliberately does
 * not depend on Studio's shared task-board model: feature artifacts are
 * evidence in their own right.
 */
export interface FeatureDeliveryTask {
  id: string;
  requirementIds: string[];
  title: string;
  done: boolean;
  detail?: string;
}

export type FeatureDeliveryCompletionSource = 'reviewed-receipt' | 'tasks-md' | 'planned';

export type FeatureTaskExecutionMode = 'agent' | 'human-approval';

/**
 * Some official Spec-Kit task plans deliberately start with a human approval
 * gate. Those tasks must not be presented as code work merely because they
 * have a T-number. Classify them from their task contract, rather than from a
 * project-specific task id, so imported plans get the same safe behavior.
 */
export function featureTaskExecutionMode(task: FeatureDeliveryTask | undefined): FeatureTaskExecutionMode {
  if (!task) return 'agent';
  const contract = `${task.title}\n${task.detail || ''}`;
  const requiresHumanApproval = /\b(?:human[- ](?:review|approval)|approval gate|before implementation starts)\b/i.test(contract);
  const changesApplicationCode = /`[^`]*\.(?:[cm]?[jt]sx?|css|scss|less|py|java|go|rb|cs|php|swift|kt|kts|rs)`/i.test(contract);
  return requiresHumanApproval && !changesApplicationCode ? 'human-approval' : 'agent';
}

/**
 * A Studio-reviewed receipt is the strongest completion evidence. A checked
 * line in tasks.md remains useful plan state, but must never be relabeled as
 * reviewed implementation evidence.
 */
export function featureDeliveryCompletionSource(
  task: FeatureDeliveryTask,
  reviewedTaskIds: Iterable<string> = [],
): FeatureDeliveryCompletionSource {
  const reviewed = new Set(reviewedTaskIds);
  if (reviewed.has(task.id)) return 'reviewed-receipt';
  return task.done ? 'tasks-md' : 'planned';
}

/** Parse current Spec-Kit T001 tasks and Studio's older TASK-101 exports. */
export function parseFeatureDeliveryTasks(content: string | undefined): FeatureDeliveryTask[] {
  if (!content) return [];
  const parsed = content.split('\n').flatMap((line) => {
    // Official Spec-Kit task files commonly use checklist lines, but imported
    // repositories also contain numbered task lists without checkboxes. Both
    // formats represent the same feature-scoped delivery evidence.
    const modern = line.match(/^\s*(?:[-*]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(T\d+)\s+(?:\[([^\]]+)\]\s+)?(.+)$/i);
    const legacy = line.match(/^[-*]\s+\[([ xX])\]\s+\*\*(TASK-[^*]+)\*\*\s*(?:\(([^)]+)\))?\s*:\s*(.+)$/);
    const match = modern || legacy;
    if (!match) return [];
    const [, checked = ' ', id, requirements, title] = match;
    return [{
      id: id.trim(),
      requirementIds: (requirements?.match(/(?:FR|NFR)-\d+/gi) || []).map((item) => item.toUpperCase()),
      title: title.trim(),
      done: checked.toLowerCase() === 'x',
    }];
  });

  // A task id is the stable identity used by receipts. Duplicate markdown
  // lines must not create duplicate selectable work or make completion
  // impossible. Keep the first authoritative occurrence in document order.
  return parsed.filter((task, index) => parsed.findIndex((candidate) => candidate.id === task.id) === index);
}

/**
 * The agent runner should resume work, never replay evidence that the feature
 * artifact or a human review has already marked complete.
 */
export function actionableFeatureDeliveryTasks(tasks: FeatureDeliveryTask[], reviewedTaskIds: Iterable<string> = []): FeatureDeliveryTask[] {
  const reviewed = new Set(reviewedTaskIds);
  return tasks.filter((task) => !task.done && !reviewed.has(task.id));
}

/**
 * Keep the two completion signals separate in the UI. A checked entry in an
 * imported tasks.md means the task is already complete in that delivery plan;
 * it is not, by itself, a Studio-reviewed implementation receipt.
 */
export function featureDeliveryTaskProgress(tasks: FeatureDeliveryTask[], reviewedTaskIds: Iterable<string> = []) {
  const reviewed = new Set(reviewedTaskIds);
  return {
    readyTaskCount: actionableFeatureDeliveryTasks(tasks, reviewed).length,
    completedInPlanCount: tasks.filter((task) => task.done).length,
    reviewedReceiptCount: tasks.filter((task) => reviewed.has(task.id)).length,
  };
}

/**
 * Return the task that should be selected immediately after a reviewer records
 * evidence for one task. Keeping this rule here makes the transition explicit
 * and prevents the UI from accidentally returning to a shared task board.
 */
export function nextActionableFeatureDeliveryTask(
  tasks: FeatureDeliveryTask[],
  reviewedTaskIds: Iterable<string> = [],
  newlyReviewedTaskId?: string,
): FeatureDeliveryTask | undefined {
  const reviewed = new Set(reviewedTaskIds);
  if (newlyReviewedTaskId) reviewed.add(newlyReviewedTaskId);
  return actionableFeatureDeliveryTasks(tasks, reviewed)[0];
}
