import { useRef, useState } from 'react';
import { FileText, Paperclip, Trash2 } from 'lucide-react';
import type { GovernanceSourceDocument } from '../../types/speckit';

const ACCEPTED_EXTENSIONS = /\.(?:md|txt|json|ya?ml)$/i;
const MAX_DOCUMENTS = 12;
const MAX_DOCUMENT_BYTES = 256_000;
const MAX_TOTAL_BYTES = 1_000_000;

interface Props {
  sources: GovernanceSourceDocument[];
  onChange: (sources: GovernanceSourceDocument[]) => void;
}

/** Local-only source library. Files are constrained to readable text formats
 * and become read-only context only for an explicitly approved agent run. */
export function GovernanceSourceLibrary({ sources, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const candidates = Array.from(files);
    if (sources.length + candidates.length > MAX_DOCUMENTS) { setError(`Keep up to ${MAX_DOCUMENTS} governance sources.`); return; }
    if (candidates.some((file) => !ACCEPTED_EXTENSIONS.test(file.name))) { setError('Upload readable .md, .txt, .json, .yaml, or .yml files only.'); return; }
    if (candidates.some((file) => file.size > MAX_DOCUMENT_BYTES)) { setError('Each governance source must be 250 KB or smaller.'); return; }
    if (sources.reduce((total, source) => total + source.size, 0) + candidates.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES) { setError('Keep all retained governance sources within 1 MB.'); return; }
    try {
      const uploadedAt = new Date().toISOString();
      const next = await Promise.all(candidates.map(async (file, index) => ({ id: `GOV-${Date.now()}-${index}-${file.name.replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}`, name: file.name, mediaType: file.type || 'text/plain', size: file.size, content: await file.text(), uploadedAt })));
      onChange([...sources, ...next]);
      setError(null);
    } catch { setError('Studio could not read one of the selected governance sources.'); }
  };
  return <section className="rounded-2xl border border-violet-400/30 bg-violet-500/5 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Governance source library</p><h3 className="mt-1 text-sm font-bold text-zinc-100">Boundary documents behind this constitution</h3><p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">Retain architecture, security, compliance, and operating-policy sources for review. On an explicitly approved agent run, Studio gives the agent a temporary read-only library and requires it to read every document. Keep enforceable rules explicit in the constitution.</p></div><button type="button" onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-violet-300/45 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/10"><Paperclip className="h-3.5 w-3.5" />Add documents</button><input ref={inputRef} type="file" multiple accept=".md,.txt,.json,.yaml,.yml,text/plain,text/markdown,application/json" className="sr-only" onChange={(event) => { void upload(event.target.files); event.currentTarget.value = ''; }} /></div>{error && <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</p>}{sources.length ? <div className="mt-4 space-y-2">{sources.map((source) => <details key={source.id} className="rounded-xl border border-zinc-800 bg-zinc-950/55 p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-bold text-zinc-200"><FileText className="h-4 w-4 text-violet-300" /><span className="min-w-0 flex-1 truncate">{source.name}</span><span className="font-normal text-zinc-500">{Math.ceil(source.size / 1024)} KB</span></summary><div className="mt-3 border-t border-zinc-800 pt-3"><pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-900 p-3 text-[11px] leading-relaxed text-zinc-300">{source.content}</pre><button type="button" onClick={() => onChange(sources.filter((candidate) => candidate.id !== source.id))} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-rose-200 hover:text-rose-100"><Trash2 className="h-3.5 w-3.5" />Remove source</button></div></details>)}</div> : <p className="mt-4 rounded-lg border border-dashed border-zinc-700 p-3 text-xs text-zinc-500">No boundary documents retained yet. Add only the documents reviewers need to trace a rule.</p>}<p className="mt-3 text-[11px] text-zinc-500">Up to {MAX_DOCUMENTS} text documents · 250 KB each · 1 MB total · saved only when you save this constitution.</p></section>;
}
