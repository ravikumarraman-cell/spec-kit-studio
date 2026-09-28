import React from 'react';
import { CircleAlert } from 'lucide-react';

interface ActionErrorNoticeProps {
  message: string | null;
  retryLabel?: string;
  onRetry?: () => void;
}

/** A consistent, recoverable error state for user-initiated local actions. */
export function ActionErrorNotice({ message, retryLabel = 'Try again', onRetry }: ActionErrorNoticeProps) {
  if (!message) return null;
  return <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">
    <CircleAlert className="h-4 w-4 shrink-0 text-rose-300" />
    <p className="min-w-0 flex-1">{message}</p>
    {onRetry && <button type="button" onClick={onRetry} className="rounded-lg border border-rose-300/40 px-3 py-1.5 font-bold text-rose-100 hover:bg-rose-400/10">{retryLabel}</button>}
  </div>;
}
