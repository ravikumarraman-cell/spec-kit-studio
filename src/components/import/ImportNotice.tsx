import React from 'react';
import { CircleAlert } from 'lucide-react';

export function ImportNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="alert" className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex gap-2 items-start"><CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />{message}</div>;
}
