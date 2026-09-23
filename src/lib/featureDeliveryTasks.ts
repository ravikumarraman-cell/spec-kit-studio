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
