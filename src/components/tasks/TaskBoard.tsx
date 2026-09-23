import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  Kanban,
  Table as TableIcon,
  Code
} from 'lucide-react';
import { TaskBreakdown, TaskItem, TaskStatus, FeatureInboxItem, FeatureSpec } from '../../types/speckit';
import { EditorHeader } from '../common/EditorHeader';
import { ViewToggle, ViewOption } from '../common/ViewToggle';
import { TaskCard } from './TaskCard';
import { AddTaskForm } from './AddTaskForm';
import { TasksTanStackMatrix } from './TasksTanStackMatrix';
import { MarkdownSourceView } from '../common/MarkdownSourceView';
import { isFeatureArtifactScoped } from '../../lib/featureArtifactScope';
import { FeatureDeliveryBoard } from '../common/FeatureDeliveryBoard';
import { configuredConnectorClient } from '../../lib/connector';
import { getConnectorSessionToken } from '../../lib/connectorSession';
import { currentFeatureDeliveryArtifact, needsFeatureDeliveryReconciliation } from '../../lib/featureDeliveryReconciliation';

interface TaskBoardProps {
  projectId: string;
  taskBreakdown: TaskBreakdown;
  spec: FeatureSpec;
  onSaveTasks: (updatedBreakdown: TaskBreakdown) => void;
  onTriggerAiGenerate: () => void;
  onSelectTaskForPrompt: (taskId: string, taskTitle: string) => void;
  focusFeature?: FeatureInboxItem;
  repositoryPath?: string;
  onRecoverFeatureDeliveryPlan?: (plan: { path: string; content: string; acceptedAt: string }) => void;
}

const PHASES = [
  'Phase 1: Setup',
  'Phase 2: Core Infrastructure',
  'Phase 3: Integration',
  'Phase 4: Polish & Testing',
] as const;

type TaskViewMode = 'kanban' | 'tanstack' | 'markdown';

const VIEW_OPTIONS: ViewOption<TaskViewMode>[] = [
  { id: 'kanban', label: 'Kanban Board', icon: Kanban },
  { id: 'tanstack', label: 'TanStack Matrix', icon: TableIcon, badge: 'High Density' },
  { id: 'markdown', label: 'tasks.md Source', icon: Code },
];

export const TaskBoard: React.FC<TaskBoardProps> = ({
  projectId,
  taskBreakdown,
  spec,
  onSaveTasks,
  onTriggerAiGenerate,
  onSelectTaskForPrompt,
  focusFeature,
  repositoryPath,
  onRecoverFeatureDeliveryPlan,
}) => {
  const [activeView, setActiveView] = useState<TaskViewMode>('kanban');
  const [activePhaseFilter, setActivePhaseFilter] = useState<string>('all');
  const [currentTasks, setCurrentTasks] = useState<TaskItem[]>(taskBreakdown.tasks);

  useEffect(() => {
    setCurrentTasks(taskBreakdown.tasks);
    setActivePhaseFilter('all');
    setActiveView('kanban');
  }, [projectId, taskBreakdown]);

  useEffect(() => {
    // Once created, a feature worktree is the only authoritative location.
    // The main checkout can retain a different revision of the same artifact.
    const repositoryPaths = focusFeature?.worktreePath
      ? [focusFeature.worktreePath]
      : repositoryPath ? [repositoryPath] : [];
    if (!focusFeature || !repositoryPaths.length || !onRecoverFeatureDeliveryPlan) return;
    let cancelled = false;
    Promise.allSettled(repositoryPaths.map((path) => configuredConnectorClient(getConnectorSessionToken()).readSpecKitArtifacts(path)))
      .then((results) => {
        const artifacts = results.flatMap((result) => result.status === 'fulfilled' ? result.value.artifacts : []);
        const current = currentFeatureDeliveryArtifact(focusFeature, artifacts);
        if (!cancelled && needsFeatureDeliveryReconciliation(focusFeature, current)) {
          onRecoverFeatureDeliveryPlan({ path: current.path, content: current.content, acceptedAt: focusFeature.deliveryPlan?.acceptedAt || new Date().toISOString() });
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [focusFeature?.id, focusFeature?.deliveryPlan?.path, focusFeature?.deliveryPlan?.content, focusFeature?.worktreePath, onRecoverFeatureDeliveryPlan, repositoryPath]);

  const handleUpdateStatus = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      setCurrentTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                completedAt: newStatus === 'done' ? new Date().toISOString() : undefined,
              }
            : t
        );
        onSaveTasks({ ...taskBreakdown, tasks: updated, lastUpdated: new Date().toISOString() });
        return updated;
      });
    },
    [onSaveTasks, taskBreakdown]
  );

  const handleAddTask = useCallback(
    (taskData: Omit<TaskItem, 'id'>) => {
      setCurrentTasks((prev) => {
        const newTask: TaskItem = {
          ...taskData,
          id: `TASK-${100 + prev.length + 1}`,
        };
        const updated = [...prev, newTask];
        onSaveTasks({ ...taskBreakdown, tasks: updated, lastUpdated: new Date().toISOString() });
        return updated;
      });
    },
    [onSaveTasks, taskBreakdown]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      setCurrentTasks((prev) => {
        const updated = prev.filter((t) => t.id !== taskId);
        onSaveTasks({ ...taskBreakdown, tasks: updated, lastUpdated: new Date().toISOString() });
        return updated;
      });
    },
    [onSaveTasks, taskBreakdown]
  );

  const filteredTasks = useMemo(() => {
    return activePhaseFilter === 'all'
      ? currentTasks
      : currentTasks.filter((t) => t.phase === activePhaseFilter);
  }, [currentTasks, activePhaseFilter]);

  const { totalEstHours, doneCount } = useMemo(() => {
    const totalEst = filteredTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const done = filteredTasks.filter((t) => t.status === 'done').length;
    return { totalEstHours: totalEst, doneCount: done };
  }, [filteredTasks]);

  const todoTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'todo'), [filteredTasks]);
  const inProgressTasks = useMemo(
    () => filteredTasks.filter((t) => t.status === 'in_progress' || t.status === 'blocked'),
    [filteredTasks]
  );
  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.status === 'done'), [filteredTasks]);

  // The active feature owns its own official tasks.md. Showing the workspace
  // board beside it led people to believe its historical tasks were part of
  // the feature queue. Keep the two views fully separate: feature mode shows
  // only feature-scoped delivery evidence.
  if (focusFeature) {
    const hasFeaturePlan = Boolean(
      focusFeature.deliveryPlan?.acceptedAt
      && focusFeature.deliveryPlan.path
      && isFeatureArtifactScoped(focusFeature.deliveryPlan.content, focusFeature, focusFeature.deliveryPlan.path),
    );
    return (
      <div className="space-y-6 pb-12">
        <section className="rounded-2xl border border-violet-400/30 bg-violet-500/5 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-300">Feature implementation queue</p>
          <h1 className="mt-1 text-lg font-bold text-zinc-100">{focusFeature.title}</h1>
          {hasFeaturePlan ? <>
            <p className="mt-1 text-xs text-zinc-300">Only the accepted tasks in this feature’s <code>tasks.md</code> are shown here and may be implemented for this feature.</p>
            <FeatureDeliveryBoard content={focusFeature.deliveryPlan!.content} sourcePath={focusFeature.deliveryPlan!.path!} completedTaskIds={focusFeature.implementationReceipts?.map((receipt) => receipt.taskId)} authorityLabel={focusFeature.worktreePath ? 'Registered feature worktree' : 'Connected repository'} />
          </> : <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-100"><strong>No usable feature delivery plan yet.</strong> Return to Plan delivery to find or generate this feature’s <code>tasks.md</code>.</div>}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Unified Editor Header */}
      <EditorHeader
        icon={CheckSquare}
        iconColor="text-cyan-400"
        title="Phased Task Board (tasks.md)"
        subtitle="Phased task breakdown mapped directly to Spec functional requirements and AI coding prompts."
        badgeLabel="Phased Execution"
        badgeColor="bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
        onTriggerAi={onTriggerAiGenerate}
        aiButtonLabel="AI Auto-Breakdown Tasks"
        viewToggle={
          <ViewToggle
            activeView={activeView}
            onViewChange={setActiveView}
            options={VIEW_OPTIONS}
          />
        }
      />

      {activeView === 'kanban' && (
        <div className="space-y-6">
          {/* Phase Filters & Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
              <button
                type="button"
                onClick={() => setActivePhaseFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  activePhaseFilter === 'all'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                All Phases ({currentTasks.length})
              </button>
              {PHASES.map((phase) => {
                const count = currentTasks.filter((t) => t.phase === phase).length;
                return (
                  <button
                    key={phase}
                    type="button"
                    onClick={() => setActivePhaseFilter(phase)}
                    className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                      activePhaseFilter === phase
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    {phase} ({count})
                  </button>
                );
              })}
            </div>

            {/* Phase Progress Badge */}
            <div className="flex items-center gap-3 text-xs text-zinc-400 shrink-0">
              <span>
                Done: <strong className="text-emerald-400">{doneCount}/{filteredTasks.length}</strong>
              </span>
              <span>•</span>
              <span>
                Total Estimate: <strong className="text-cyan-400">{totalEstHours} hrs</strong>
              </span>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* To Do */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 min-h-[300px]">
              <div className="flex items-center justify-between font-bold text-xs text-zinc-300 pb-2 border-b border-zinc-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  <span>To Do</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {todoTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {todoTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteTask}
                    onSelectForPrompt={onSelectTaskForPrompt}
                  />
                ))}
              </div>
            </div>

            {/* In Progress */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 min-h-[300px]">
              <div className="flex items-center justify-between font-bold text-xs text-amber-300 pb-2 border-b border-zinc-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>In Progress</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  {inProgressTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {inProgressTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteTask}
                    onSelectForPrompt={onSelectTaskForPrompt}
                  />
                ))}
              </div>
            </div>

            {/* Completed */}
            <div className="space-y-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 min-h-[300px]">
              <div className="flex items-center justify-between font-bold text-xs text-emerald-300 pb-2 border-b border-zinc-800">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Completed</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  {completedTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDeleteTask}
                    onSelectForPrompt={onSelectTaskForPrompt}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Add Task Form */}
          <AddTaskForm spec={spec} phases={PHASES} onAddTask={handleAddTask} />
        </div>
      )}

      {activeView === 'tanstack' && (
        <div className="space-y-6">
          <TasksTanStackMatrix
            tasks={currentTasks}
            onUpdateStatus={handleUpdateStatus}
            onDelete={handleDeleteTask}
            onSelectForPrompt={onSelectTaskForPrompt}
          />
          <AddTaskForm spec={spec} phases={PHASES} onAddTask={handleAddTask} />
        </div>
      )}

      {activeView === 'markdown' && (
        <MarkdownSourceView
          value={taskBreakdown.markdown}
          fileName="tasks.md"
          title="Raw tasks.md Document Output"
          subtitle="Phased Breakdown formatted for spec-kit CLI"
        />
      )}
    </div>
  );
};
