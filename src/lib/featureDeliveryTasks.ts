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

/** A compact demo plan is deliberately one review gate, one implementation,
 * and one focused verification task—not a smaller-looking detailed plan. */
export const COMPACT_DEMO_TASK_MIN = 3;
export const COMPACT_DEMO_TASK_MAX = 12;

export function compactDemoPlanIssue(content: string | undefined, expectedTaskCount?: number): string | undefined {
  const taskCount = parseFeatureDeliveryTasks(content).length;
  const expected = expectedTaskCount === undefined ? undefined : Math.max(COMPACT_DEMO_TASK_MIN, Math.min(COMPACT_DEMO_TASK_MAX, Math.floor(expectedTaskCount)));
  if (expected !== undefined) return taskCount === expected ? undefined : `Compact demo plans must contain exactly ${expected} individual tasks; Studio found ${taskCount}.`;
  return taskCount >= COMPACT_DEMO_TASK_MIN && taskCount <= COMPACT_DEMO_TASK_MAX
    ? undefined
    : `Compact demo plans must contain ${COMPACT_DEMO_TASK_MIN}–${COMPACT_DEMO_TASK_MAX} individual tasks; Studio found ${taskCount}.`;
}

/**
 * A visual reference is not satisfied by a generic "test the UI" task.  The
 * delivery plan must make the source hierarchy and comparison evidence
 * independently reviewable, otherwise an agent can flatten the source data
 * into a plausible-looking dashboard and still claim task completion.
 */
export function visualDeliveryPlanIssue(content: string | undefined): string | undefined {
  const tasks = parseFeatureDeliveryTasks(content);
  if (!tasks.length) return 'Visual-reference features require individual delivery tasks.';
  const contract = tasks.map((task) => `${task.title}\n${task.detail || ''}`).join('\n').toLowerCase();
  if (!/(source|data)\s+(map|mapping)|authoritative.*source/.test(contract)) {
    return 'Visual-reference delivery plans require a task that maps every visible field and hierarchy to an authoritative source.';
  }
  if (!/(hierarchy|category|group|subcategor|component).*?(service|count|field)|(service|count|field).*?(hierarchy|category|group|subcategor|component)/.test(contract)) {
    return 'Visual-reference delivery plans require a task that preserves the reference hierarchy instead of flattening it into a generic list.';
  }
  if (!/(screenshot|visual).*(desktop|wide).*(narrow|mobile|responsive)|(desktop|wide).*(narrow|mobile|responsive).*(screenshot|visual)/.test(contract)) {
    return 'Visual-reference delivery plans require a visual-verification task with both desktop and narrow-viewport evidence.';
  }
  if (!/(contrast|accessib|theme|design.system|token).*(responsive|narrow|mobile|screenshot|visual)|(responsive|narrow|mobile|screenshot|visual).*(contrast|accessib|theme|design.system|token)/.test(contract)) {
    return 'Visual-reference delivery plans require an explicit theme, contrast, and responsive-behavior review task.';
  }
  return undefined;
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

/** Mark only the exact reviewed task complete in Studio's retained plan. This
 * changes Studio evidence, never a repository file; the agent still has to
 * update the matching worktree checklist under its own task contract. */
export function markFeatureDeliveryTaskReviewed(content: string | undefined, taskId: string): string | undefined {
  if (!content || !/^T\d+$/i.test(taskId)) return content;
  const escaped = taskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^(\\s*(?:[-*]|\\d+[.)])\\s+)\\[ \\](\\s+${escaped}\\b)`, 'im');
  return content.replace(pattern, '$1[x]$2');
}
