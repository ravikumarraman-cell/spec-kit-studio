import { BellRing, Boxes, PlugZap, RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useComponentUpdates } from '../../hooks/useComponentUpdates';
import { ComponentUpdate } from '../../lib/componentUpdates';

interface Props {
  onOpenConnector: () => void;
  additionalUpdates?: ComponentUpdate[];
}

export function ComponentUpdateCenter({ onOpenConnector, additionalUpdates = [] }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { updates } = useComponentUpdates(additionalUpdates);
  useClickOutside([containerRef], () => setOpen(false));

  if (!updates.length) return null;

  const performAction = (update: ComponentUpdate) => {
    setOpen(false);
    if (update.action === 'reload-app') window.location.reload();
    if (update.action === 'open-connector') onOpenConnector();
  };

  return <div ref={containerRef} className="relative shrink-0 z-100">
    <button
      type="button"
      onClick={() => setOpen((value) => !value)}
      className="relative flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 text-xs font-bold text-amber-950 shadow-xs transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/15"
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={`${updates.length} component update${updates.length === 1 ? '' : 's'} available`}
      title="Component updates available"
    >
      <BellRing className="h-4 w-4" />
      <span className="hidden lg:inline">Updates</span>
      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] text-white" aria-hidden="true">{updates.length}</span>
    </button>

    {open && <section
      role="dialog"
      aria-label="Component updates"
      aria-live="polite"
      className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start gap-2.5 px-1 pb-2">
        <Boxes className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div><h2 className="font-bold text-slate-950 dark:text-zinc-100">Component updates</h2><p className="mt-0.5 text-[11px] leading-4 text-slate-500 dark:text-zinc-400">Update each part when it suits your work. Studio will not interrupt you.</p></div>
      </div>
      <div className="mt-1 space-y-1.5">
        {updates.map((update) => <article key={update.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/70">
          <div className="flex items-center gap-2">
            {update.id === 'local-connector' ? <PlugZap className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> : <RefreshCw className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
            <h3 className="font-bold text-slate-900 dark:text-zinc-100">{update.name}</h3>
            {(update.currentVersion || update.availableVersion) && <span className="ml-auto font-mono text-[10px] text-slate-500 dark:text-zinc-500">{update.currentVersion || '?'} → {update.availableVersion || 'latest'}</span>}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-slate-600 dark:text-zinc-400">{update.summary}</p>
          <button type="button" onClick={() => performAction(update)} className="mt-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">{update.actionLabel}</button>
        </article>)}
      </div>
    </section>}
  </div>;
}