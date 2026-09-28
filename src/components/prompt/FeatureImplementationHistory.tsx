import React from 'react';
import { ChevronDown, FileCheck2 } from 'lucide-react';
import { FeatureImplementationReceipt } from '../../types/speckit';

interface FeatureImplementationHistoryProps {
  receipts: FeatureImplementationReceipt[];
  tasks: readonly { id: string; title: string }[];
  workflowLabel?: string;
}

/**
 * Read-only evidence from implementation runs the reviewer has already recorded.
 * Keeping it separate from task selection prevents completed work from becoming
 * actionable again when the active feature is revisited.
 */
export function FeatureImplementationHistory({
  receipts,
  tasks,
  workflowLabel = 'Feature',
}: FeatureImplementationHistoryProps) {
  if (!receipts.length) return null;

  return (
    <details className="implementation-history group rounded-2xl border p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="implementation-history__title flex items-center gap-2 text-sm font-bold">
          <FileCheck2 className="implementation-history__success-icon h-4 w-4" />
          Completed & reviewed work
          <span className="implementation-history__count rounded-md px-1.5 py-0.5 text-[10px]">{receipts.length}</span>
        </span>
        <span className="implementation-history__meta flex items-center gap-1 text-[11px]">
          View evidence <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <p className="implementation-history__copy mt-3 text-xs">
        Recorded results stay here for this {workflowLabel.toLowerCase()}. They are history, not tasks that Studio will ask you to run again.
      </p>

      <div className="mt-4 space-y-3">
        {receipts.map((receipt) => {
          const task = tasks.find((item) => item.id === receipt.taskId);
          return (
            <article key={receipt.jobId} className="implementation-history__receipt rounded-xl border p-4 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="implementation-history__task-id font-mono font-bold">{receipt.taskId}</p>
                  <p className="implementation-history__task-title mt-1 font-semibold">{task?.title || 'Recorded feature task'}</p>
                </div>
                <p className="implementation-history__meta text-[11px]">Reviewed {new Date(receipt.recordedAt).toLocaleString()}</p>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <EvidencePanel title="Produced files">
                  {receipt.changedFiles.join('\n') || 'No changed-file list was retained for this earlier run. Its recorded output is preserved at right.'}
                </EvidencePanel>
                <EvidencePanel title="Verification & agent output">
                  {receipt.verificationSummary || receipt.diffStat || 'No output was retained.'}
                </EvidencePanel>
              </div>

              {receipt.diffStat && (
                <details className="mt-3 text-[11px]">
                  <summary className="implementation-history__diff-summary cursor-pointer">View Git diff summary</summary>
                  <pre className="implementation-history__diff mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border p-3 text-[10px]">{receipt.diffStat}</pre>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </details>
  );
}

function EvidencePanel({ title, children }: { title: string; children: string }) {
  return (
    <div className="implementation-history__evidence rounded-lg border p-3">
      <p className="implementation-history__evidence-title font-semibold">{title}</p>
      <pre className="implementation-history__evidence-body mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px]">{children}</pre>
    </div>
  );
}
