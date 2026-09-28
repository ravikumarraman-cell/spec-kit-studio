import { FolderGit2, Search } from 'lucide-react';

interface Props { workspaceName: string; repositoryName?: string; connectorLabel: string; onOpenSearch: () => void; }

export function WorkspaceCommandBar({ workspaceName, repositoryName, connectorLabel, onOpenSearch }: Props) {
  const ready = connectorLabel === 'Connector ready' || connectorLabel === 'Repository ready';
  return <header className="workspace-hub-command flex flex-col gap-3 rounded-2xl border px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0"><p className="workspace-hub-eyebrow text-[10px] font-black uppercase tracking-[0.16em]">Workspace Hub</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="workspace-hub-title truncate text-lg font-bold">{workspaceName}</h1>{repositoryName && <span className="workspace-hub-muted inline-flex items-center gap-1 text-xs"><FolderGit2 className="h-3.5 w-3.5" />{repositoryName}</span>}<span className={`workspace-hub-chip rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ready ? 'workspace-hub-chip--ready' : 'workspace-hub-chip--attention'}`}>{connectorLabel}</span></div></div>
    <button type="button" onClick={onOpenSearch} className="workspace-hub-button workspace-hub-button--secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold"><Search className="h-4 w-4" />Search workspace</button>
  </header>;
}
