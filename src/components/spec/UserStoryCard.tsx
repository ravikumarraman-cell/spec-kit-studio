import React, { memo } from 'react';
import { Trash2, CheckCircle2, Play } from 'lucide-react';
import { UserStory } from '../../types/speckit';
import { PriorityBadge } from '../common/Badge';

interface UserStoryCardProps {
  story: UserStory;
  onRemove: (id: string) => void;
  onStartDelivery?: (id: string) => void;
}

export const UserStoryCard: React.FC<UserStoryCardProps> = memo(({ story, onRemove, onStartDelivery }) => {
  return (
    <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 relative group hover:border-indigo-500/40 transition-all text-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-indigo-400 text-[11px]">{story.id}</span>
          <PriorityBadge priority={story.priority} />
          <h4 className="font-semibold text-zinc-100">{story.title}</h4>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onStartDelivery && <button type="button" onClick={() => onStartDelivery(story.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-200 hover:bg-cyan-500/20"><Play className="h-3 w-3" />Start delivery</button>}
          <button type="button" onClick={() => onRemove(story.id)} className="p-1.5 text-zinc-600 transition-colors hover:text-red-400" title="Remove Story" aria-label={`Remove ${story.title}`}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/50 text-[11px]">
        <div>
          <span className="text-zinc-500 block font-mono text-[10px]">AS A</span>
          <span className="text-zinc-300 font-medium">{story.asA}</span>
        </div>
        <div>
          <span className="text-zinc-500 block font-mono text-[10px]">I WANT TO</span>
          <span className="text-zinc-300 font-medium">{story.iWantTo}</span>
        </div>
        <div>
          <span className="text-zinc-500 block font-mono text-[10px]">SO THAT</span>
          <span className="text-zinc-300 font-medium">{story.soThat || '-'}</span>
        </div>
      </div>

      {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
            Acceptance Criteria (Given / When / Then)
          </span>
          <div className="space-y-1">
            {story.acceptanceCriteria.map((crit, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-zinc-300 text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span>{crit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

UserStoryCard.displayName = 'UserStoryCard';
