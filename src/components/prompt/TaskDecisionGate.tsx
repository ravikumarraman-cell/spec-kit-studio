import React from 'react';
import { CheckCircle2, UserRoundCheck } from 'lucide-react';
import {
  FeatureTaskDecisionAnswers,
  FeatureTaskDecisionGate,
} from '../../lib/featureTaskDecisions';

interface TaskDecisionGateProps {
  gate: FeatureTaskDecisionGate;
  answers: FeatureTaskDecisionAnswers;
  onAnswerChange: (fieldId: string, value: string) => void;
}

/** Optional policy review: safe defaults keep the normal task-submission path frictionless. */
export const TaskDecisionGate: React.FC<TaskDecisionGateProps> = ({
  gate,
  answers,
  onAnswerChange,
}) => {
  return (
    <section className="rounded-2xl border border-emerald-400/25 bg-gradient-to-br from-emerald-400/[0.08] via-zinc-950 to-zinc-950 p-4 shadow-[0_0_40px_rgba(52,211,153,0.05)]">
      <div className="flex gap-3">
        <div className="h-fit rounded-xl bg-emerald-400/15 p-2.5"><UserRoundCheck className="h-5 w-5 text-emerald-200" /></div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">Ready to submit</p>
          <h2 className="mt-1 text-sm font-bold text-zinc-100">Safe operational defaults are included for {gate.taskId}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-zinc-400">Studio will pass its conservative defaults to the agent. Submit the task now, or review only if your organization uses a different policy.</p>
        </div>
      </div>

      <details className="group mt-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-300 marker:text-emerald-300">Review or change operational defaults</summary>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{gate.description}</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {gate.fields.map((field) => (
            <label key={field.id} className="rounded-xl border border-zinc-800/90 bg-zinc-950/75 p-3">
              <span className="block text-xs font-bold text-zinc-200">{field.label}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-zinc-500">{field.help}</span>
              <select value={answers[field.id] || ''} onChange={(event) => onAnswerChange(field.id, event.target.value)} className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-emerald-400/60">
                {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ))}
        </div>
      </details>
      <p className="mt-3 flex items-center gap-2 text-xs text-emerald-200"><CheckCircle2 className="h-4 w-4" />Defaults are saved with this feature and task, and included in the handoff.</p>
    </section>
  );
};
