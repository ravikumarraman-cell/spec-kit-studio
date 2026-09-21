import React, { useMemo, useState } from 'react';
import { Code2, FileCode2, FileWarning } from 'lucide-react';
import { FeatureImplementationReceipt } from '../../types/speckit';
import { configuredConnectorClient, FeatureCodePreview } from '../../lib/connector';

interface Props {
  repositoryPath?: string;
  receipts: FeatureImplementationReceipt[];
}

const codePath = (file: string) => /\.(py|[cm]?[jt]sx?|go|java|cs|rb|php|rs|kt|kts|scala|sh|sql|html|css|scss|vue|svelte|tf|bicep)$/i.test(file)
  && !/(^|\/)(\.specify|specs?|docs?)(\/|$)/i.test(file);

const areaFor = (file: string) => {
  if (/(^|\/)(test|tests|__tests__)(\/|$)|\.(test|spec)\./i.test(file)) return 'Tests';
  if (/(^|\/)(frontend|web|ui|client)(\/|$)/i.test(file)) return 'Frontend';
  if (/(^|\/)(backend|api|server|services)(\/|$)/i.test(file)) return 'Backend';
  if (/(^|\/)(infra|terraform|bicep|deploy)(\/|$)/i.test(file)) return 'Infrastructure';
  return 'Application';
};

export function FeatureCodeChanges({ repositoryPath, receipts }: Props) {
  const paths = useMemo(() => [...new Set(receipts.flatMap((receipt) => receipt.changedFiles).filter(codePath))], [receipts]);
  const [files, setFiles] = useState<FeatureCodePreview[]>([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [mode, setMode] = useState<'diff' | 'source'>('diff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState(false);

  const load = async () => {
    if (!repositoryPath || !paths.length) return;
    setLoading(true); setError('');
    try {
      const client = configuredConnectorClient();
      const result = await client.readFeatureCode(repositoryPath, paths);
      setFiles(result.files);
      setSelectedPath((current) => result.files.some((file) => file.path === current) ? current : result.files[0]?.path || '');
      if (result.omitted > 0) setError(`${result.omitted} non-code, deleted, or no-longer-changed file${result.omitted === 1 ? ' was' : 's were'} omitted for safety.`);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Studio could not load the feature code changes.');
    } finally { setLoading(false); }
  };

  const open = () => { setOpened(true); if (!files.length) void load(); };
  const selected = files.find((file) => file.path === selectedPath);
  const grouped = useMemo(() => files.reduce<Record<string, FeatureCodePreview[]>>((groups, file) => {
    const area = areaFor(file.path); (groups[area] ||= []).push(file); return groups;
  }, {}), [files]);

  return (
    <section className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/[0.08] via-zinc-950 to-violet-500/[0.06] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3"><div className="rounded-xl bg-cyan-400/10 p-2.5"><Code2 className="h-5 w-5 text-cyan-200" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">Feature implementation</p><h3 className="mt-1 text-sm font-bold text-zinc-100">Code changes</h3><p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">Application code only. Planning artifacts, manifests, and other workspace context stay out of this view by default.</p></div></div>
        <button type="button" onClick={open} disabled={!repositoryPath || !paths.length || loading} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"><FileCode2 className="h-3.5 w-3.5" />{loading ? 'Loading code…' : opened ? 'Refresh code' : `View ${paths.length} code file${paths.length === 1 ? '' : 's'}`}</button>
      </div>
      {!paths.length && <p className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">No recorded application-code files are available yet. Record the completed task evidence first; spec and planning files intentionally do not appear here.</p>}
      {error && <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-400/5 p-3 text-xs text-amber-100">{error}</p>}
      {opened && files.length > 0 && <div className="mt-4 grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="max-h-[430px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/70 p-2">
          {Object.entries(grouped).map(([area, areaFiles]) => <div key={area} className="mb-3 last:mb-0"><p className="px-2 pb-1 text-[10px] font-black uppercase tracking-wider text-zinc-500">{area}</p>{areaFiles.map((file) => <button key={file.path} type="button" onClick={() => setSelectedPath(file.path)} className={`mb-1 w-full rounded-lg px-2 py-2 text-left text-[11px] transition ${selectedPath === file.path ? 'bg-cyan-400/15 text-cyan-100' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}><span className="block truncate font-mono">{file.path}</span><span className="mt-1 block text-[10px] text-zinc-500">{file.status === '??' ? 'New file' : file.status === 'binary' ? 'Binary file' : 'Modified'}</span></button>)}</div>)}
        </aside>
        <div className="min-w-0 rounded-xl border border-zinc-800 bg-zinc-950/80">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-2"><p className="truncate font-mono text-xs font-semibold text-zinc-200">{selected?.path || 'Choose a file'}</p><div className="flex rounded-lg border border-zinc-800 p-0.5 text-[10px]">{(['diff', 'source'] as const).map((view) => <button key={view} type="button" onClick={() => setMode(view)} className={`rounded-md px-2 py-1 font-bold capitalize ${mode === view ? 'bg-cyan-400/15 text-cyan-100' : 'text-zinc-500 hover:text-zinc-300'}`}>{view}</button>)}</div></div>
          {selected?.truncated && <p className="border-b border-amber-300/15 bg-amber-400/5 px-3 py-2 text-[10px] text-amber-100">Preview is limited to the first 160 KB. Open the file in your editor for the complete source.</p>}
          <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed text-zinc-300">{selected ? (mode === 'diff' ? selected.patch || 'This is a new or untracked file; use Source to view its captured contents.' : selected.content || 'Binary or deleted files do not have a source preview.') : ''}</pre>
        </div>
      </div>}
      {opened && files.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500"><FileWarning className="h-3 w-3" />Text previews are read-only and redact common credential patterns. They never commit, stage, or send source code away from your local connector.</p>}
    </section>
  );
}
