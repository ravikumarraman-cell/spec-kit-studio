import React from 'react';
import {
  LocalAgentId,
  LocalAgentStatus,
  localAgentLabels,
  localAgentOrder,
  recommendedLocalAgent,
} from '../../lib/agentAvailability';

interface GenerationPathSelectorProps {
  scan: { scanned: boolean; agents: LocalAgentStatus[] };
  path: 'engine' | 'gemini';
  selectedAgent: LocalAgentId;
  onPathChange: (path: 'engine' | 'gemini') => void;
  onAgentChange: (agent: LocalAgentId) => void;
}

/**
 * Presentation-only choice between a local Spec-Kit Engine workflow and a
 * Studio draft. Availability and fallback decisions remain owned by the modal.
 */
export function GenerationPathSelector({
  scan,
  path,
  selectedAgent,
  onPathChange,
  onAgentChange,
}: GenerationPathSelectorProps) {
  const recommended = recommendedLocalAgent(scan.agents);
  const engineAvailable = scan.scanned && Boolean(recommended);

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] font-black text-cyan-300">Generation path</p>
        <h3 className="mt-1 font-bold text-zinc-100">{engineAvailable ? 'Spec-Kit Engine first' : 'Gemini is ready to continue'}</h3>
        <p className="mt-1 text-xs text-zinc-400">
          {scan.scanned
            ? recommended
              ? 'Studio found a local coding agent the connector can run. Gemini remains available for a Studio-only draft.'
              : 'No local coding agent is ready for this connector, so Gemini is selected automatically.'
            : 'No workspace scan is needed to draft with Gemini. Scan later if you want Studio to detect a local coding agent.'}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => onPathChange('engine')} disabled={!engineAvailable} className={`rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${path === 'engine' ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>
          <strong className="block text-xs">Spec-Kit Engine{recommended ? ' · Recommended' : ''}</strong>
          <span className="block mt-1 text-[11px]">{scan.scanned ? recommended ? 'Reviewable native workflow: constitution → specify → plan → tasks.' : 'No runnable local agent detected.' : 'Scan the connected workspace to enable.'}</span>
        </button>
        <button type="button" onClick={() => onPathChange('gemini')} className={`rounded-xl border p-3 text-left ${path === 'gemini' ? 'border-purple-400 bg-purple-500/10 text-purple-100' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>
          <strong className="block text-xs">Gemini AI{scan.scanned && !recommended ? ' · Selected' : ' · Fallback'}</strong>
          <span className="block mt-1 text-[11px]">Creates a Studio draft; review before exporting to the repository.</span>
        </button>
      </div>

      {path === 'engine' && (
        <div className="flex flex-wrap gap-2">
          <span className="w-full text-[11px] text-zinc-400">Choose a detected agent to receive the work packet:</span>
          {localAgentOrder.map((id) => {
            const agent = scan.agents.find((item) => item.id === id);
            const ready = Boolean(agent?.installed);
            return (
              <button key={id} type="button" disabled={!ready} onClick={() => onAgentChange(id)} className={`px-3 py-2 rounded-lg border text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${selectedAgent === id ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 text-zinc-400'}`}>
                {localAgentLabels[id]} · {ready ? `ready${agent?.version ? ` (${agent.version})` : ''}` : scan.scanned ? 'not detected' : 'scan required'}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
