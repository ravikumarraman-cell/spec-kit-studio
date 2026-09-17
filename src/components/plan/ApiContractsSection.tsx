import React, { useState, memo } from 'react';
import { Globe, Plus, Trash2 } from 'lucide-react';
import { ApiContract } from '../../types/speckit';

interface ApiContractsSectionProps {
  apiContracts: ApiContract[];
  onAddApi: (contract: Omit<ApiContract, 'id'>) => void;
  onRemoveApi: (id: string) => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

export const ApiContractsSection: React.FC<ApiContractsSectionProps> = memo(({
  apiContracts,
  onAddApi,
  onRemoveApi,
}) => {
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'>('GET');
  const [path, setPath] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) return;

    onAddApi({
      method,
      path: path.trim(),
      description: desc.trim() || 'API Contract endpoint',
    });

    setPath('');
    setDesc('');
  };

  const getMethodBadgeClass = (m: string) => {
    switch (m) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'POST':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'PUT':
      case 'PATCH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span>API Contracts & Service Endpoints ({apiContracts.length})</span>
        </h3>
      </div>

      <div className="space-y-2">
        {apiContracts.map((api) => (
          <div
            key={api.id}
            className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span className={`px-2 py-0.5 rounded font-mono font-bold border text-[11px] ${getMethodBadgeClass(api.method)}`}>
                {api.method}
              </span>
              <span className="font-mono text-cyan-300 font-semibold truncate">{api.path}</span>
              <span className="text-zinc-400 truncate hidden sm:inline">• {api.description}</span>
            </div>

            <button
              type="button"
              onClick={() => onRemoveApi(api.id)}
              className="text-zinc-600 hover:text-red-400 p-1 transition-colors shrink-0"
              title="Remove endpoint"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add API Form */}
      <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3">
        <h4 className="font-bold text-zinc-200 flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-cyan-400" />
          <span>Add API Contract Endpoint</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as any)}
            className="px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-cyan-500/50"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="/api/v1/resource/:id"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            className="sm:col-span-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono text-[11px] focus:outline-none focus:border-cyan-500/50"
          />
          <input
            type="text"
            placeholder="Endpoint description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Contract</span>
        </button>
      </form>
    </div>
  );
});

ApiContractsSection.displayName = 'ApiContractsSection';
