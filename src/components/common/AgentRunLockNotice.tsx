import { LoaderCircle } from 'lucide-react';

/**
 * A reusable status surface for any workflow that must lock its actions while
 * a local coding agent owns the current operation.
 */
export function AgentRunLockNotice({ agentLabel }: { agentLabel: string }) {
  return <div role="status" aria-live="polite" className="agent-run-lock-notice">
    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
    <span><strong>{agentLabel} is working.</strong> Stage actions are locked until this run finishes.</span>
  </div>;
}
