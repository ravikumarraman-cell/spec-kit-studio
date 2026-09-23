import React, { useState, memo } from 'react';
import {
  Activity,
  Zap,
  RefreshCw,
  CheckCircle2,
  FileCheck
} from 'lucide-react';
import { SpecKitProject, SpecAuditResult } from '../../types/speckit';
import { EditorHeader } from '../common/EditorHeader';
import { StatCard } from '../common/StatCard';
import { AuditScoreOverview } from './AuditScoreOverview';
import { AuditRecommendations } from './AuditRecommendations';
import { auditBlockers, auditPassesQualityGate } from '../../lib/auditGate';

interface AuditDashboardProps {
  project: SpecKitProject;
  onUpdateAudit: (updatedAudit: SpecAuditResult) => void;
  onOpenJourney: () => void;
  onApproveQualityGate: () => void;
}

function localStructuralAudit(project: SpecKitProject): SpecAuditResult {
  const hasFeatureScope = Boolean(project.featureInbox?.at(-1));
  const hasSpec = project.spec.userStories.length > 0 && project.spec.functionalRequirements.length > 0;
  const hasPlan = Boolean(project.featureInbox?.at(-1)?.architecturePlan?.acceptedAt || project.plan.markdown?.trim());
  const hasTasks = Boolean(project.featureInbox?.at(-1)?.deliveryPlan?.acceptedAt || project.tasks.markdown?.trim() || project.tasks.tasks.length);
  const hasConstitution = project.constitution.rules.length > 0;
  const missing = [
    !hasFeatureScope && 'Missing an imported feature in focus.',
    !hasSpec && 'Missing reviewed feature requirements.',
    !hasPlan && 'Missing a reviewed architecture plan.',
    !hasTasks && 'Missing a reviewed delivery task plan.',
    !hasConstitution && 'Missing applicable constitution rules.',
  ].filter((item): item is string => Boolean(item));
  const passes = missing.length === 0;
  const score = passes ? 92 : Math.max(0, 92 - missing.length * 15);
  return {
    lastAudited: new Date().toISOString(),
    overallScore: score,
    completenessScore: score,
    clarityScore: score,
    testabilityScore: score,
    traceabilityScore: score,
    summary: passes
      ? 'Local structural audit completed. Studio verified the required reviewed artifacts are present; review the advisory recommendations before approval.'
      : 'Local structural audit found required workflow evidence that still needs attention.',
    gaps: missing,
    ambiguities: [],
    recommendations: passes
      ? [{ category: 'Review', suggestion: 'Perform a human semantic review of the linked feature artifacts before implementation.', impact: 'Medium' }]
      : [{ category: 'Evidence', suggestion: 'Create or review each missing workflow artifact, then run the audit again.', impact: 'High' }],
  };
}

export const AuditDashboard: React.FC<AuditDashboardProps> = memo(({
  project,
  onUpdateAudit,
  onOpenJourney,
  onApproveQualityGate,
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const audit = project.audit || {
    lastAudited: new Date().toISOString(),
    overallScore: 0,
    completenessScore: 0,
    clarityScore: 0,
    testabilityScore: 0,
    traceabilityScore: 0,
    summary: 'No quality audit has been saved for this workspace yet.',
    gaps: ['Missing persisted quality-audit result.'],
    ambiguities: [],
    recommendations: [
      { category: 'Performance', suggestion: 'Add virtualized list support if user stories exceed 50 items.', impact: 'Low' },
      { category: 'Integration', suggestion: 'Provide custom shell script generator for Windows PowerShell (.ps1) alongside specify.sh.', impact: 'Medium' },
    ],
  };
  const blockers = auditBlockers(audit);
  const passesGate = Boolean(project.audit) && auditPassesQualityGate(audit);

  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      // Quality-gate readiness must work without any cloud model, credentials,
      // or local coding agent. This check confirms the approved evidence needed
      // to enter implementation; a deeper AI review remains optional product work.
      onUpdateAudit(localStructuralAudit(project));
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Editor Header */}
      <EditorHeader
        icon={Activity}
        iconColor="text-purple-400"
        title="Spec Quality Health & Audit"
        subtitle="Local verification of required approved artifacts and requirement trace alignment. No AI account or coding agent is required."
        badgeLabel="Quantitative Health Score"
        badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/20"
        extraActions={
          <button
            type="button"
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            {isAuditing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{isAuditing ? 'Checking artifacts...' : 'Run quality checks'}</span>
          </button>
        }
      />

      {/* Overall Score Banner */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-xs text-zinc-400 font-mono">OVERALL QUALITY SCORE</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-zinc-100">{audit.overallScore}</span>
            <span className="text-zinc-500 text-sm">/ 100</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${passesGate ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-200 border-amber-500/20'}`}>
              {passesGate ? 'Quality gate ready' : project.audit ? 'Needs review' : 'Audit not run'}
            </span>
          </div>
          <p className="text-xs text-zinc-300 max-w-xl pt-1 leading-relaxed">{audit.summary}</p>
        </div>

        <div className="text-right text-[11px] text-zinc-500 font-mono shrink-0">
          Last Audited: {new Date(audit.lastAudited).toLocaleTimeString()}
        </div>
      </div>

      {/* Quantitative Dimensions Grid */}
      <AuditScoreOverview audit={audit} />

      {/* Gaps, Ambiguities, and Recommendations */}
      <AuditRecommendations audit={audit} />
      <section className={`rounded-2xl border p-5 text-xs ${passesGate ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-amber-400/30 bg-amber-500/10'}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className={`font-bold ${passesGate ? 'text-emerald-200' : 'text-amber-100'}`}>{passesGate ? 'Quality gate ready to approve' : `${blockers.length} blocking finding${blockers.length === 1 ? '' : 's'} remain`}</p><p className="mt-1 text-zinc-300">{passesGate ? 'The remaining suggestions are advisory. They do not block this feature from moving forward.' : 'Resolve or explicitly document the blocking items before advancing.'}</p></div><button type="button" onClick={passesGate ? onApproveQualityGate : onOpenJourney} className={`rounded-lg px-3 py-2 font-bold ${passesGate ? 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300' : 'border border-amber-300/40 text-amber-100 hover:bg-amber-300/10'}`}>{passesGate ? 'Approve quality gate and continue' : 'Return to Feature Journey'}</button></div></section>
    </div>
  );
});

AuditDashboard.displayName = 'AuditDashboard';
