import React, { memo } from 'react';
import { Clock, Trash2, Bot } from 'lucide-react';
import { TaskItem, TaskStatus } from '../../types/speckit';

interface TaskCardProps {
  task: TaskItem;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  onSelectForPrompt: (taskId: string, title: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = memo(({
  task,
  onUpdateStatus,
  onDelete,
  onSelectForPrompt,
}) => {
  return (
    <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5 relative group hover:border-cyan-500/40 transition-all text-xs">
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-cyan-400 text-[11px]">{task.id}</span>
        <div className="flex items-center gap-1">
          {task.mappedRequirementId && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono">
              {task.mappedRequirementId}
            </span>
          )}
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
            title="Delete Task"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="font-semibold text-zinc-200 leading-snug">{task.title}</div>
      <p className="text-[11px] text-zinc-400 line-clamp-2">{task.description}</p>

      <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-zinc-500" />
          <span>{task.estimatedHours}h</span>
        </span>

        {/* Status Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelectForPrompt(task.id, task.title)}
            className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-medium flex items-center gap-1 transition-colors"
            title="Generate AI Prompt for this Task"
          >
            <Bot className="w-3 h-3 text-purple-400" />
            <span>Prompt</span>
          </button>

          {task.status !== 'todo' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'todo')}
              className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              To Do
            </button>
          )}
          {task.status !== 'in_progress' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'in_progress')}
              className="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium transition-colors"
            >
              In Progress
            </button>
          )}
          {task.status !== 'done' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(task.id, 'done')}
              className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-medium transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
