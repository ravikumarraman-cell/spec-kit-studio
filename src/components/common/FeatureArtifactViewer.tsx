import React, { useMemo } from 'react';
import { CheckCircle2, FileText, Layers3, Sparkles } from 'lucide-react';

interface Props {
  content: string;
  artifactLabel: string;
  sourcePath?: string;
  acceptedAt?: string;
  reviewState?: 'pending' | 'accepted';
}

interface Section {
  title: string;
  body: string;
}

interface TechnicalEvidenceDigest {
  lineCount: number;
  fileReferences: string[];
  resourceCount: number;
  isTechnicalTranscript: boolean;
}

const MAX_VISIBLE_SECTION_CHARACTERS = 680;
const MAX_SUMMARY_CHARACTERS = 560;

function truncateAtBoundary(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  const boundary = normalized.lastIndexOf(' ', limit);
  return `${normalized.slice(0, boundary > limit * 0.6 ? boundary : limit).trim()}…`;
}

function sectionsFromMarkdown(content: string): Section[] {
  const chunks = content.trim().split(/^##\s+/m);
  return chunks.map((chunk, index) => {
    const [firstLine, ...rest] = chunk.split('\n');
    return { title: index === 0 ? 'Overview' : firstLine.replace(/^#+\s*/, '').trim(), body: index === 0 ? chunk : rest.join('\n') };
  }).filter((section) => section.body.trim());
}

function technicalEvidenceDigest(content: string): TechnicalEvidenceDigest {
  const lines = content.split('\n').filter((line) => line.trim());
  const fileReferences = [...new Set([...content.matchAll(/(?:^|\s)([\w./-]+\.(?:ts|tsx|js|jsx|py|tf|yaml|yml|json|md|sql))(?::\d+)?/g)].map((match) => match[1]))].slice(0, 8);
  const resourceCount = (content.match(/\b(?:resource|module|function|class|interface|data)\b/gi) || []).length;
  const lineReferences = (content.match(/\.[\w]+:\d+/g) || []).length;
  const codeLikeLines = lines.filter((line) => /\.[\w]+:\d+|\b(?:resource|module|function|const|data)\b|\{\s*$/.test(line)).length;
  return {
    lineCount: lines.length,
    fileReferences,
    resourceCount,
    isTechnicalTranscript: Boolean(content.length > 1_200 && (lineReferences > 8 || codeLikeLines / Math.max(lines.length, 1) > 0.28)),
  };
}

function renderBlock(line: string, index: number) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('### ')) return <h4 key={index} className="mt-4 font-bold text-zinc-100">{trimmed.slice(4)}</h4>;
  if (/^(?:[-*]|\d+\.)\s+/.test(trimmed)) return <li key={index} className="ml-4 text-zinc-300">{trimmed.replace(/^(?:[-*]|\d+\.)\s+/, '')}</li>;
  return <p key={index} className="text-zinc-300">{trimmed.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
}

/** Readable first, source-preserving second view for any generated feature artifact.
 * Pending artifacts are a review surface, not a dashboard teaser: no section
 * or source text is hidden from the reviewer. */
export function FeatureArtifactViewer({ content, artifactLabel, sourcePath, acceptedAt, reviewState = 'accepted' }: Props) {
  const sections = useMemo(() => sectionsFromMarkdown(content), [content]);
  const digest = useMemo(() => technicalEvidenceDigest(content), [content]);
  const summary = sections.find((section) => section.title.toLowerCase() === 'summary')?.body || sections[0]?.body || '';
  const readableSections = sections.filter((section) => section.title.toLowerCase() !== 'overview' && section.title.toLowerCase() !== 'summary');
  const summaryCopy = digest.isTechnicalTranscript
    ? `Studio retained ${digest.lineCount} lines of technical evidence${digest.fileReferences.length ? ` across ${digest.fileReferences.length}+ referenced files` : ''}. It is available for traceability, but is intentionally collapsed so it does not obscure the approval decision.`
    : truncateAtBoundary(summary.replace(/^#.*$/m, '').replace(/^\*\*.*?\*\*$/gm, '').trim(), MAX_SUMMARY_CHARACTERS);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const isThoroughReview = reviewState === 'pending';
  return <div className="mt-4 space-y-4">
    <div className="feature-artifact-summary overflow-hidden rounded-2xl border">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl"><div className={`flex items-center gap-2 text-xs font-bold ${reviewState === 'pending' ? 'text-cyan-300' : 'text-emerald-300'}`}><CheckCircle2 className="h-4 w-4" />{reviewState === 'pending' ? 'Review before approving' : 'Accepted feature design'}</div><p className="feature-artifact-summary-copy mt-3 text-sm leading-relaxed">{summaryCopy || `No plain-language summary was found in ${artifactLabel}. Inspect the retained source before approving.`}</p>{digest.isTechnicalTranscript && <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-100"><p className="font-bold">Technical evidence, not a decision brief</p><p className="mt-1 text-amber-200">Use the structured feature details above for the approval decision. Expand the retained source only when you need to trace a file or diagnostic.</p>{digest.fileReferences.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{digest.fileReferences.map((file) => <span key={file} className="feature-artifact-evidence-chip rounded px-1.5 py-1 font-mono text-[10px]">{file}</span>)}</div>}</div>}</div>
        <div className="grid grid-cols-2 gap-2 text-center text-[10px]"><div className="feature-artifact-summary-stat rounded-xl border p-3"><Layers3 className="mx-auto h-4 w-4 text-cyan-300" /><strong className="mt-1 block text-sm">{sections.length}</strong><span>sections</span></div><div className="feature-artifact-summary-stat rounded-xl border p-3"><FileText className="mx-auto h-4 w-4 text-violet-300" /><strong className="mt-1 block text-sm">{wordCount}</strong><span>words</span></div></div>
      </div>
      <div className="feature-artifact-summary-meta flex flex-wrap gap-x-4 gap-y-1 border-t px-5 py-2 text-[10px]"><span>{sourcePath || artifactLabel}</span>{acceptedAt && <span>{reviewState === 'pending' ? 'Ready for approval' : `Accepted ${new Date(acceptedAt).toLocaleDateString()}`}</span>}</div>
    </div>
    {!digest.isTechnicalTranscript && <div className="grid gap-3 lg:grid-cols-2">
      {readableSections.map((section) => <article key={section.title} className="group rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition-colors hover:border-cyan-400/25">
        <div className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-cyan-300" /><h3 className="text-sm font-bold text-zinc-100">{section.title}</h3></div>
        <div className="mt-3 space-y-2 text-xs leading-relaxed">{(isThoroughReview ? section.body : truncateAtBoundary(section.body, MAX_VISIBLE_SECTION_CHARACTERS)).split('\n').map(renderBlock)}</div>
      </article>)}
    </div>}
    <details open={isThoroughReview} className="feature-artifact-source rounded-xl border p-3 text-xs">
      <summary className="feature-artifact-source__summary cursor-pointer font-bold">Inspect retained {artifactLabel} source <span className="ml-1 font-normal">· {digest.lineCount} lines · {wordCount} words</span></summary>
      <pre className={`feature-artifact-source__content mt-3 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-[10px] leading-relaxed ${isThoroughReview ? '' : 'max-h-72'}`}>{content}</pre>
    </details>
  </div>;
}
