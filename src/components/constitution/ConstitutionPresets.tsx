import React, { memo } from 'react';
import { Sparkles, ShieldCheck, Zap, Layers } from 'lucide-react';
import { ConstitutionRule } from '../../types/speckit';

interface ConstitutionPresetsProps {
  onApplyPreset: (presetName: string) => void;
}

export const ConstitutionPresets: React.FC<ConstitutionPresetsProps> = memo(({ onApplyPreset }) => {
  return (
    <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 text-xs">
      <div className="flex items-center gap-1.5 font-bold text-zinc-300">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>Pre-Configured Governance Presets</span>
      </div>
      <p className="text-[11px] text-zinc-400">
        Instantly append industry-standard rules for zero-leakage security, extreme performance, or clean modular architecture:
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onApplyPreset('security')}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 text-xs transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          <span>Security & Zero-Leakage</span>
        </button>

        <button
          type="button"
          onClick={() => onApplyPreset('typescript')}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 text-xs transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Strict TypeScript & Perf</span>
        </button>

        <button
          type="button"
          onClick={() => onApplyPreset('modular')}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1.5 text-xs transition-colors"
        >
          <Layers className="w-3.5 h-3.5 text-purple-400" />
          <span>Modular & Componentized</span>
        </button>
      </div>
    </div>
  );
});

ConstitutionPresets.displayName = 'ConstitutionPresets';
