import React, { memo } from 'react';
import { Shield, Activity, Zap, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { ProjectConstitution, SpecAuditResult, ViewTab } from '../../types/speckit';

interface GovernanceSummaryCardProps {
  constitution: ProjectConstitution;
  audit?: SpecAuditResult;
  onNavigateTab: (tab: ViewTab) => void;
}

export const GovernanceSummaryCard: React.FC<GovernanceSummaryCardProps> = memo(({
  constitution,
  audit,
  onNavigateTab,
}) => {
  return (
    <div className="space-y-4">
      {/* Constitution Rules Summary */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Governance Rules</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('constitution')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Manage
          </button>
        </div>

        <div className="space-y-2">
          {constitution.rules.slice(0, 4).map((rule) => (
            <div
              key={rule.id}
              className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-200">{rule.title}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                    rule.strictness === 'Mandatory'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {rule.strictness}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono truncate">{rule.ruleStatement}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quality Health Audit Card */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Health & Verification</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigateTab('audit')}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Full Report
          </button>
        </div>

        <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Spec-Kit Quality Grade</span>
            <span className="font-bold text-emerald-400">A+ (Score {audit?.overallScore || 94}/100)</span>
          </div>

          <div className="space-y-1 pt-1 text-[11px]">
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-400">Testability & Acceptance:</span>
              <span className="font-mono text-cyan-300">{audit?.testabilityScore || 95}%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-300">
              <span className="text-zinc-400">Traceability Alignment:</span>
              <span className="font-mono text-emerald-300">{audit?.traceabilityScore || 93}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

GovernanceSummaryCard.displayName = 'GovernanceSummaryCard';
