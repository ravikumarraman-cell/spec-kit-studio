import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { ConstitutionRule } from '../../types/speckit';
import { CategoryBadge, StrictnessBadge } from '../common/Badge';

interface RuleCardProps {
  rule: ConstitutionRule;
  onRemove: (id: string) => void;
}

export const RuleCard: React.FC<RuleCardProps> = memo(({ rule, onRemove }) => {
  return (
    <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2.5 relative group hover:border-emerald-500/40 transition-all text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-emerald-400 text-[11px]">{rule.id}</span>
          <CategoryBadge category={rule.category} />
          <StrictnessBadge strictness={rule.strictness} />
          <h4 className="font-semibold text-zinc-100">{rule.title}</h4>
        </div>
        <button
          type="button"
          onClick={() => onRemove(rule.id)}
          className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
          title="Remove Rule"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/50 font-mono text-[11px] text-zinc-200">
        &gt; {rule.ruleStatement}
      </div>

      {rule.description && rule.description !== rule.title && (
        <p className="text-[11px] text-zinc-400">{rule.description}</p>
      )}
    </div>
  );
});

RuleCard.displayName = 'RuleCard';
