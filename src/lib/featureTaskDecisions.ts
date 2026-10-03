/**
 * Human decisions that must be explicit before an agent receives a task.
 *
 * These are deliberately task-scoped rather than workspace settings: a
 * decision is evidence for one feature and one task, not a hidden default
 * that may accidentally affect another feature.
 */
export interface FeatureTaskDecisionOption {
  value: string;
  label: string;
}

export interface FeatureTaskDecisionField {
  id: string;
  label: string;
  help: string;
  options: FeatureTaskDecisionOption[];
}

export interface FeatureTaskDecisionGate {
  taskId: string;
  title: string;
  description: string;
  fields: FeatureTaskDecisionField[];
}

export type FeatureTaskDecisionAnswers = Record<string, string>;

const T002_GATE: FeatureTaskDecisionGate = {
  taskId: 'T002',
  title: 'Confirm delivery decisions',
  description: 'T002 documents operational policy. Choose the policy that product and operations have approved; Studio will attach these choices to the agent handoff so it does not invent them.',
  fields: [
    {
      id: 'groupingKey',
      label: 'Open follow-up grouping',
      help: 'Defines when one durable follow-up action exists instead of duplicates.',
      options: [
        { value: 'Maintain one stable open follow-up per tenant, account, application, and AIDE ID condition.', label: 'One stable action per affected condition (recommended)' },
        { value: 'Maintain one stable open follow-up per tenant and AIDE ID, with affected accounts and applications attached.', label: 'One action per tenant and AIDE ID' },
      ],
    },
    {
      id: 'ownerResolution',
      label: 'Owner resolution',
      help: 'Defines who owns a follow-up and what happens when no owner is available.',
      options: [
        { value: 'Resolve the Tenant Owner first, then the Account Owner; retain an explicitly unassigned action when neither is available.', label: 'Tenant Owner → Account Owner → visibly unassigned (recommended)' },
        { value: 'Resolve only the Account Owner; retain an explicitly unassigned action when no Account Owner is available.', label: 'Account Owner → visibly unassigned' },
      ],
    },
    {
      id: 'operationsRecipient',
      label: 'AE Operations recipient and channel',
      help: 'Defines where the durable action is delivered after it is created.',
      options: [
        { value: 'Deliver the persisted action to the AE Operations queue through the existing approved notification channel.', label: 'AE Operations queue through the approved channel (recommended)' },
        { value: 'Keep the persisted action in the product work queue only; AE Operations retrieves it there.', label: 'Product work queue only' },
      ],
    },
    {
      id: 'retryPolicy',
      label: 'Notification retry policy',
      help: 'Defines how a failed delivery is retried without creating duplicate actions.',
      options: [
        { value: 'Use the existing bounded retry policy; record failures visibly and never create a duplicate follow-up during retry.', label: 'Existing bounded retry policy, with visible failures (recommended)' },
        { value: 'Do not retry automatically; record the failed delivery for AE Operations to retry manually.', label: 'Manual retry only' },
      ],
    },
    {
      id: 'resolutionSemantics',
      label: 'Resolution semantics',
      help: 'Defines the event that safely closes an open funding follow-up.',
      options: [
        { value: 'Resolve only when the same condition is confirmed FUNDED; preserve the action history and never treat unavailable data as funded.', label: 'Confirmed FUNDED only; preserve history (recommended)' },
        { value: 'Resolve only after an authorized operator confirms resolution; preserve the action history and never treat unavailable data as funded.', label: 'Authorized operator confirmation only' },
      ],
    },
  ],
};

const GATES: Record<string, FeatureTaskDecisionGate> = { T002: T002_GATE };

export function featureTaskDecisionGate(taskId: string | undefined): FeatureTaskDecisionGate | undefined {
  return taskId ? GATES[taskId.trim().toUpperCase()] : undefined;
}

export function decisionsComplete(gate: FeatureTaskDecisionGate | undefined, answers: FeatureTaskDecisionAnswers, accepted: boolean): boolean {
  return !gate || (accepted && gate.fields.every((field) => Boolean(answers[field.id]?.trim())));
}

/** The first option for every policy is Studio's conservative, safe default. */
export function recommendedDecisionAnswers(gate: FeatureTaskDecisionGate | undefined): FeatureTaskDecisionAnswers {
  if (!gate) return {};
  return Object.fromEntries(gate.fields.map((field) => [field.id, field.options[0]?.value || '']));
}

export function formatApprovedDecisions(gate: FeatureTaskDecisionGate | undefined, answers: FeatureTaskDecisionAnswers): string {
  if (!gate) return '';
  return gate.fields
    .map((field) => `- ${field.label}: ${answers[field.id] || 'Not provided'}`)
    .join('\n');
}
