import React from 'react';
import { Focus } from 'lucide-react';

interface FeatureExecutionFocusProps {
  title: string;
  summary: string;
  readyTaskCount: number;
  reviewedTaskCount: number;
}

/** The compact Stage 7 context anchor used before a local task handoff. */
export function FeatureExecutionFocus({
  title,
  summary,
  readyTaskCount,
  reviewedTaskCount,
}: FeatureExecutionFocusProps) {
  return (
    <section className="rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 via-zinc-950 to-violet-500/10 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-cyan-400/10 p-2.5"><Focus className="h-5 w-5 text-cyan-300" /></div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Feature in focus · Stage 7</p>
          <h2 className="mt-1 text-lg font-bold text-zinc-100">{title}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">{summary}</p>
          <p className="mt-3 text-[11px] text-zinc-300">
            <span className="font-bold text-cyan-200">{readyTaskCount} task{readyTaskCount === 1 ? '' : 's'} ready to run</span>
            {reviewedTaskCount > 0 ? ` · ${reviewedTaskCount} already completed or reviewed` : ''}.
            {' '}Studio resumes at the next task; it never prompts you to rerun recorded work.
          </p>
        </div>
      </div>
    </section>
  );
}
