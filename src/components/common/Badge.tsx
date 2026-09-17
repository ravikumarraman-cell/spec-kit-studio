import React, { memo } from 'react';
import { Priority, TaskStatus, RequirementCategory, ConstitutionRule } from '../../types/speckit';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = memo(({ priority, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  let colorClasses = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  if (priority === 'High') {
    colorClasses = 'bg-red-500/10 text-red-400 border-red-500/20';
  } else if (priority === 'Medium') {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (priority === 'Low') {
    colorClasses = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  }

  return (
    <span className={`rounded font-bold border inline-flex items-center gap-1 ${sizeClasses} ${colorClasses}`}>
      {priority}
    </span>
  );
});

PriorityBadge.displayName = 'PriorityBadge';

interface StatusBadgeProps {
  status: TaskStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = memo(({ status }) => {
  let colorClasses = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  let label = 'To Do';

  if (status === 'done') {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    label = 'Completed';
  } else if (status === 'in_progress') {
    colorClasses = 'bg-amber-500/10 text-amber-300 border-amber-500/20';
    label = 'In Progress';
  } else if (status === 'blocked') {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    label = 'Blocked';
  }

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border inline-flex items-center gap-1.5 ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'in_progress' ? 'bg-amber-400 animate-pulse' : status === 'done' ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
      <span>{label}</span>
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

interface CategoryBadgeProps {
  category: RequirementCategory | string;
}

export const CategoryBadge: React.FC<CategoryBadgeProps> = memo(({ category }) => {
  return (
    <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold border border-zinc-700/60 inline-flex items-center">
      {category}
    </span>
  );
});

CategoryBadge.displayName = 'CategoryBadge';

interface StrictnessBadgeProps {
  strictness: ConstitutionRule['strictness'];
}

export const StrictnessBadge: React.FC<StrictnessBadgeProps> = memo(({ strictness }) => {
  let colorClasses = 'bg-zinc-800 text-zinc-400 border-zinc-700';
  if (strictness === 'Mandatory') {
    colorClasses = 'bg-red-500/10 text-red-400 border-red-500/20 font-bold';
  } else if (strictness === 'Recommended') {
    colorClasses = 'bg-amber-500/10 text-amber-300 border-amber-500/20 font-medium';
  } else {
    colorClasses = 'bg-zinc-800 text-zinc-400 border-zinc-700 font-normal';
  }

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded border inline-flex items-center ${colorClasses}`}>
      {strictness}
    </span>
  );
});

StrictnessBadge.displayName = 'StrictnessBadge';
