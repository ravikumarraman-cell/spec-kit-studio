import React, { memo, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Table as TableIcon, Trash2 } from 'lucide-react';
import { UserStory, FunctionalRequirement } from '../../types/speckit';
import { TanStackTable } from '../common/TanStackTable';
import { PriorityBadge, CategoryBadge } from '../common/Badge';

interface SpecTanStackMatrixProps {
  userStories: UserStory[];
  functionalRequirements: FunctionalRequirement[];
  onRemoveStory: (id: string) => void;
  onRemoveFR: (id: string) => void;
}

export const SpecTanStackMatrix: React.FC<SpecTanStackMatrixProps> = memo(({
  userStories,
  functionalRequirements,
  onRemoveStory,
  onRemoveFR,
}) => {
  const storyColumns = useMemo<ColumnDef<UserStory, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Story ID',
        cell: (info) => <span className="font-mono font-bold text-indigo-400">{info.getValue()}</span>,
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: (info) => <PriorityBadge priority={info.getValue()} />,
      },
      {
        accessorKey: 'title',
        header: 'Story Title',
        cell: (info) => <span className="font-semibold text-zinc-100">{info.getValue()}</span>,
      },
      {
        accessorKey: 'asA',
        header: 'User Role',
        cell: (info) => <span className="text-zinc-300 font-mono text-[11px]">{info.getValue()}</span>,
      },
      {
        accessorKey: 'iWantTo',
        header: 'Goal / Capability',
        cell: (info) => <span className="text-zinc-300">{info.getValue()}</span>,
      },
      {
        accessorKey: 'soThat',
        header: 'Business Benefit',
        cell: (info) => <span className="text-zinc-400">{info.getValue() || '-'}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            type="button"
            onClick={() => onRemoveStory(info.row.original.id)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            title="Remove Story"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ],
    [onRemoveStory]
  );

  const frColumns = useMemo<ColumnDef<FunctionalRequirement, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Req ID',
        cell: (info) => <span className="font-mono font-bold text-cyan-400">{info.getValue()}</span>,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: (info) => <CategoryBadge category={info.getValue()} />,
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: (info) => (info.getValue() ? <PriorityBadge priority={info.getValue()} /> : null),
      },
      {
        accessorKey: 'title',
        header: 'Requirement Title',
        cell: (info) => <span className="font-semibold text-zinc-100">{info.getValue()}</span>,
      },
      {
        accessorKey: 'description',
        header: 'Detailed Specification',
        cell: (info) => <span className="text-zinc-400">{info.getValue()}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            type="button"
            onClick={() => onRemoveFR(info.row.original.id)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            title="Remove Requirement"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ],
    [onRemoveFR]
  );

  return (
    <div className="space-y-6">
      {/* User Stories TanStack Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-purple-400" />
          <span>User Stories Matrix (@tanstack/react-table)</span>
        </h3>
        <TanStackTable
          data={userStories}
          columns={storyColumns}
          placeholderText="Filter user stories by ID, role, or title..."
        />
      </div>

      {/* Functional Requirements TanStack Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-cyan-400" />
          <span>Functional Requirements Matrix (@tanstack/react-table)</span>
        </h3>
        <TanStackTable
          data={functionalRequirements}
          columns={frColumns}
          placeholderText="Filter requirements by title, category, or ID..."
        />
      </div>
    </div>
  );
});

SpecTanStackMatrix.displayName = 'SpecTanStackMatrix';
