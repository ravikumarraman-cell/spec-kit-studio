import React, { useState, memo } from 'react';
import { Plus } from 'lucide-react';
import { ConstitutionRule } from '../../types/speckit';

interface AddRuleFormProps {
  onAddRule: (rule: Omit<ConstitutionRule, 'id'>) => void;
}

const CATEGORIES: ConstitutionRule['category'][] = [
  'Coding Standard',
  'Architecture',
  'Security',
  'Testing & QA',
  'Git & Release',
];

const STRICTNESS_OPTIONS: ConstitutionRule['strictness'][] = ['Mandatory', 'Recommended', 'Optional'];

export const AddRuleForm: React.FC<AddRuleFormProps> = memo(({ onAddRule }) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ConstitutionRule['category']>('Coding Standard');
  const [strictness, setStrictness] = useState<ConstitutionRule['strictness']>('Mandatory');
  const [statement, setStatement] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !statement.trim()) return;

    onAddRule({
      title: title.trim(),
      category,
      strictness,
      ruleStatement: statement.trim(),
      description: description.trim() || title.trim(),
    });

    setTitle('');
    setStatement('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 text-xs">
      <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5 text-emerald-400" />
        <span>Add Constitution Rule</span>
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          type="text"
          placeholder="Rule Title (e.g. Server-Side Secret Isolation)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500/50"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={strictness}
          onChange={(e) => setStrictness(e.target.value as any)}
          className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500/50"
        >
          {STRICTNESS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <input
        type="text"
        placeholder="Exact Rule Statement (e.g. All third-party API tokens must be proxy-accessed through server.ts)"
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono text-[11px] focus:outline-none focus:border-emerald-500/50"
      />

      <button
        type="submit"
        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Rule</span>
      </button>
    </form>
  );
});

AddRuleForm.displayName = 'AddRuleForm';
