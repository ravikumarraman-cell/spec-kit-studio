import React, { memo } from 'react';
import { Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react';
import { SpecAuditResult } from '../../types/speckit';

interface AuditRecommendationsProps {
  audit: SpecAuditResult;
}

export const AuditRecommendations: React.FC<AuditRecommendationsProps> = memo(({ audit }) => {
  return (
    <div className="space-y-4">
      {/* Gaps and Ambiguities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Identified Spec Gaps</span>
          </div>
          {audit.gaps && audit.gaps.length > 0 ? (
            <ul className="space-y-1.5 list-disc list-inside text-zinc-300">
              {audit.gaps.map((gap, i) => (
                <li key={i}>{gap}</li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500">Zero specification gaps detected.</p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-rose-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Ambiguities & Conflicts</span>
          </div>
          {audit.ambiguities && audit.ambiguities.length > 0 ? (
            <ul className="space-y-1.5 list-disc list-inside text-zinc-300">
              {audit.ambiguities.map((amb, i) => (
                <li key={i}>{amb}</li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500">Zero architectural ambiguities detected.</p>
          )}
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 text-xs">
        <h3 className="font-bold text-zinc-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Actionable Improvement Recommendations</span>
        </h3>

        <div className="space-y-2">
          {audit.recommendations.map((rec, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-semibold uppercase">
                  {rec.category}
                </span>
                <p className="text-zinc-200 mt-1 leading-snug">{rec.suggestion}</p>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                  rec.impact === 'High'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : rec.impact === 'Medium'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }`}
              >
                {rec.impact} Impact
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

AuditRecommendations.displayName = 'AuditRecommendations';
