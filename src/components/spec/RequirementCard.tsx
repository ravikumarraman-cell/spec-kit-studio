import React, { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { FunctionalRequirement } from '../../types/speckit';
import { PriorityBadge, CategoryBadge } from '../common/Badge';

interface RequirementCardProps {
  req: FunctionalRequirement;
  onRemove: (id: string) => void;
}

export const RequirementCard: React.FC<RequirementCardProps> = memo(({ req, onRemove }) => {
  return (
    <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 relative group hover:border-cyan-500/40 transition-all text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-cyan-400 text-[11px]">{req.id}</span>
          <CategoryBadge category={req.category} />
          {req.priority && <PriorityBadge priority={req.priority} />}
          <h4 className="font-semibold text-zinc-100">{req.title}</h4>
        </div>
        <button
          type="button"
          onClick={() => onRemove(req.id)}
          className="text-zinc-600 hover:text-red-400 transition-colors p-1"
          title="Remove Requirement"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-zinc-300 leading-relaxed pl-1">{req.description}</p>
    </div>
  );
});

RequirementCard.displayName = 'RequirementCard';
