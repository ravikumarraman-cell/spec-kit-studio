import React, { memo } from 'react';
import { LucideIcon, Save, Sparkles, Check } from 'lucide-react';

interface EditorHeaderProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  badgeColor?: string;
  hasUnsaved?: boolean;
  onSave?: () => void;
  isSaving?: boolean;
  onTriggerAi?: () => void;
  aiButtonLabel?: string;
  viewToggle?: React.ReactNode;
  extraActions?: React.ReactNode;
}

export const EditorHeader: React.FC<EditorHeaderProps> = memo(({
  icon: Icon,
  iconColor = 'text-cyan-400',
  title,
  subtitle,
  badgeLabel,
  badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  hasUnsaved = false,
  onSave,
  isSaving = false,
  onTriggerAi,
  aiButtonLabel = 'AI Auto-Generate',
  viewToggle,
  extraActions,
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
          {badgeLabel && (
            <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded border ${badgeColor}`}>
              {badgeLabel}
            </span>
          )}
          {hasUnsaved && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Unsaved Changes
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-zinc-400">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {viewToggle}

        {extraActions}

        {onTriggerAi && (
          <button
            type="button"
            onClick={onTriggerAi}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiButtonLabel}</span>
          </button>
        )}

        {onSave && (
          <button
            type="button"
            onClick={onSave}
            disabled={!hasUnsaved && !isSaving}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hasUnsaved
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60 cursor-default'
            }`}
          >
            {hasUnsaved ? <Save className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{hasUnsaved ? 'Save Changes' : 'Saved'}</span>
          </button>
        )}
      </div>
    </div>
  );
});

EditorHeader.displayName = 'EditorHeader';
