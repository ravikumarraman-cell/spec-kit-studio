import { Check } from 'lucide-react';
import type { DeliveryScope } from '../../types/speckit';

interface Props {
  scope: DeliveryScope;
  hasSource: boolean;
  readyToContinue: boolean;
}

const labels = ['Choose scope', 'Describe the outcome', 'Review and start'];

/** A stable orientation aid for the intake modal. It describes progress, but
 * never blocks editing an earlier choice. */
export function DeliveryIntakeProgress({ scope, hasSource, readyToContinue }: Props) {
  const activeStep = !hasSource ? 1 : readyToContinue ? 3 : 2;
  const scopeLabel = scope === 'feature' ? 'Feature' : 'User story';

  return <nav aria-label="Delivery intake progress" className="delivery-intake-progress rounded-xl border p-2">
    <ol className="grid gap-1 sm:grid-cols-3">
      {labels.map((label, index) => {
        const step = index + 1;
        const complete = step < activeStep;
        const active = step === activeStep;
        return <li key={label} className={`delivery-intake-progress-step flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${active ? 'delivery-intake-progress-step--active' : ''}`}>
          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-black ${complete ? 'delivery-intake-progress-done' : active ? 'delivery-intake-progress-current' : 'delivery-intake-progress-upcoming'}`}>
            {complete ? <Check className="h-3 w-3" /> : step}
          </span>
          <span className="min-w-0"><span className="block font-bold">{label}</span>{step === 1 && <span className="block text-[10px] opacity-75">{scopeLabel}</span>}</span>
        </li>;
      })}
    </ol>
  </nav>;
}
