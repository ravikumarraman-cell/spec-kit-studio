import React, { memo } from 'react';
import { Database } from 'lucide-react';
import { DataSchema } from '../../types/speckit';

interface DataSchemasSectionProps {
  dataSchemas: DataSchema[];
}

export const DataSchemasSection: React.FC<DataSchemasSectionProps> = memo(({ dataSchemas }) => {
  return (
    <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-4 text-xs">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-indigo-400" />
          <span>Data Models & Persistence Schemas ({dataSchemas.length})</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dataSchemas.map((schema, index) => (
          <div
            key={schema.modelName || index}
            className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <span className="font-bold text-zinc-100">{schema.modelName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                {schema.fields.length} fields
              </span>
            </div>

            <div className="space-y-1 font-mono text-[11px]">
              {schema.fields.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-zinc-300 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-cyan-300 font-semibold">{f.name}</span>
                    {f.required && <span className="text-rose-400 text-[10px] font-bold">*</span>}
                  </div>
                  <span className="text-zinc-500">{f.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

DataSchemasSection.displayName = 'DataSchemasSection';
