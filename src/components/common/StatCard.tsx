import React, { memo } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  accentColor?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = memo(({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-cyan-400',
  accentColor = 'border-zinc-800/80',
  trend,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs transition-all shadow-xs ${
        onClick ? 'cursor-pointer hover:border-sky-400 dark:hover:border-cyan-500/40 hover:bg-slate-50 dark:hover:bg-zinc-900/80' : ''
      }`}
    >
      <div className="space-y-1">
        <span className="text-slate-600 dark:text-zinc-400 font-semibold">{label}</span>
        <div className="text-xl font-black text-slate-900 dark:text-zinc-100 flex items-center gap-2 font-mono">
          <span>{value}</span>
          {trend && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                trend.positive
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                  : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
        {subtitle && <p className="text-[11px] text-slate-500 dark:text-zinc-500 font-medium">{subtitle}</p>}
      </div>

      <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 ${iconColor} shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
