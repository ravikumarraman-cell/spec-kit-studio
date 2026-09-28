import React, { memo, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Layers, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { FeatureSpec, TaskBreakdown, FunctionalRequirement } from '../../types/speckit';
import { TanStackTable } from '../common/TanStackTable';
import { PriorityBadge, CategoryBadge } from '../common/Badge';

interface TraceabilityMatrixProps {
  spec: FeatureSpec;
  tasks: TaskBreakdown;
  onNavigateToTasks: () => void;
}

interface TraceRow {
  req: FunctionalRequirement;
  mappedTaskId?: string;
  taskTitle?: string;
  taskStatus?: string;
}

export const TraceabilityMatrix: React.FC<TraceabilityMatrixProps> = memo(({
  spec,
  tasks,
  onNavigateToTasks,
}) => {
  const data = useMemo<TraceRow[]>(() => {
    return spec.functionalRequirements.map((req) => {
      const mappedTask = tasks.tasks.find((t) => t.mappedRequirementId === req.id);
      return {
        req,
        mappedTaskId: mappedTask?.id,
        taskTitle: mappedTask?.title,
        taskStatus: mappedTask?.status,
      };
    });
  }, [spec.functionalRequirements, tasks.tasks]);

  const columns = useMemo<ColumnDef<TraceRow, any>[]>(
    () => [
      {
        accessorKey: 'req.id',
        header: 'Req ID',
        cell: (info) => (
          <span className="font-mono font-bold text-cyan-400">{info.getValue()}</span>
        ),
      },
      {
        accessorKey: 'req.title',
        header: 'Requirement & Category',
        cell: (info) => {
          const row = info.row.original;
          return (
            <div>
              <div className="font-semibold text-zinc-100">{row.req.title}</div>
              <div className="mt-0.5">
                <CategoryBadge category={row.req.category} />
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'req.priority',
        header: 'Priority',
        cell: (info) => {
          const p = info.getValue();
          return p ? <PriorityBadge priority={p} /> : null;
        },
      },
      {
        accessorKey: 'mappedTaskId',
        header: 'Mapped Task',
        cell: (info) => {
          const id = info.getValue();
          const row = info.row.original;
          return id ? (
            <div>
              <span className="font-mono text-indigo-300 font-bold">{id}</span>
              {row.taskTitle && (
                <div className="text-[10px] text-zinc-400 truncate max-w-[150px]">
                  {row.taskTitle}
                </div>
              )}
            </div>
          ) : (
            <span className="text-zinc-500 italic text-[11px]">Unmapped</span>
          );
        },
      },
      {
        accessorKey: 'taskStatus',
        header: 'Execution Status',
        cell: (info) => {
          const status = info.getValue();
          if (status === 'done') {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Done
              </span>
            );
          }
          if (status === 'in_progress') {
            return (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5 animate-spin" /> In Progress
              </span>
            );
          }
          return <span className="text-[11px] text-zinc-500">Pending</span>;
        },
      },
    ],
    []
  );

  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Requirement Traceability Matrix (@tanstack/react-table)</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ensuring 100% testable mapping between Spec Requirements, Technical Architecture, and Tasks.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToTasks}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
        >
          <span>View All Tasks</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <TanStackTable
        data={data}
        columns={columns}
        placeholderText="Search traceability matrix by requirement or task..."
      />
    </div>
  );
});

TraceabilityMatrix.displayName = 'TraceabilityMatrix';
