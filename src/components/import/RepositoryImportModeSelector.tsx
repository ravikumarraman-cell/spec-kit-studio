import React from 'react';
import { FileArchive, Github, type LucideIcon, Upload, Zap } from 'lucide-react';

export type RepositoryImportMode = 'preset' | 'url' | 'paste' | 'zip';

interface RepositoryImportModeSelectorProps {
  value: RepositoryImportMode;
  onChange: (mode: RepositoryImportMode) => void;
}

const importModes: ReadonlyArray<{ id: RepositoryImportMode; label: string; icon: LucideIcon; activeClassName?: string; iconClassName?: string }> = [
  { id: 'preset', label: 'Preset Repos', icon: Zap, iconClassName: 'text-amber-400' },
  { id: 'url', label: 'GitHub URL', icon: Github },
  { id: 'paste', label: 'Paste Code', icon: Upload },
  { id: 'zip', label: 'Spec-Kit Package (.zip/.json)', icon: FileArchive, activeClassName: 'text-purple-300', iconClassName: 'text-purple-400' },
];

/** Shared mode switcher for the repository-source portion of import. */
export function RepositoryImportModeSelector({ value, onChange }: RepositoryImportModeSelectorProps) {
  const buttonClass = (mode: RepositoryImportMode, activeClass = 'text-cyan-300') =>
    `flex-1 py-2 px-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${value === mode ? `bg-zinc-800 ${activeClass} shadow-xs` : 'text-zinc-400 hover:text-zinc-200'}`;

  return (
    <div className="flex flex-wrap items-center rounded-xl border border-zinc-800 bg-zinc-950 p-1 text-xs" role="radiogroup" aria-label="Repository import source">
      {importModes.map(({ id, label, icon: Icon, iconClassName = '', activeClassName }) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)} className={buttonClass(id, activeClassName)}>
          <Icon className={`h-3.5 w-3.5 ${iconClassName}`} /><span>{label}</span>
        </button>
      ))}
    </div>
  );
}
