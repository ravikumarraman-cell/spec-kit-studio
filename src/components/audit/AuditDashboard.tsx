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
import { activeFeatureForProject } from '../../lib/featureJourney';
import { deliveryItemLabel, deliveryScope } from '../../lib/deliveryItems';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';

interface AuditDashboardProps {
  project: SpecKitProject;
  onUpdateAudit: (updatedAudit: SpecAuditResult) => void;
  onOpenJourney: () => void;
  onApproveQualityGate: () => void;
  onRestoreUnlinkedFeatureScope: () => string;
}

function localStructuralAudit(project: SpecKitProject): SpecAuditResult {
  const activeFeature = activeFeatureForProject(project);
  const hasFeatureScope = Boolean(activeFeature);
  const hasSpec = Boolean(activeFeature?.userStoryIds.length && activeFeature.requirementIds.length);
  const hasPlan = Boolean(activeFeature?.architecturePlan?.acceptedAt || project.plan.markdown?.trim());
  const hasTasks = Boolean(activeFeature?.deliveryPlan?.acceptedAt || project.tasks.markdown?.trim() || project.tasks.tasks.length);
  const hasConstitution = project.constitution.rules.length > 0;
  const missing = [
    !hasFeatureScope && 'Missing a delivery item in focus.',
    !hasSpec && 'Missing reviewed, scoped requirements.',
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
  onRestoreUnlinkedFeatureScope,
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditEvidenceOpen, setAuditEvidenceOpen] = useState(false);
  const [hasReviewedAudit, setHasReviewedAudit] = useState(false);
  const [scopeRestoreNotice, setScopeRestoreNotice] = useState<string | null>(null);
  const activeItem = activeFeatureForProject(project);
  const persistedAudit = activeItem && deliveryScope(activeItem) === 'user-story' ? activeItem.qualityAudit : activeItem?.qualityAudit || project.audit;
  const audit = persistedAudit || {
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
  const auditHasRun = Boolean(persistedAudit);
  const passesGate = auditHasRun && auditPassesQualityGate(audit);
  const scopeTraceabilityBlocked = blockers.some((blocker) => /reviewed, scoped (user stories|requirements)/i.test(blocker));

  // A new result is new evidence. Never carry a prior acknowledgement across
  // an audit refresh or a different delivery item.
  React.useEffect(() => {
    setHasReviewedAudit(false);
    setAuditEvidenceOpen(false);
  }, [activeItem?.id, audit.lastAudited]);

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
        title={`${activeItem ? deliveryItemLabel(activeItem) : 'Delivery'} Quality Health & Audit`}
        subtitle="Local verification of this delivery item's approved artifacts and requirement trace alignment. No AI account or coding agent is required."
        badgeLabel="Quantitative Health Score"
        badgeColor="bg-purple-500/10 text-purple-400 border-purple-500/20"
        extraActions={auditHasRun ? (
          <button
            type="button"
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
          >
            {isAuditing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{isAuditing ? 'Checking artifacts...' : 'Re-run quality checks'}</span>
          </button>
        ) : undefined}
      />

      {/* Overall Score Banner */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-xs text-zinc-400 font-mono">OVERALL QUALITY SCORE</div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-zinc-100">{audit.overallScore}</span>
            <span className="text-zinc-500 text-sm">/ 100</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${passesGate ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-200 border-amber-500/20'}`}>
              {passesGate ? 'Quality gate ready' : persistedAudit ? 'Needs review' : 'Audit not run'}
            </span>
          </div>
          <p className="text-xs text-zinc-300 max-w-xl pt-1 leading-relaxed">{audit.summary}</p>
        </div>

        <div className="text-right text-[11px] text-zinc-500 font-mono shrink-0">
          Last Audited: {new Date(audit.lastAudited).toLocaleTimeString()}
        </div>
      </div>

      <ProgressiveDisclosure className="journey-supporting-details rounded-2xl border p-1" tone={blockers.length ? 'context' : 'complete'} label="Audit evidence and recommendations" summary={blockers.length ? `${blockers.length} finding${blockers.length === 1 ? '' : 's'} to inspect` : 'show score dimensions and advisory guidance'} open={auditEvidenceOpen} onToggle={setAuditEvidenceOpen}>
        <div className="space-y-6 p-3">
          <AuditScoreOverview audit={audit} />
          <AuditRecommendations audit={audit} />
        </div>
      </ProgressiveDisclosure>
      <section className={`rounded-2xl border p-5 text-xs ${passesGate ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-amber-400/30 bg-amber-500/10'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`font-bold ${passesGate ? 'text-emerald-200' : 'text-amber-100'}`}>
              {passesGate
                ? 'Quality gate ready for your review'
                : !auditHasRun
                  ? 'One action is blocking progress: run quality checks'
                  : `${blockers.length} blocking finding${blockers.length === 1 ? '' : 's'} need attention`}
            </p>
            <p className="mt-1 text-zinc-300">
              {passesGate
                ? 'Review the audit, confirm your acknowledgement, and continue to implementation.'
                : !auditHasRun
                  ? 'No issue has been identified yet. Run the local check to see the real, feature-specific result.'
                  : 'The exact finding is shown below. Update the related approved artifact, then run this check again.'}
            </p>
            {auditHasRun && !passesGate && blockers.length > 0 && (
              <ul className="mt-3 max-w-2xl space-y-1 rounded-lg border border-amber-300/20 bg-zinc-950/20 px-3 py-2 text-amber-50">
                {blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}
              </ul>
            )}
            {passesGate && <label className="mt-3 flex max-w-2xl cursor-pointer items-start gap-2 text-zinc-200"><input type="checkbox" checked={hasReviewedAudit} onChange={(event) => setHasReviewedAudit(event.target.checked)} className="mt-0.5 accent-emerald-400" />I reviewed this audit’s score dimensions, findings, and advisory guidance for the active delivery item.</label>}
          </div>
          <div className="flex min-w-0 max-w-full flex-wrap gap-2">
            {!auditHasRun ? (
              <button type="button" onClick={handleRunAudit} disabled={isAuditing} className="rounded-lg bg-purple-600 px-3 py-2 font-bold text-white hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50">
                {isAuditing ? 'Checking artifacts…' : 'Run quality checks'}
              </button>
            ) : !passesGate ? (
              <>
                {scopeTraceabilityBlocked && <button type="button" onClick={() => setScopeRestoreNotice(onRestoreUnlinkedFeatureScope())} className="rounded-lg bg-amber-300 px-3 py-2 font-bold text-zinc-950 hover:bg-amber-200">
                  Restore unlinked feature scope
                </button>}
                <button type="button" onClick={() => setAuditEvidenceOpen(true)} className="rounded-lg border border-cyan-400/35 px-3 py-2 font-bold text-cyan-200 hover:bg-cyan-500/10">
                  Review the blocking finding
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setAuditEvidenceOpen(true)} className="rounded-lg border border-cyan-400/35 px-3 py-2 font-bold text-cyan-200 hover:bg-cyan-500/10">Review audit evidence</button>
                <button type="button" onClick={onApproveQualityGate} disabled={!hasReviewedAudit} className="rounded-lg bg-emerald-400 px-3 py-2 font-bold text-zinc-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-45">Confirm review and continue</button>
              </>
            )}
          </div>
        </div>
        {scopeRestoreNotice && <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-cyan-100"><span>{scopeRestoreNotice}</span><button type="button" onClick={handleRunAudit} disabled={isAuditing} className="shrink-0 rounded-md bg-cyan-300 px-3 py-1.5 font-bold text-zinc-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">{isAuditing ? 'Checking…' : 'Run quality checks now'}</button></div>}
      </section>
    </div>
  );
});

AuditDashboard.displayName = 'AuditDashboard';
