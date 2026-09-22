import React, { useState, memo } from 'react';
import {
  Terminal,
  Download,
  Archive,
  CheckCircle2,
  Copy,
  Check,
  FileCode,
  Folder,
  Layers,
  Sparkles
} from 'lucide-react';
import { SpecKitProject } from '../../types/speckit';
import { generateFeaturePackageZip, generateSpecKitZip, downloadBlob } from '../../lib/export';
import { EditorHeader } from '../common/EditorHeader';
import { useClipboard } from '../../hooks/useClipboard';
import { ActionErrorNotice } from '../common/ActionErrorNotice';
import { userFacingActionError } from '../../lib/workflowUx';

interface CliExporterProps {
  project: SpecKitProject;
}

export const CliExporter: React.FC<CliExporterProps> = memo(({ project }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const { copied: isCopiedCommand, copy: copyCommand } = useClipboard();

  const sanitizeName = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const handleDownloadZip = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      const blob = await generateSpecKitZip(project);
      downloadBlob(blob, `${sanitizeName}-spec-kit.zip`);
    } catch (err) {
      console.error('Failed to export zip:', err);
      setExportError(userFacingActionError('package this workspace', err, 'Couldn’t package this workspace. Try again after reviewing the project artifacts.'));
    } finally {
      setIsExporting(false);
    }
  };
  const activeFeature = project.featureInbox?.at(-1);
  const handleDownloadFeature = async () => {
    if (!activeFeature) return;
    try {
      setIsExporting(true); setExportError(null);
      const blob = await generateFeaturePackageZip(project, activeFeature);
      downloadBlob(blob, `${activeFeature.slug || sanitizeName}-feature-package.zip`);
    } catch (err) {
      setExportError(userFacingActionError('package this feature', err, 'Couldn’t package this feature. Try again after reviewing its artifacts.'));
    } finally { setIsExporting(false); }
  };

  const commandSnippet = `curl -O https://raw.githubusercontent.com/github/spec-kit/main/specify.sh
chmod +x specify.sh
./specify.sh init
./specify.sh check`;

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Editor Header */}
      <EditorHeader
        icon={Terminal}
        iconColor="text-emerald-400"
        title="CLI & Repository Bundler"
        subtitle="Export complete GitHub Spec-Kit file hierarchy with specify.sh CLI helper scripts and prompts."
        badgeLabel="100% Spec-Kit Parity"
        badgeColor="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        extraActions={<div className="flex flex-wrap gap-2"><button
            type="button"
            onClick={handleDownloadZip}
            disabled={isExporting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all shrink-0 disabled:opacity-50"
          >
            <Archive className="w-4 h-4" />
            <span>{isExporting ? 'Packaging ZIP...' : 'Download .spec-kit Repository (.zip)'}</span>
          </button>{activeFeature && <button type="button" onClick={handleDownloadFeature} disabled={isExporting} className="px-4 py-2 rounded-xl border border-cyan-400/35 bg-cyan-500/10 text-cyan-100 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"><Download className="w-4 h-4" />{isExporting ? 'Packaging…' : 'Download active feature package'}</button>}</div>}
      />

      <ActionErrorNotice message={exportError} onRetry={handleDownloadZip} retryLabel="Package again" />

      {activeFeature && <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/5 p-4 text-xs text-zinc-300"><p className="font-bold text-cyan-100">Portable active-feature handoff</p><p className="mt-1 text-zinc-400">The feature package contains only <code>specs/{activeFeature.slug || sanitizeName}/</code>: a manifest, linked specification, impact map, accepted plan/tasks, and implementation receipts. Download it, inspect it, then commit that folder on the feature branch.</p></div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1/3): Directory Hierarchy Tree */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 text-xs">
          <h3 className="font-bold text-zinc-100 flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-400" />
            <span>Generated Package Structure</span>
          </h3>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono space-y-2 text-zinc-300">
            <div className="font-bold text-cyan-400 flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-amber-400" />
              <span>{sanitizeName}/</span>
            </div>

            <div className="pl-4 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-zinc-400">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>.spec-kit/</span>
              </div>
              <div className="pl-5 text-zinc-500 text-[11px]">project.json</div>

              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>spec.md</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                <span>plan.md</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>tasks.md</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <FileCode className="w-3.5 h-3.5 text-rose-400" />
                <span>constitution.md</span>
              </div>

              <div className="flex items-center gap-1.5 text-zinc-400">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>prompts/</span>
              </div>
              <div className="pl-5 text-zinc-500 text-[11px] space-y-1">
                <div>task-101.md</div>
                <div>task-102.md</div>
                <div>master-agent-prompt.md</div>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>specify.sh</span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                <span>README.md</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
            <span className="font-bold text-zinc-200 block">Spec-Kit Standard Compliance</span>
            <p>
              Includes the complete portable standard files recognizable by the official{' '}
              <code className="text-cyan-300 font-mono">specify</code> command line tool.
            </p>
          </div>
        </div>

        {/* Right Column (2/3): CLI Usage & specify.sh instructions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 text-xs">
            <h3 className="font-bold text-zinc-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>spec-kit CLI Quickstart in Terminal</span>
            </h3>

            <p className="text-zinc-400 leading-relaxed">
              Run this in your target terminal or repo root to bootstrap the official GitHub
              Specification-Driven Development toolchain:
            </p>

            <div className="relative group">
              <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-cyan-300 text-xs overflow-x-auto leading-relaxed">
                {commandSnippet}
              </pre>

              <button
                type="button"
                onClick={() => copyCommand(commandSnippet)}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] flex items-center gap-1.5 transition-colors"
              >
                {isCopiedCommand ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{isCopiedCommand ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-bold text-zinc-200">Common specify.sh Workflow Commands:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <code className="font-mono text-cyan-400 font-bold block">./specify.sh check</code>
                  <p className="text-zinc-400 text-[11px]">
                    Validates cross-reference integrity between spec.md, plan.md, and tasks.md.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <code className="font-mono text-indigo-400 font-bold block">./specify.sh prompt TASK-101</code>
                  <p className="text-zinc-400 text-[11px]">
                    Outputs self-contained, fully constitution-grounded prompt for Cursor / Claude.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <code className="font-mono text-emerald-400 font-bold block">./specify.sh plan</code>
                  <p className="text-zinc-400 text-[11px]">
                    Outputs architecture diagram and technology stack decisions.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <code className="font-mono text-purple-400 font-bold block">./specify.sh sync</code>
                  <p className="text-zinc-400 text-[11px]">
                    Synchronizes local spec-kit updates back into your Git branch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CliExporter.displayName = 'CliExporter';
