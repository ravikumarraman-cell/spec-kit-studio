import React, { memo, useMemo } from 'react';
import { Copy, Check, Download, FileCode } from 'lucide-react';
import { useClipboard } from '../../hooks/useClipboard';

interface MarkdownSourceViewProps {
  value: string;
  onChange?: (val: string) => void;
  fileName?: string;
  readOnly?: boolean;
  title?: string;
  subtitle?: string;
}

export const MarkdownSourceView: React.FC<MarkdownSourceViewProps> = memo(({
  value,
  onChange,
  fileName = 'document.md',
  readOnly = false,
  title = 'Raw Markdown Document Output',
  subtitle = 'Conforms to official GitHub spec-kit standard',
}) => {
  const { copied, copy } = useClipboard();

  const stats = useMemo(() => {
    const lines = value ? value.split('\n').length : 0;
    const words = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;
    const bytes = new Blob([value]).size;
    return { lines, words, bytes };
  }, [value]);

  const handleDownload = () => {
    const blob = new Blob([value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400 font-mono pb-2 border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-zinc-200">{title}</span>
          <span className="text-zinc-500">• {subtitle}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] text-zinc-500 flex items-center gap-2">
            <span>{stats.lines} lines</span>
            <span>•</span>
            <span>{stats.words} words</span>
            <span>•</span>
            <span>{(stats.bytes / 1024).toFixed(1)} KB</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => copy(value)}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1 text-[11px] font-medium transition-colors"
              title="Copy markdown to clipboard"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center gap-1 text-[11px] font-medium transition-colors"
              title="Download markdown file"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>Download</span>
            </button>
          </div>
        </div>
      </div>

      <textarea
        rows={22}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={`w-full p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500/50 leading-relaxed resize-y ${
          readOnly ? 'cursor-text' : ''
        }`}
        spellCheck={false}
      />
    </div>
  );
});

MarkdownSourceView.displayName = 'MarkdownSourceView';
