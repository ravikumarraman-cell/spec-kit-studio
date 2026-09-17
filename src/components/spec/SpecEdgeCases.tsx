import React, { memo } from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface SpecEdgeCasesProps {
  successMetrics: string[];
  edgeCases: string[];
}

export const SpecEdgeCases: React.FC<SpecEdgeCasesProps> = memo(({ successMetrics, edgeCases }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
      {/* Success Metrics */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Success Metrics & Verification</span>
        </h4>
        <div className="space-y-1.5">
          {successMetrics && successMetrics.length > 0 ? (
            successMetrics.map((metric, i) => (
              <div key={i} className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-emerald-200">
                {metric}
              </div>
            ))
          ) : (
            <p className="text-zinc-500">No explicit metrics configured.</p>
          )}
        </div>
      </div>

      {/* Edge Cases */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Edge Cases & Risk Mitigation</span>
        </h4>
        <div className="space-y-1.5">
          {edgeCases && edgeCases.length > 0 ? (
            edgeCases.map((ec, i) => (
              <div key={i} className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 text-amber-200">
                {ec}
              </div>
            ))
          ) : (
            <p className="text-zinc-500">No edge cases configured.</p>
          )}
        </div>
      </div>
    </div>
  );
});

SpecEdgeCases.displayName = 'SpecEdgeCases';
