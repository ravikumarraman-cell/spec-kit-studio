import { Download, MonitorDown, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { requestPwaInstall, subscribeToPwaInstallAvailability } from '../../lib/pwaInstall';
import { Modal } from './Modal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function manualInstallInstructions() {
  const userAgent = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return { icon: Share, title: 'In Safari, tap Share', detail: 'Choose Add to Home Screen, then tap Add.' };
  }
  if (/Safari/.test(userAgent) && !/Chrome|Chromium|Edg/.test(userAgent)) {
    return { icon: Share, title: 'In Safari, open File', detail: 'Choose Add to Dock, then click Add.' };
  }
  if (/Edg/.test(userAgent)) {
    return { icon: MonitorDown, title: 'Click the app icon in Edge’s address bar', detail: 'It looks like a small window with a plus, immediately left of the Favorites star. If it is missing, your organization may block app installation.' };
  }
  return { icon: MonitorDown, title: 'Click Install in Chrome’s address bar', detail: 'Look for the install icon at the right end of the address bar. If it is missing, open ⋮, then Cast, save, and share.' };
}

export function PwaInstallDialog({ isOpen, onClose }: Props) {
  const [canPrompt, setCanPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  useEffect(() => subscribeToPwaInstallAvailability(setCanPrompt), []);

  if (!isOpen) return null;
  const instructions = manualInstallInstructions();
  const InstructionIcon = instructions.icon;
  const secure = window.isSecureContext;

  const install = async () => {
    setInstalling(true);
    const installed = await requestPwaInstall();
    setInstalling(false);
    if (installed) onClose();
  };

  return <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Install Spec-Kit Studio" closeOnEscape closeOnBackdrop className="items-center justify-center p-4">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"><Download className="h-5 w-5" /></div><div><h2 className="text-base font-bold">Install Spec-Kit Studio</h2><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-zinc-400">Open Studio like a desktop or mobile app and keep the application shell available offline.</p></div></div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900" aria-label="Close install instructions"><X className="h-4 w-4" /></button>
      </div>

      {!secure && <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">Installation requires HTTPS or a localhost address.</p>}

      {canPrompt && secure ? <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100">Ready to install</p>
        <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-200">Your browser can install Studio now. You stay in control of when it opens.</p>
        <button type="button" onClick={() => void install()} disabled={installing} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-60"><Download className="h-3.5 w-3.5" />{installing ? 'Opening installer…' : 'Install now'}</button>
      </div> : <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex items-start gap-3"><InstructionIcon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-300" /><div><p className="text-xs font-bold">{instructions.title}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-zinc-400">{instructions.detail}</p></div></div>
      </div>}

      <p className="mt-4 text-[11px] leading-4 text-slate-500 dark:text-zinc-500">Your connector settings and repository files stay on this computer.</p>
    </section>
  </Modal>;
}