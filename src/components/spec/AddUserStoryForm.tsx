import React, { useState, memo } from 'react';
import { Plus } from 'lucide-react';
import { Priority, UserStory } from '../../types/speckit';

interface AddUserStoryFormProps {
  onAddStory: (story: Omit<UserStory, 'id'>) => void;
}

export const AddUserStoryForm: React.FC<AddUserStoryFormProps> = memo(({ onAddStory }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('High');
  const [asA, setAsA] = useState('User');
  const [iWantTo, setIWantTo] = useState('');
  const [soThat, setSoThat] = useState('');
  const [criteria, setCriteria] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !iWantTo.trim()) return;

    onAddStory({
      title: title.trim(),
      priority,
      asA: asA.trim() || 'User',
      iWantTo: iWantTo.trim(),
      soThat: soThat.trim(),
      acceptanceCriteria: criteria
        ? criteria.split('\n').map((c) => c.trim()).filter(Boolean)
        : ['Given standard inputs, When processed, Then return successful response.'],
    });

    setTitle('');
    setIWantTo('');
    setSoThat('');
    setCriteria('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 text-xs">
      <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5 text-indigo-400" />
        <span>Add User Story</span>
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          type="text"
          placeholder="Story Title (e.g. Export Spec as PDF)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="sm:col-span-3 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-indigo-500/50"
        >
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="As a..."
          value={asA}
          onChange={(e) => setAsA(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
        />
        <input
          type="text"
          placeholder="I want to..."
          value={iWantTo}
          onChange={(e) => setIWantTo(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
        />
        <input
          type="text"
          placeholder="So that..."
          value={soThat}
          onChange={(e) => setSoThat(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      <textarea
        rows={2}
        placeholder="Acceptance Criteria (one per line, e.g. Given valid auth, When requesting spec, Then return 200 OK)"
        value={criteria}
        onChange={(e) => setCriteria(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-indigo-500/50 font-mono text-[11px]"
      />

      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Story</span>
      </button>
    </form>
  );
});

AddUserStoryForm.displayName = 'AddUserStoryForm';
