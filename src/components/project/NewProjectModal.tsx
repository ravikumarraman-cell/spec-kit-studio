import React, { FormEvent, useState } from 'react';
import { Plus, X } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

/** Reusable controlled boundary for creating a local Spec-Kit workspace. */
export function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  if (!isOpen) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim());
    setName('');
    setDescription('');
  };

  return <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 text-xs shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="new-workspace-title">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <h3 id="new-workspace-title" className="text-sm font-bold text-zinc-100">Create New Spec Workspace</h3>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-zinc-500 hover:text-zinc-200"><X className="w-4 h-4" /></button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <label className="block font-semibold text-zinc-300">Project Name
          <input type="text" required placeholder="e.g. AI Code Reviewer Service" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none" />
        </label>
        <label className="block font-semibold text-zinc-300">Description
          <textarea rows={3} placeholder="Brief description of the specification scope..." value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none" />
        </label>
        <div className="pt-2 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 font-medium">Cancel</button>
          <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5"><Plus className="w-4 h-4" /><span>Create Workspace</span></button>
        </div>
      </form>
    </div>
  </div>;
}
