import React from 'react';
import { FolderGit2 } from 'lucide-react';

/** Static, reusable introduction for repository import workflows. */
export function RepositoryImportHeader() {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-50 dark:bg-zinc-950 border border-sky-200 dark:border-zinc-800 text-sky-600 dark:text-cyan-400 shrink-0"><FolderGit2 className="w-5 h-5" /></div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Migrate an existing workspace</h2>
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-cyan-500/10 text-sky-800 dark:text-cyan-400 border border-sky-300 dark:border-cyan-500/30">Advanced</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-zinc-300 mt-2 max-w-2xl leading-relaxed">Bring an existing Spec-Kit package or external repository architecture into a separate Studio workspace. For a local checkout you plan to deliver from, use Connected Workspace instead.</p>
      </div>
    </div>
  );
}
