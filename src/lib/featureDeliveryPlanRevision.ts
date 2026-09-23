import { FeatureImplementationReceipt } from '../types/speckit';
import { parseFeatureDeliveryTasks } from './featureDeliveryTasks';

function taskContract(task: ReturnType<typeof parseFeatureDeliveryTasks>[number]) {
  return [
    task.id,
    [...task.requirementIds].sort().join(','),
    task.title.replace(/\s+/g, ' ').trim().toLocaleLowerCase(),
  ].join('|');
}

/**
 * A delivery-plan replacement may reuse IDs such as T001 for completely
 * different work. Carry a receipt forward only when the old and new task
 * contracts are identical. This keeps historical evidence while ensuring a
 * board never reports a newly planned task as complete by accident.
 */
export function reconcileDeliveryPlanReceipts(
  previousContent: string | undefined,
  nextContent: string,
  receipts: FeatureImplementationReceipt[] | undefined,
) {
  const current = receipts || [];
  if (!current.length || previousContent === nextContent) return { active: current, superseded: [] as FeatureImplementationReceipt[] };

  const previous = new Map(parseFeatureDeliveryTasks(previousContent).map((task) => [task.id, taskContract(task)]));
  const next = new Map(parseFeatureDeliveryTasks(nextContent).map((task) => [task.id, taskContract(task)]));
  const active = current.filter((receipt) => previous.get(receipt.taskId) === next.get(receipt.taskId));
  return { active, superseded: current.filter((receipt) => !active.includes(receipt)) };
}
