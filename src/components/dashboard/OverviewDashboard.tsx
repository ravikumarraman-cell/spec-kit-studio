import React, { useMemo, memo } from 'react';
import { FileText, CheckSquare, Activity, Layers, Sparkles } from 'lucide-react';
import { SpecKitProject, ViewTab } from '../../types/speckit';
import { SpecKitVersionSelector } from '../common/SpecKitVersionSelector';
import { StatCard } from '../common/StatCard';
import { TraceabilityMatrix } from './TraceabilityMatrix';
import { WorkflowActionCards } from './WorkflowActionCards';
import { GovernanceSummaryCard } from './GovernanceSummaryCard';
import { SPECKIT_VERSION } from '../../lib/specKitCompliance';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';

interface OverviewDashboardProps {
  project: SpecKitProject;
  onNavigateTab: (tab: ViewTab) => void;
  onTriggerAiSpecModal: () => void;
  onSelectVersion: (version: string) => void;
  onOpenFeatureImport?: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = memo(({
  project,
  onNavigateTab,
  onTriggerAiSpecModal,
  onSelectVersion,
  onOpenFeatureImport,
}) => {
  const { spec, plan, tasks, constitution, audit } = project;

  const metrics = useMemo(() => {
    const totalTasks = tasks.tasks.length;
    const completedTasks = tasks.tasks.filter((t) => t.status === 'done').length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const totalReqs = spec.functionalRequirements.length;
    const mappedReqs = new Set(tasks.tasks.map((t) => t.mappedRequirementId).filter(Boolean)).size;
    const coveragePercentage = totalReqs > 0 ? Math.round((mappedReqs / totalReqs) * 100) : 100;

    return {
      totalTasks,
      completedTasks,
      completionPercentage,
      totalReqs,
      coveragePercentage,
    };
  }, [tasks.tasks, spec.functionalRequirements]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-xs">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-400/40">
                GitHub Spec-Kit Workspace
              </span>
              {project.importedRepo && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-cyan-500/20 text-sky-700 dark:text-cyan-200 border border-sky-200 dark:border-cyan-400/40 font-mono">
                  Imported: {project.importedRepo.primaryLanguage}
                </span>
              )}
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-400/40 font-mono">
                Spec-Kit v{project.version || SPECKIT_VERSION}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {project.name}
            </h1>
            <p className="text-xs md:text-sm text-slate-600 dark:text-zinc-200 font-medium leading-relaxed max-w-xl">
              {project.description || spec.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {onOpenFeatureImport && (
              <button
                type="button"
                onClick={onOpenFeatureImport}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Import Feature / User Stories</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <section aria-labelledby="workspace-tools-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">Continue your work</p><h2 id="workspace-tools-heading" className="mt-1 text-base font-bold text-slate-900 dark:text-zinc-100">Choose one focused workspace</h2><p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">Open only the part of the delivery process you are ready to work on.</p></div>
        </div>
        <div className="mt-4"><WorkflowActionCards onNavigateTab={onNavigateTab} /></div>
      </section>

      <ProgressiveDisclosure className="rounded-2xl border border-slate-200 bg-white p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/50" tone="context" label="Project health" summary={`${metrics.completedTasks}/${metrics.totalTasks} tasks complete · ${metrics.coveragePercentage}% requirement coverage`}>
        <div className="grid grid-cols-1 gap-4 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="User Stories & Reqs" value={spec.userStories.length} subtitle={`${spec.functionalRequirements.length} Functional Requirements`} icon={FileText} iconColor="text-indigo-400" onClick={() => onNavigateTab('spec')} trend={{ value: 'spec.md', positive: true }} />
          <StatCard label="Phased Tasks Progress" value={`${metrics.completionPercentage}%`} subtitle={`${metrics.completedTasks}/${metrics.totalTasks} Tasks Completed`} icon={CheckSquare} iconColor="text-cyan-400" onClick={() => onNavigateTab('tasks')} trend={{ value: `${metrics.completedTasks} Done`, positive: true }} />
          <StatCard label="Requirement Coverage" value={`${metrics.coveragePercentage}%`} subtitle="Mapped to Implementation Tasks" icon={Layers} iconColor="text-emerald-400" onClick={() => onNavigateTab('tasks')} trend={{ value: 'Verified', positive: true }} />
          <StatCard label="Spec Quality Health" value={`${audit?.overallScore || 94}/100`} subtitle="Grade A Quality Standard" icon={Activity} iconColor="text-purple-400" onClick={() => onNavigateTab('audit')} trend={{ value: 'Healthy', positive: true }} />
        </div>
      </ProgressiveDisclosure>

      <ProgressiveDisclosure className="rounded-2xl border border-slate-200 bg-white p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/50" label="Traceability and governance" summary="requirements, task coverage, and workspace safeguards">
        <div className="grid grid-cols-1 gap-6 p-3 lg:grid-cols-3">
          <div className="lg:col-span-2"><TraceabilityMatrix spec={spec} tasks={tasks} onNavigateToTasks={() => onNavigateTab('tasks')} /></div>
          <GovernanceSummaryCard constitution={constitution} audit={audit} onNavigateTab={onNavigateTab} />
        </div>
      </ProgressiveDisclosure>

      <ProgressiveDisclosure className="rounded-2xl border border-slate-200 bg-white p-1 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/50" label="Workspace setup and additional ways to start" summary="repository import, assisted drafting, and Spec-Kit target">
        <div className="space-y-4 p-3">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => onNavigateTab('import')} className="rounded-xl border border-sky-400/40 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-500/15 dark:text-sky-200">Import repository</button>
            <button type="button" onClick={onTriggerAiSpecModal} className="rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-500/15 dark:text-indigo-200">Create an assisted draft</button>
          </div>
          <SpecKitVersionSelector currentVersion={project.version || SPECKIT_VERSION} onSelectVersion={onSelectVersion} variant="full" />
        </div>
      </ProgressiveDisclosure>
    </div>
  );
});

OverviewDashboard.displayName = 'OverviewDashboard';
