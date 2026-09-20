import React, { useMemo } from 'react';
import { CheckCircle2, FileText, Layers3, Sparkles } from 'lucide-react';

interface Props {
  content: string;
  artifactLabel: string;
  sourcePath?: string;
  acceptedAt?: string;
}

interface Section {
  title: string;
  body: string;
}

function sectionsFromMarkdown(content: string): Section[] {
  const chunks = content.trim().split(/^##\s+/m);
  return chunks.map((chunk, index) => {
    const [firstLine, ...rest] = chunk.split('\n');
    return { title: index === 0 ? 'Overview' : firstLine.replace(/^#+\s*/, '').trim(), body: index === 0 ? chunk : rest.join('\n') };
  }).filter((section) => section.body.trim());
}

function renderBlock(line: string, index: number) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('### ')) return <h4 key={index} className="mt-4 font-bold text-zinc-100">{trimmed.slice(4)}</h4>;
  if (/^(?:[-*]|\d+\.)\s+/.test(trimmed)) return <li key={index} className="ml-4 text-zinc-300">{trimmed.replace(/^(?:[-*]|\d+\.)\s+/, '')}</li>;
  return <p key={index} className="text-zinc-300">{trimmed.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
}

/** Readable first, source-preserving second view for any generated feature artifact. */
export function FeatureArtifactViewer({ content, artifactLabel, sourcePath, acceptedAt }: Props) {
  const sections = useMemo(() => sectionsFromMarkdown(content), [content]);
  const summary = sections.find((section) => section.title.toLowerCase() === 'summary')?.body || sections[0]?.body || '';
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return <div className="mt-4 space-y-4">
    <div className="overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 via-zinc-950/80 to-violet-500/10">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl"><div className="flex items-center gap-2 text-xs font-bold text-emerald-300"><CheckCircle2 className="h-4 w-4" />Accepted feature design</div><p className="mt-3 text-sm leading-relaxed text-zinc-200">{summary.replace(/^#.*$/m, '').replace(/^\*\*.*?\*\*$/gm, '').trim()}</p></div>
        <div className="grid grid-cols-2 gap-2 text-center text-[10px]"><div className="rounded-xl border border-white/10 bg-zinc-950/50 p-3"><Layers3 className="mx-auto h-4 w-4 text-cyan-300" /><strong className="mt-1 block text-sm text-zinc-100">{sections.length}</strong><span className="text-zinc-500">sections</span></div><div className="rounded-xl border border-white/10 bg-zinc-950/50 p-3"><FileText className="mx-auto h-4 w-4 text-violet-300" /><strong className="mt-1 block text-sm text-zinc-100">{wordCount}</strong><span className="text-zinc-500">words</span></div></div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-white/10 bg-zinc-950/35 px-5 py-2 text-[10px] text-zinc-500"><span>{sourcePath || artifactLabel}</span>{acceptedAt && <span>Accepted {new Date(acceptedAt).toLocaleDateString()}</span>}</div>
    </div>
    <div className="grid gap-3 lg:grid-cols-2">
      {sections.filter((section) => section.title.toLowerCase() !== 'overview' && section.title.toLowerCase() !== 'summary').map((section) => <article key={section.title} className="group rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition-colors hover:border-cyan-400/25">
        <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /><h3 className="text-sm font-bold text-zinc-100">{section.title}</h3></div>
        <div className="mt-3 space-y-2 text-xs leading-relaxed">{section.body.split('\n').map(renderBlock)}</div>
      </article>)}
    </div>
    <details className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3 text-xs">
      <summary className="cursor-pointer font-bold text-zinc-300">View {artifactLabel} source</summary>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-[10px] leading-relaxed text-zinc-400">{content}</pre>
    </details>
  </div>;
}
