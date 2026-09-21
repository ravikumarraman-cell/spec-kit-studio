import React, { useRef } from 'react';
import { FileText, Github, RefreshCw, Sparkles, Upload, Zap, CheckCircle2 } from 'lucide-react';
import { featurePresets } from './featurePresets';

export type FeatureImportSource = 'text' | 'file' | 'github' | 'preset';

interface FeatureSourceInputProps {
  source: FeatureImportSource;
  title: string;
  content: string;
  githubUrl: string;
  isProcessing: boolean;
  actionLabel: string;
  onSourceChange: (source: FeatureImportSource) => void;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onGithubUrlChange: (url: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onPrimaryAction: () => void;
  onPresetSelect: (content: string, title: string) => void;
}

/**
 * Input-only portion of feature import. It deliberately owns no API or Engine
 * state: its parent decides what the primary action does and how failures are
 * reported, making this view reusable for both local Engine and Gemini flows.
 */
export function FeatureSourceInput({
  source,
  title,
  content,
  githubUrl,
  isProcessing,
  actionLabel,
  onSourceChange,
  onTitleChange,
  onContentChange,
  onGithubUrlChange,
  onFileSelect,
  onClearFile,
  onPrimaryAction,
  onPresetSelect,
}: FeatureSourceInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabClass = (tab: FeatureImportSource, activeClass = 'text-cyan-300') =>
    `flex-1 py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
      source === tab ? `bg-zinc-800 ${activeClass} shadow-xs` : 'text-zinc-400 hover:text-zinc-200'
    }`;

  return (
    <div className="space-y-5">
      <div className="p-1 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center text-xs">
        <button type="button" onClick={() => onSourceChange('text')} className={tabClass('text')}>
          <FileText className="w-4 h-4 text-cyan-400" />
          <span>Paste Text / PRD</span>
        </button>
        <button type="button" onClick={() => onSourceChange('file')} className={tabClass('file')}>
          <Upload className="w-4 h-4 text-purple-400" />
          <span>Upload Document</span>
        </button>
        <button type="button" onClick={() => onSourceChange('github')} className={tabClass('github')}>
          <Github className="w-4 h-4" />
          <span>GitHub Issue / URL</span>
        </button>
        <button type="button" onClick={() => onSourceChange('preset')} className={tabClass('preset', 'text-amber-300')}>
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Feature Presets</span>
        </button>
      </div>

      {source === 'text' && (
        <div className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-zinc-200">Feature Title (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Multi-Factor Authentication (MFA) & Passkeys"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
          <div className="space-y-1">
            <label className="block font-bold text-zinc-200">Feature Description, PRD Text, or Requirements</label>
            <textarea
              rows={8}
              placeholder="Paste your PRD text, Jira issue details, feature specifications, or user feedback here..."
              value={content}
              onChange={(event) => onContentChange(event.target.value)}
              className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-xs focus:outline-none focus:border-cyan-500/50 leading-relaxed"
            />
          </div>
          <PrimaryAction disabled={isProcessing || !content.trim()} isProcessing={isProcessing} label={actionLabel} onClick={onPrimaryAction} />
        </div>
      )}

      {source === 'file' && (
        <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs text-center flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400"><Upload className="w-6 h-6" /></div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-sm font-bold text-zinc-100">Upload Feature Document (.md, .txt, .json)</h3>
            <p className="text-zinc-400">Upload your feature spec, PRD document, or requirements file. Spec-Kit Studio will parse it and generate full user stories!</p>
          </div>
          <input type="file" ref={fileInputRef} onChange={onFileSelect} accept=".md,.txt,.json,.doc,.docx" className="hidden" />
          {content ? (
            <div className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /><span>File Loaded: {title}</span></span>
                <button type="button" onClick={onClearFile} className="text-zinc-500 hover:text-zinc-300">Clear</button>
              </div>
              <p className="text-zinc-400 font-mono text-[11px] line-clamp-3">{content}</p>
              <PrimaryAction disabled={isProcessing} isProcessing={isProcessing} label="Extract Stories & Spec-Kit from File" onClick={onPrimaryAction} compact />
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold flex items-center gap-2"><Upload className="w-4 h-4" /><span>Select Feature Document</span></button>
          )}
        </div>
      )}

      {source === 'github' && (
        <div className="p-6 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-4 text-xs">
          <div className="space-y-1"><label className="block font-bold text-zinc-100">GitHub Issue URL or Raw Issue Description</label><p className="text-zinc-400">Import feature user stories directly from a GitHub issue or PR description.</p></div>
          <input type="text" placeholder="https://github.com/owner/repo/issues/42" value={githubUrl} onChange={(event) => onGithubUrlChange(event.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none" />
          <div className="space-y-1"><label className="block font-bold text-zinc-200">GitHub Issue Body / Acceptance Criteria</label><textarea rows={5} placeholder="Paste issue body text or user stories from GitHub..." value={content} onChange={(event) => onContentChange(event.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none" /></div>
          <PrimaryAction disabled={isProcessing || !content.trim()} isProcessing={isProcessing} label="Extract User Stories from GitHub Issue" onClick={onPrimaryAction} compact />
        </div>
      )}

      {source === 'preset' && (
        <div className="space-y-3 text-xs">
          <div className="font-semibold text-zinc-400 uppercase tracking-wider">Select a Production Feature Blueprint</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featurePresets.map((preset) => (
              <div key={preset.title} className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-cyan-500/40 transition-all space-y-3 flex flex-col justify-between group">
                <div className="space-y-1.5"><div className="flex items-center justify-between"><span className="font-bold text-sm text-zinc-100 group-hover:text-cyan-300 transition-colors">{preset.title}</span><span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">{preset.category}</span></div><p className="text-zinc-400">{preset.summary}</p></div>
                <button type="button" onClick={() => onPresetSelect(preset.content, preset.title)} disabled={isProcessing} className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-2 transition-colors"><Sparkles className="w-3.5 h-3.5" /><span>Extract User Stories & Spec-Kit</span></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryAction({ disabled, isProcessing, label, onClick, compact = false }: { disabled: boolean; isProcessing: boolean; label: string; onClick: () => void; compact?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={compact ? 'w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50' : 'w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50'}>
      {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" /> : <Sparkles className="w-4 h-4" />}
      <span>{isProcessing ? 'AI Extracting User Stories & Spec-Kit...' : label}</span>
    </button>
  );
}
