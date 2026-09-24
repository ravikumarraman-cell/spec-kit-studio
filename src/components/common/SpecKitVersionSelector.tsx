import React, { useState } from 'react';
import { ChevronDown, Sparkles, Check, Info, ShieldCheck, Cpu } from 'lucide-react';

export interface SpecKitVersionOption {
  version: string;
  releaseTag: string;
  label: string;
  isLatest?: boolean;
  releaseDate: string;
  summary: string;
  features: string[];
}

export const AVAILABLE_SPECKIT_VERSIONS: SpecKitVersionOption[] = [
  {
    version: '1.0.11',
    releaseTag: 'v1.0.11',
    label: 'v1.0.11 (Strict conformance target)',
    isLatest: true,
    releaseDate: 'Sep 24, 2026',
    summary: 'Current official SDD workflow with specify, implement, and convergence gates',
    features: [
      'Official numbered feature branches and templates',
      'Specify → Plan → Tasks → Implement → Converge',
      'Clarify, checklist, and analyze quality gates',
      'Single-story features remain independently testable',
    ],
  },
  {
    version: '1.0.7',
    releaseTag: 'v1.0.7',
    label: 'v1.0.7 (Legacy)',
    releaseDate: 'Sep 15, 2026',
    summary: 'Full SDD Engine with DocGuard CDD, MAQA v0.3.1, PDaC, and Extension Catalogs',
    features: [
      'DocGuard v0.34.9 CDD Enforcement Extension',
      'MAQA v0.3.1 Multi-Agent & QA Extension',
      'Product Definition as Code (PDaC) Preset',
      'Preset & Extension Catalog Introspection',
      'Secure Development Assurance Governance',
      '5-Stage SDD (Constitution → Spec → Plan → Tasks → Implement)'
    ],
  },
  {
    version: '1.0.6',
    releaseTag: 'v1.0.6',
    label: 'v1.0.6 (Previous Release)',
    releaseDate: 'Aug 28, 2026',
    summary: 'Stable specify-cli with Taskstoissues & Bob runner integration',
    features: [
      'specify-cli standalone runner',
      'Task-to-Issue dispatch workflows',
      'Lean Workflow preset',
      'Constitution sync support'
    ],
  },
  {
    version: '1.0.0',
    releaseTag: 'v1.0.0',
    label: 'v1.0.0 (Core Major)',
    releaseDate: 'Jun 12, 2026',
    summary: 'Initial major 4-Pillar Spec-Driven Development release',
    features: [
      '4-Pillar Markdown Schemas (spec, plan, tasks, constitution)',
      'Basic specify.sh bash execution scripts',
      'Rule strictness levels (Mandatory vs Recommended)'
    ],
  },
  {
    version: '0.14.0',
    releaseTag: 'v0.14.0',
    label: 'v0.14.0 (Legacy Preview)',
    releaseDate: 'Apr 02, 2026',
    summary: 'Early preview release of specify CLI tool',
    features: [
      'Initial specify command structure',
      'Basic project constitution templates'
    ],
  },
];

interface SpecKitVersionSelectorProps {
  currentVersion: string;
  onSelectVersion: (version: string) => void;
  variant?: 'compact' | 'full';
}

export const SpecKitVersionSelector: React.FC<SpecKitVersionSelectorProps> = ({
  currentVersion,
  onSelectVersion,
  variant = 'compact',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const activeOption =
    AVAILABLE_SPECKIT_VERSIONS.find((v) => v.version === currentVersion) || AVAILABLE_SPECKIT_VERSIONS[0];

  if (variant === 'compact') {
    return (
      <div className="relative inline-block text-left select-none">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-all group"
          title="Select Spec-Kit Engine Version"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
          <span className="font-mono">{activeOption.releaseTag}</span>
          {activeOption.isLatest && (
            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-300 hidden sm:inline">
              Latest
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-indigo-400" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 sm:left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl py-2 z-50 text-xs space-y-1">
              <div className="px-3 py-1.5 border-b border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Spec-Kit Engine Versions
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">Default: v1.0.11</span>
              </div>

              <div className="max-h-64 overflow-y-auto px-1 space-y-1">
                {AVAILABLE_SPECKIT_VERSIONS.map((ver) => {
                  const isSelected = ver.version === activeOption.version;
                  return (
                    <button
                      key={ver.version}
                      onClick={() => {
                        onSelectVersion(ver.version);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-200'
                          : 'hover:bg-zinc-800/80 text-zinc-300 border border-transparent'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-zinc-100">{ver.releaseTag}</span>
                          {ver.isLatest && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Latest & Greatest
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500">{ver.releaseDate}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-1">{ver.summary}</p>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 p-5 md:p-6 space-y-5 shadow-xs dark:shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800/80 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-600 dark:text-cyan-400" />
            <h3 className="text-base font-extrabold text-slate-900 dark:text-zinc-100">Spec-Kit Engine & Version Selector</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 border border-sky-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 font-mono">
              Active: {activeOption.releaseTag}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Strict story delivery targets Spec-Kit v1.0.11. Older versions remain selectable for legacy workspaces.
          </p>
        </div>

        {/* Dropdown Selector */}
        <div className="relative shrink-0">
          <select
            value={activeOption.version}
            onChange={(e) => onSelectVersion(e.target.value)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-sky-500 cursor-pointer shadow-xs"
          >
            {AVAILABLE_SPECKIT_VERSIONS.map((v) => (
              <option key={v.version} value={v.version}>
                {v.label} ({v.releaseDate})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Feature Matrix for Selected Version */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-900 dark:text-zinc-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Key Capabilities in {activeOption.releaseTag}</span>
          </span>
          <span className="text-slate-500 dark:text-zinc-400 text-[11px] font-semibold">Released {activeOption.releaseDate}</span>
        </div>

        <p className="text-xs text-slate-800 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800/60 leading-relaxed font-medium">
          {activeOption.summary}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {activeOption.features.map((feat, idx) => (
            <div
              key={idx}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 flex items-start gap-2 text-xs text-slate-800 dark:text-zinc-300 min-w-0 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400 shrink-0 mt-0.5" />
              <span className="break-words line-clamp-2">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
