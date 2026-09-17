import React, { memo, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Bot, Trash2, Table as TableIcon } from 'lucide-react';
import { TaskItem, TaskStatus } from '../../types/speckit';
import { TanStackTable } from '../common/TanStackTable';
import { StatusBadge } from '../common/Badge';

interface TasksTanStackMatrixProps {
  tasks: TaskItem[];
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  onSelectForPrompt: (taskId: string, title: string) => void;
}

export const TasksTanStackMatrix: React.FC<TasksTanStackMatrixProps> = memo(({
  tasks,
  onUpdateStatus,
  onDelete,
  onSelectForPrompt,
}) => {
  const columns = useMemo<ColumnDef<TaskItem, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Task ID',
        cell: (info) => <span className="font-mono font-bold text-cyan-400">{info.getValue()}</span>,
      },
      {
        accessorKey: 'phase',
        header: 'Execution Phase',
        cell: (info) => (
          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Task Title',
        cell: (info) => <span className="font-semibold text-zinc-100">{info.getValue()}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
      },
      {
        accessorKey: 'estimatedHours',
        header: 'Hours',
        cell: (info) => (
          <span className="font-mono font-bold text-amber-400">{info.getValue() || 0}h</span>
        ),
      },
      {
        accessorKey: 'mappedRequirementId',
        header: 'Spec Mapping',
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
              {val}
            </span>
          ) : (
            <span className="text-zinc-600 font-mono text-[10px]">-</span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Quick Actions',
        cell: (info) => {
          const task = info.row.original;
          return (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSelectForPrompt(task.id, task.title)}
                className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-colors"
                title="Generate AI Prompt"
              >
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </button>
              <select
                value={task.status}
                onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
              <button
                type="button"
                onClick={() => onDelete(task.id)}
                className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ],
    [onDelete, onSelectForPrompt, onUpdateStatus]
  );

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-purple-400" />
          <span>Phased Tasks Matrix (@tanstack/react-table)</span>
        </h3>
      </div>

      <TanStackTable
        data={tasks}
        columns={columns}
        placeholderText="Search & filter tasks by ID, title, phase, or mapping..."
      />
    </div>
  );
});

TasksTanStackMatrix.displayName = 'TasksTanStackMatrix';
