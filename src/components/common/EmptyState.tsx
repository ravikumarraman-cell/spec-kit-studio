import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = memo(({
  icon: Icon,
  iconColor = 'text-zinc-500',
  title,
  description,
  actionButton,
}) => {
  const ActionIcon = actionButton?.icon;

  return (
    <div className="p-8 rounded-2xl bg-zinc-950/60 border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center space-y-3">
      <div className={`p-3 rounded-2xl bg-zinc-900 border border-zinc-800 ${iconColor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-sm font-bold text-zinc-200">{title}</h4>
        <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>
      </div>

      {actionButton && (
        <button
          type="button"
          onClick={actionButton.onClick}
          className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
          <span>{actionButton.label}</span>
        </button>
      )}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
