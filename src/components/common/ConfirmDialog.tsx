import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'primary' | 'caution';
}

/** Central, theme-aware confirmation surface for consequential actions.
 * Replaces browser-native dialogs, which cannot inherit Studio theming or
 * meet the app's focus and copy standards. */
export function ConfirmDialog({ isOpen, title, description, confirmLabel, onConfirm, onCancel, tone = 'primary' }: Props) {
  const confirmClass = tone === 'caution' ? 'bg-amber-400 text-zinc-950 hover:bg-amber-300' : 'bg-cyan-500 text-zinc-950 hover:bg-cyan-400';
  return <Modal isOpen={isOpen} onClose={onCancel} closeOnBackdrop={false} closeOnEscape ariaLabel={title} className="items-center justify-center p-4">
    <section className="w-full max-w-lg rounded-2xl border border-cyan-400/30 bg-white p-5 shadow-2xl dark:bg-zinc-900" aria-describedby="confirm-dialog-description">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"><AlertTriangle className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-950 dark:text-zinc-100">{title}</h2><p id="confirm-dialog-description" className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">{description}</p></div></div>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">Cancel</button><button type="button" onClick={onConfirm} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${confirmClass}`}>{confirmLabel}</button></div>
    </section>
  </Modal>;
}
