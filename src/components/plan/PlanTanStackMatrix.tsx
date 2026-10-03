import React, { memo, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Table as TableIcon, Trash2 } from 'lucide-react';
import { ApiContract, TechStackItem } from '../../types/speckit';
import { TanStackTable } from '../common/TanStackTable';

interface PlanTanStackMatrixProps {
  apiContracts: ApiContract[];
  techStack: TechStackItem[];
  onRemoveApi: (id: string) => void;
  onRemoveTech: (index: number) => void;
}

export const PlanTanStackMatrix: React.FC<PlanTanStackMatrixProps> = memo(({
  apiContracts,
  techStack,
  onRemoveApi,
  onRemoveTech,
}) => {
  const apiColumns = useMemo<ColumnDef<ApiContract, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Endpoint ID',
        cell: (info) => <span className="font-mono font-bold text-cyan-400">{info.getValue()}</span>,
      },
      {
        accessorKey: 'method',
        header: 'Method',
        cell: (info) => {
          const m = info.getValue();
          let color = 'bg-zinc-800 text-zinc-300 border-zinc-700';
          if (m === 'GET') color = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
          if (m === 'POST') color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
          if (m === 'DELETE') color = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
          return (
            <span className={`px-2 py-0.5 rounded font-mono font-bold border text-[11px] ${color}`}>
              {m}
            </span>
          );
        },
      },
      {
        accessorKey: 'path',
        header: 'Endpoint Path',
        cell: (info) => <span className="font-mono font-semibold text-zinc-100">{info.getValue()}</span>,
      },
      {
        accessorKey: 'description',
        header: 'Contract Description',
        cell: (info) => <span className="text-zinc-400">{info.getValue()}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            type="button"
            onClick={() => onRemoveApi(info.row.original.id)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            title="Remove Contract"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ],
    [onRemoveApi]
  );

  const techColumns = useMemo<ColumnDef<TechStackItem, any>[]>(
    () => [
      {
        accessorKey: 'category',
        header: 'Stack Category',
        cell: (info) => (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            {info.getValue()}
          </span>
        ),
      },
      {
        accessorKey: 'technology',
        header: 'Technology / Library',
        cell: (info) => <span className="font-semibold text-zinc-100">{info.getValue()}</span>,
      },
      {
        accessorKey: 'justification',
        header: 'Architectural Justification',
        cell: (info) => <span className="text-zinc-400">{info.getValue()}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            type="button"
            onClick={() => onRemoveTech(info.row.index)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            title="Remove Tech Item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ],
    [onRemoveTech]
  );

  return (
    <div className="space-y-6">
      {/* API Contracts TanStack Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-cyan-400" />
          <span>API Contracts Matrix (@tanstack/react-table)</span>
        </h3>
        <TanStackTable
          data={apiContracts}
          columns={apiColumns}
          placeholderText="Search API routes, endpoints, methods..."
        />
      </div>

      {/* Tech Stack TanStack Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-purple-400" />
          <span>Technology Stack Matrix (@tanstack/react-table)</span>
        </h3>
        <TanStackTable
          data={techStack}
          columns={techColumns}
          placeholderText="Search technologies and justifications..."
        />
      </div>
    </div>
  );
});

PlanTanStackMatrix.displayName = 'PlanTanStackMatrix';
