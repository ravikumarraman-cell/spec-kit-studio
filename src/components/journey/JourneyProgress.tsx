import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { FeatureJourney as JourneyState } from '../../types/speckit';
import { FeatureJourneyStage } from '../../lib/featureJourney';

interface JourneyProgressProps {
  stages: readonly FeatureJourneyStage[];
  journey: JourneyState;
  currentStageId: number;
  readiness: ReadonlyMap<number, boolean>;
}

/**
 * Keeps the whole route visible without making users parse eight full cards.
 * Detailed stage copy stays in the current-step panel where it is actionable.
 */
export function JourneyProgress({ stages, journey, currentStageId, readiness }: JourneyProgressProps) {
  const completed = new Set(journey.completedStages);
  const current = stages.find((stage) => stage.id === currentStageId);
  const currentReady = current ? readiness.get(current.id) : false;

  return (
    <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-zinc-300 marker:content-none">
        <span><strong className="text-zinc-100">Journey progress</strong><span className="ml-2 text-zinc-500">Stage {currentStageId} of {stages.length} · {current?.shortLabel}</span></span>
        <span className={currentReady ? 'font-bold text-emerald-300' : 'font-semibold text-zinc-500'}>{currentReady ? 'Ready to approve' : 'In progress'}</span>
      </summary>
      <ol className="grid gap-2 border-t border-zinc-800 p-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="All feature journey stages">
        {stages.map((stage) => {
          const isComplete = completed.has(stage.id);
          const isCurrent = stage.id === currentStageId;
          return <li key={stage.id} className={`flex items-center gap-2 rounded-lg border p-2 ${isCurrent ? 'border-cyan-400/35 bg-cyan-500/10' : isComplete ? 'border-emerald-400/25 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-950/40'}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-black ${isComplete ? 'border-emerald-400/40 text-emerald-300' : isCurrent ? 'border-cyan-400/40 text-cyan-300' : 'border-zinc-700 text-zinc-500'}`}>{isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : stage.id}</span>
            <span className={`min-w-0 truncate font-semibold ${isCurrent ? 'text-cyan-100' : isComplete ? 'text-emerald-100' : 'text-zinc-500'}`}>{stage.shortLabel}</span>
          </li>;
        })}
      </ol>
    </details>
  );
}
