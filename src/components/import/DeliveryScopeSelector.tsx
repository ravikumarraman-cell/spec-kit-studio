import { BookOpenCheck, Layers3 } from 'lucide-react';
import { DeliveryScope } from '../../types/speckit';

export function DeliveryScopeSelector({ value, onChange }: { value: DeliveryScope; onChange: (scope: DeliveryScope) => void }) {
  const options = [
    { value: 'feature' as const, label: 'Feature', detail: 'Plan and deliver a complete feature', icon: Layers3 },
    { value: 'user-story' as const, label: 'User story', detail: 'Deliver one focused use case', icon: BookOpenCheck },
  ];
  return <section aria-label="Choose delivery scope" className="space-y-2">
    <div>
      <p className="text-xs font-bold text-zinc-100">What are you delivering?</p>
      <p className="mt-0.5 text-[11px] text-zinc-400">Choose the smallest scope that matches the outcome. You can change this before saving.</p>
    </div>
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 sm:grid-cols-2" role="radiogroup">
      {options.map((option) => {
        const Icon = option.icon;
        const selected = value === option.value;
        return <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => onChange(option.value)} className={`flex min-h-16 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${selected ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100' : 'border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'}`}>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${selected ? 'bg-cyan-400 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}><Icon className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block text-xs font-bold">{option.label}</span><span className="mt-0.5 block text-[11px] text-zinc-400">{option.detail}</span></span>
        </button>;
      })}
    </div>
  </section>;
}