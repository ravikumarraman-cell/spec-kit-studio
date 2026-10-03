import { CheckCircle2, Trash2 } from 'lucide-react';
import { ActionBrief } from '../common/ActionBrief';

interface Props {
  acceptLabel: string;
  onAccept: () => void;
  onDiscard: () => void;
  discardLabel?: string;
}

/** One predictable review decision for every persona draft. Keeping the safe
 * discard beside acceptance prevents a user from having to hunt for an exit. */
export function PersonaDraftActions({ acceptLabel, onAccept, onDiscard, discardLabel = 'Discard draft' }: Props) {
  return <div className="space-y-3"><div className="flex flex-wrap gap-3">
    <button type="button" onClick={onAccept} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />{acceptLabel}</button>
    <button type="button" onClick={onDiscard} className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-800"><Trash2 className="h-3.5 w-3.5" />{discardLabel}</button>
  </div><ActionBrief brief={{ summary: 'Accept records this reviewed persona evidence; discard removes only this unsaved local draft.', creates: ['Accepted, feature-scoped persona evidence when you accept'], doesNot: ['Change repository code', 'Approve implementation or release'], next: 'Accepted evidence becomes visible only to the declared downstream consumers.' }} /></div>;
}
