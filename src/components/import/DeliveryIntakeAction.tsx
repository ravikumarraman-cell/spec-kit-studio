import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { ActionBrief } from '../common/ActionBrief';

interface Props {
  label: string;
  disabled: boolean;
  isProcessing: boolean;
  sourceLabel: string;
  preparationLabel: string;
  onStart: () => void;
}

/** Owns the one consequential action in feature intake, after scope, source,
 * and preparation method have all been made visible. */
export function DeliveryIntakeAction({ label, disabled, isProcessing, sourceLabel, preparationLabel, onStart }: Props) {
  return <section aria-label="Ready to prepare delivery work" className="delivery-intake-action rounded-2xl border p-4">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="delivery-intake-eyebrow text-[10px] font-black uppercase tracking-[0.16em]">Next: prepare a reviewable brief</p>
        <h3 className="delivery-intake-title mt-1 text-sm font-bold">One action, then you review the result</h3>
        <p className="delivery-intake-copy mt-1 text-xs leading-5">Source: <strong>{sourceLabel}</strong> · Method: <strong>{preparationLabel}</strong></p>
      </div>
      <button type="button" onClick={onStart} disabled={disabled || isProcessing} className="delivery-intake-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50">
        {isProcessing ? <Sparkles className="h-4 w-4 animate-pulse" /> : <ArrowRight className="h-4 w-4" />}
        {isProcessing ? 'Preparing…' : label}
      </button>
    </div>
    <div className="delivery-intake-reassurance mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] leading-5"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />Studio creates a reviewable specification or draft first. It does not implement application code at this step.</div>
    <ActionBrief className="mt-3" brief={{ summary: 'Prepares a reviewable brief; you decide whether to accept the result.', creates: ['A reviewable specification or Studio draft'], uses: [`${sourceLabel} as the source`, `${preparationLabel} as the selected method`], doesNot: ['Implement application code', 'Approve or advance delivery automatically'], next: 'Review the prepared result before deciding what to do next.' }} />
  </section>;
}
