import React, { useState, memo } from 'react';
import { Cpu, Plus } from 'lucide-react';
import { ADR } from '../../types/speckit';

interface AdrSectionProps {
  adrs: ADR[];
  onAddAdr: (adr: Omit<ADR, 'id'>) => void;
}

export const AdrSection: React.FC<AdrSectionProps> = memo(({ adrs, onAddAdr }) => {
  const [title, setTitle] = useState('');
  const [context, setContext] = useState('');
  const [decision, setDecision] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddAdr({
      title: title.trim(),
      status: 'Accepted',
      context: context.trim() || 'Standard system requirements and constraints.',
      decision: decision.trim() || 'Approved architectural standard.',
      consequences: 'Enforces consistent codebase patterns and maintainable architectural boundaries.',
      date: new Date().toISOString().split('T')[0],
    });

    setTitle('');
    setContext('');
    setDecision('');
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span>Architecture Decision Records (ADRs) ({adrs.length})</span>
        </h3>
      </div>

      <div className="space-y-3">
        {adrs.map((adr) => (
          <div
            key={adr.id}
            className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-purple-400 text-[11px]">{adr.id}</span>
              <span className="font-semibold text-zinc-100">{adr.title}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                {adr.status}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              <strong className="text-zinc-300">Context:</strong> {adr.context}
            </p>
            <p className="text-[11px] text-zinc-300">
              <strong className="text-cyan-400">Decision:</strong> {adr.decision}
            </p>
          </div>
        ))}
      </div>

      {/* Add ADR Form */}
      <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
        <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-purple-400" />
          <span>Record Architecture Decision (ADR)</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Decision Title (e.g. Adopt TanStack Table for Matrix)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500/50"
          />
          <input
            type="text"
            placeholder="Context / Problem Statement"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500/50"
          />
          <input
            type="text"
            placeholder="Chosen Decision & Trade-offs"
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Save Decision Record</span>
        </button>
      </form>
    </div>
  );
});

AdrSection.displayName = 'AdrSection';
