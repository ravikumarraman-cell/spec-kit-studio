import React, { memo } from 'react';
import { FeatureSpec } from '../../types/speckit';

interface SpecGeneralInfoProps {
  spec: FeatureSpec;
  onChangeField: (field: keyof FeatureSpec, value: any) => void;
}

export const SpecGeneralInfo: React.FC<SpecGeneralInfoProps> = memo(({ spec, onChangeField }) => {
  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Specification Document Title
          </label>
          <input
            type="text"
            value={spec.title}
            onChange={(e) => onChangeField('title', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-medium focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Specification Identifier
          </label>
          <input
            type="text"
            value={spec.id}
            disabled
            className="w-full px-3 py-2 rounded-xl bg-zinc-950/50 border border-zinc-800 text-zinc-400 text-xs font-mono cursor-not-allowed"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1">
          Executive Summary & Problem Statement
        </label>
        <textarea
          rows={2}
          value={spec.summary}
          onChange={(e) => onChangeField('summary', e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs leading-relaxed focus:outline-none focus:border-cyan-500/50"
        />
      </div>
    </div>
  );
});

SpecGeneralInfo.displayName = 'SpecGeneralInfo';
