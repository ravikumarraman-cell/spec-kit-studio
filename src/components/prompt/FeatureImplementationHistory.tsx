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
    <details className="group rounded-2xl border border-emerald-400/20 bg-zinc-900/50 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-zinc-100">
          <FileCheck2 className="h-4 w-4 text-emerald-300" />
          Completed & reviewed work
          <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-200">{receipts.length}</span>
        </span>
        <span className="flex items-center gap-1 text-[11px] text-zinc-500">
          View evidence <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <p className="mt-3 text-xs text-zinc-400">
        Recorded results stay here for this {workflowLabel.toLowerCase()}. They are history, not tasks that Studio will ask you to run again.
      </p>

      <div className="mt-4 space-y-3">
        {receipts.map((receipt) => {
          const task = tasks.find((item) => item.id === receipt.taskId);
          return (
            <article key={receipt.jobId} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-mono font-bold text-emerald-200">{receipt.taskId}</p>
                  <p className="mt-1 font-semibold text-zinc-100">{task?.title || 'Recorded feature task'}</p>
                </div>
                <p className="text-[11px] text-zinc-500">Reviewed {new Date(receipt.recordedAt).toLocaleString()}</p>
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
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">View Git diff summary</summary>
                  <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-[10px] text-zinc-400">{receipt.diffStat}</pre>
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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/45 p-3">
      <p className="font-semibold text-zinc-200">{title}</p>
      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[10px] text-zinc-400">{children}</pre>
    </div>
  );
}
