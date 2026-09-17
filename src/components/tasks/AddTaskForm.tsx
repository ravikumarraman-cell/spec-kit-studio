import React, { useState, memo } from 'react';
import { Plus } from 'lucide-react';
import { TaskItem, FeatureSpec } from '../../types/speckit';

interface AddTaskFormProps {
  spec: FeatureSpec;
  phases: readonly string[];
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
}

export const AddTaskForm: React.FC<AddTaskFormProps> = memo(({ spec, phases, onAddTask }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newPhase, setNewPhase] = useState<TaskItem['phase']>('Phase 1: Setup');
  const [newDesc, setNewDesc] = useState('');
  const [newEst, setNewEst] = useState(2);
  const [newMappedReq, setNewMappedReq] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle.trim(),
      phase: newPhase,
      description: newDesc.trim() || 'Task implementation step.',
      status: 'todo',
      estimatedHours: Number(newEst) || 2,
      mappedRequirementId: newMappedReq || undefined,
      dependencies: [],
      targetAgentPromptSnippet: `Implement ${newTitle} adhering to ${newMappedReq || 'project specifications'}.`,
    });

    setNewTitle('');
    setNewDesc('');
    setNewMappedReq('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 text-xs">
      <h3 className="font-bold text-zinc-100 flex items-center gap-2">
        <Plus className="w-4 h-4 text-cyan-400" />
        <span>Add Task to Breakdown</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Task Title (e.g. Build Responsive Layout)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="sm:col-span-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
        />
        <select
          value={newPhase}
          onChange={(e) => setNewPhase(e.target.value as any)}
          className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
        >
          {phases.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          type="text"
          placeholder="Task description..."
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          className="sm:col-span-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
        />
        <select
          value={newMappedReq}
          onChange={(e) => setNewMappedReq(e.target.value)}
          className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
        >
          <option value="">Map to Spec Req (Optional)</option>
          {spec.functionalRequirements.map((fr) => (
            <option key={fr.id} value={fr.id}>
              {fr.id}: {fr.title}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
          <span className="text-zinc-500">Est:</span>
          <input
            type="number"
            min={1}
            max={100}
            value={newEst}
            onChange={(e) => setNewEst(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-12 bg-transparent text-cyan-300 font-bold focus:outline-none text-center"
          />
          <span className="text-zinc-500">hrs</span>
        </div>
      </div>

      <button
        type="submit"
        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
      >
        <Plus className="w-4 h-4" />
        <span>Add Task</span>
      </button>
    </form>
  );
});

AddTaskForm.displayName = 'AddTaskForm';
