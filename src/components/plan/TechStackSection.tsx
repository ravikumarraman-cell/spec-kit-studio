import React, { useState, memo } from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { TechStackItem } from '../../types/speckit';

interface TechStackSectionProps {
  techStack: TechStackItem[];
  onAddTech: (item: TechStackItem) => void;
  onRemoveTech: (index: number) => void;
}

export const TechStackSection: React.FC<TechStackSectionProps> = memo(({
  techStack,
  onAddTech,
  onRemoveTech,
}) => {
  const [category, setCategory] = useState('');
  const [technology, setTechnology] = useState('');
  const [justification, setJustification] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!technology.trim()) return;

    onAddTech({
      category: category.trim() || 'General',
      technology: technology.trim(),
      justification: justification.trim() || 'Selected for optimal performance and ecosystem integration',
    });

    setTechnology('');
    setJustification('');
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Technology Stack & Architecture Choices ({techStack.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {techStack.map((tech, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1.5 relative group hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 uppercase tracking-wider">
                {tech.category}
              </span>
              <button
                type="button"
                onClick={() => onRemoveTech(idx)}
                className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                title="Remove technology"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="font-semibold text-zinc-100">{tech.technology}</div>
            <p className="text-[11px] text-zinc-400 leading-snug">{tech.justification}</p>
          </div>
        ))}
      </div>

      {/* Add Tech Item Form */}
      <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
        <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>Add Technology Stack Decision</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="text"
            placeholder="Category (e.g. Database, Auth, Frontend)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
          <input
            type="text"
            placeholder="Technology (e.g. PostgreSQL, Redis)"
            value={technology}
            onChange={(e) => setTechnology(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
          <input
            type="text"
            placeholder="Architecture Justification"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Technology</span>
        </button>
      </form>
    </div>
  );
});

TechStackSection.displayName = 'TechStackSection';
