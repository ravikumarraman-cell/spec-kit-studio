import { FolderGit2 } from 'lucide-react';

interface Props { workspaceName: string; repositoryName?: string; statusLabel: string; statusDetail: string; }

export function WorkspaceCommandBar({ workspaceName, repositoryName, statusLabel, statusDetail }: Props) {
  const ready = statusLabel === 'Connector ready';
  return <header className="workspace-hub-command flex flex-col gap-3 rounded-2xl border px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0"><p className="workspace-hub-eyebrow text-[10px] font-black uppercase tracking-[0.16em]">Home</p><div className="mt-1 flex flex-wrap items-center gap-2"><h1 className="workspace-hub-title truncate text-lg font-bold">{workspaceName}</h1>{repositoryName && <span className="workspace-hub-muted inline-flex items-center gap-1 text-xs"><FolderGit2 className="h-3.5 w-3.5" />{repositoryName}</span>}</div></div>
    <div className="sm:text-right"><span className={`workspace-hub-chip inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ready ? 'workspace-hub-chip--ready' : 'workspace-hub-chip--attention'}`}>{statusLabel}</span><p className="workspace-hub-muted mt-1 text-[11px]">{statusDetail}</p></div>
  </header>;
}
