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

/** Parse current Spec-Kit T001 tasks and Studio's older TASK-101 exports. */
export function parseFeatureDeliveryTasks(content: string | undefined): FeatureDeliveryTask[] {
  if (!content) return [];
  return content.split('\n').flatMap((line) => {
    const modern = line.match(/^[-*]\s+\[([ xX])\]\s+(T\d+)\s+(?:\[([^\]]+)\]\s+)?(.+)$/);
    const legacy = line.match(/^[-*]\s+\[([ xX])\]\s+\*\*(TASK-[^*]+)\*\*\s*(?:\(([^)]+)\))?\s*:\s*(.+)$/);
    const match = modern || legacy;
    if (!match) return [];
    const [, checked, id, requirements, title] = match;
    return [{
      id: id.trim(),
      requirementIds: (requirements?.match(/(?:FR|NFR)-\d+/gi) || []).map((item) => item.toUpperCase()),
      title: title.trim(),
      done: checked.toLowerCase() === 'x',
    }];
  });
}

/**
 * The agent runner should resume work, never replay evidence that the feature
 * artifact or a human review has already marked complete.
 */
export function actionableFeatureDeliveryTasks(tasks: FeatureDeliveryTask[], reviewedTaskIds: Iterable<string> = []): FeatureDeliveryTask[] {
  const reviewed = new Set(reviewedTaskIds);
  return tasks.filter((task) => !task.done && !reviewed.has(task.id));
}
