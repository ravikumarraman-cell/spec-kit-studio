import React, { memo, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Table as TableIcon, Trash2 } from 'lucide-react';
import { ConstitutionRule } from '../../types/speckit';
import { TanStackTable } from '../common/TanStackTable';
import { CategoryBadge, StrictnessBadge } from '../common/Badge';

interface ConstitutionTanStackMatrixProps {
  rules: ConstitutionRule[];
  onRemoveRule: (id: string) => void;
}

export const ConstitutionTanStackMatrix: React.FC<ConstitutionTanStackMatrixProps> = memo(({
  rules,
  onRemoveRule,
}) => {
  const columns = useMemo<ColumnDef<ConstitutionRule, any>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Rule ID',
        cell: (info) => <span className="font-mono font-bold text-emerald-400">{info.getValue()}</span>,
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: (info) => <CategoryBadge category={info.getValue()} />,
      },
      {
        accessorKey: 'strictness',
        header: 'Strictness',
        cell: (info) => <StrictnessBadge strictness={info.getValue()} />,
      },
      {
        accessorKey: 'title',
        header: 'Rule Name',
        cell: (info) => <span className="font-semibold text-zinc-100">{info.getValue()}</span>,
      },
      {
        accessorKey: 'ruleStatement',
        header: 'Governing Policy Statement',
        cell: (info) => (
          <span className="font-mono text-zinc-300 text-[11px]">{info.getValue()}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => (
          <button
            type="button"
            onClick={() => onRemoveRule(info.row.original.id)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 transition-colors"
            title="Remove Rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ],
    [onRemoveRule]
  );

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-emerald-400" />
          <span>Constitution Governance Matrix (@tanstack/react-table)</span>
        </h3>
      </div>

      <TanStackTable
        data={rules}
        columns={columns}
        placeholderText="Search governance rules, policies, strictness..."
      />
    </div>
  );
});

ConstitutionTanStackMatrix.displayName = 'ConstitutionTanStackMatrix';
