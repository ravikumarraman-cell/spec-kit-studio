import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ViewOption<T extends string = string> {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

interface ViewToggleProps<T extends string = string> {
  activeView: T;
  onViewChange: (view: T) => void;
  options: ViewOption<T>[];
  size?: 'sm' | 'md';
}

export const ViewToggle = memo(function ViewToggle<T extends string = string>({
  activeView,
  onViewChange,
  options,
  size = 'sm',
}: ViewToggleProps<T>) {
  const paddingClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';

  return (
    <div className="p-1 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center overflow-x-auto">
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = activeView === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onViewChange(option.id)}
            className={`${paddingClass} rounded-lg flex items-center gap-1.5 font-medium transition-all whitespace-nowrap ${
              isActive
                ? 'bg-zinc-800 text-cyan-300 shadow-xs font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" />
            <span>{option.label}</span>
            {option.badge && (
              <span
                className={`ml-1 text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  option.badgeColor || 'bg-purple-500/20 text-purple-300'
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}) as <T extends string = string>(props: ViewToggleProps<T>) => React.ReactElement;
