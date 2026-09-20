import React, { ReactNode } from 'react';

interface Props {
  label: string;
  summary?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: 'neutral' | 'complete' | 'context';
  className?: string;
}

/**
 * A semantic, keyboard-native disclosure primitive.
 * Keep the user’s primary task visible; put reversible supporting detail here.
 */
export function ProgressiveDisclosure({ label, summary, children, defaultOpen = false, tone = 'neutral', className = '' }: Props) {
  const toneClass = tone === 'complete' ? 'text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/5' : tone === 'context' ? 'text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/5' : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-900';
  return <details className={`group ${className}`} open={defaultOpen}><summary className={`cursor-pointer rounded-lg px-2.5 py-2 text-[11px] font-semibold ${toneClass}`}><span>{label}</span>{summary && <span className="ml-1 text-zinc-500 group-open:hidden">· {summary}</span>}<span className="ml-1 hidden text-zinc-500 group-open:inline">· hide</span></summary><div className="mt-1 space-y-1">{children}</div></details>;
}
