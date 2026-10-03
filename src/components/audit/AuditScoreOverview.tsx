import React, { memo } from 'react';
import { SpecAuditResult } from '../../types/speckit';

interface AuditScoreOverviewProps {
  audit: SpecAuditResult;
}

export const AuditScoreOverview: React.FC<AuditScoreOverviewProps> = memo(({ audit }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
        <span className="text-zinc-400">Completeness</span>
        <div className="text-xl font-bold text-cyan-400">{audit.completenessScore}%</div>
        <p className="text-[10px] text-zinc-500">User stories & requirements coverage</p>
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
        <span className="text-zinc-400">Clarity & Unambiguity</span>
        <div className="text-xl font-bold text-indigo-400">{audit.clarityScore}%</div>
        <p className="text-[10px] text-zinc-500">Unambiguous language & criteria</p>
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
        <span className="text-zinc-400">Testability</span>
        <div className="text-xl font-bold text-emerald-400">{audit.testabilityScore}%</div>
        <p className="text-[10px] text-zinc-500">Given/When/Then verifiability</p>
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
        <span className="text-zinc-400">Traceability</span>
        <div className="text-xl font-bold text-purple-400">{audit.traceabilityScore}%</div>
        <p className="text-[10px] text-zinc-500">Requirements mapped to tasks</p>
      </div>
    </div>
  );
});

AuditScoreOverview.displayName = 'AuditScoreOverview';
