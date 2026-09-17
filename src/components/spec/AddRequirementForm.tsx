import React, { useState, memo } from 'react';
import { Plus } from 'lucide-react';
import { FunctionalRequirement, Priority, RequirementCategory } from '../../types/speckit';

interface AddRequirementFormProps {
  onAddFR: (req: Omit<FunctionalRequirement, 'id'>) => void;
}

const CATEGORIES: RequirementCategory[] = ['Core', 'UI/UX', 'API', 'Database', 'Security', 'Performance', 'Integration'];

export const AddRequirementForm: React.FC<AddRequirementFormProps> = memo(({ onAddFR }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RequirementCategory>('Core');
  const [priority, setPriority] = useState<Priority>('High');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    onAddFR({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
    });

    setTitle('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 text-xs">
      <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5 text-cyan-400" />
        <span>Add Functional Requirement</span>
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          type="text"
          placeholder="Requirement Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RequirementCategory)}
          className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500/50"
        >
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <textarea
        rows={2}
        placeholder="Detailed functional specification & constraints..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
      />

      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Requirement</span>
      </button>
    </form>
  );
});

AddRequirementForm.displayName = 'AddRequirementForm';
