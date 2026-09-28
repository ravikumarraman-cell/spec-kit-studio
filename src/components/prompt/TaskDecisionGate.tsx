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
    <section className="task-decision-gate rounded-xl border p-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><UserRoundCheck className="task-decision-gate-icon h-4 w-4 shrink-0" /><div><p className="task-decision-gate-title font-bold">Safe defaults are ready for {gate.taskId}</p><p className="task-decision-gate-copy mt-0.5">Review only when your team needs a different policy.</p></div></div>
        <CheckCircle2 className="task-decision-gate-icon h-4 w-4 shrink-0" />
      </div>
      <details className="task-decision-gate-details mt-3 rounded-lg border">
        <summary className="cursor-pointer px-3 py-2.5 font-semibold">Review or change defaults</summary>
        <div className="border-t p-3"><p className="task-decision-gate-copy text-[11px] leading-relaxed">{gate.description}</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {gate.fields.map((field) => (
            <label key={field.id} className="task-decision-gate-field rounded-lg border p-3">
              <span className="task-decision-gate-title block text-xs font-bold">{field.label}</span>
              <span className="task-decision-gate-copy mt-1 block text-[11px] leading-relaxed">{field.help}</span>
              <select value={answers[field.id] || ''} onChange={(event) => onAnswerChange(field.id, event.target.value)} className="task-decision-gate-select mt-3 w-full rounded-lg px-3 py-2 text-xs outline-none">
                {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ))}
        </div>
        </div>
      </details>
    </section>
  );
};
