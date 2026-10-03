import React from 'react';
import { CircleAlert } from 'lucide-react';
import { useRevealOnChange } from '../../hooks/useRevealOnChange';

export function ImportNotice({ message, action }: { message: string | null; action?: { label: string; href?: string; onClick?: () => void } | null }) {
  const noticeRef = useRevealOnChange<HTMLDivElement>(message);
  if (!message) return null;
  return <div ref={noticeRef} tabIndex={-1} role="alert" className="scroll-mt-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-rose-300 flex gap-2 items-start focus-visible:ring-2 focus-visible:ring-rose-300"><CircleAlert className="w-4 h-4 shrink-0 mt-0.5" /><div className="grid gap-2"><span>{message}</span>{action && (action.href ? <a href={action.href} target="_blank" rel="noreferrer" className="w-fit rounded-lg border border-rose-300/40 px-2.5 py-1.5 text-xs font-bold text-rose-100 hover:bg-rose-400/10">{action.label}</a> : <button type="button" onClick={action.onClick} className="w-fit rounded-lg border border-rose-300/40 px-2.5 py-1.5 text-xs font-bold text-rose-100 hover:bg-rose-400/10">{action.label}</button>)}</div></div>;
}
