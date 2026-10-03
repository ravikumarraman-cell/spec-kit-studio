import React from 'react';
import {
  LocalAgentId,
  LocalAgentStatus,
  agentSupports,
  localAgentLabel,
  recommendedLocalAgent,
} from '../../lib/agentAvailability';

interface GenerationPathSelectorProps {
  scan: { scanned: boolean; agents: LocalAgentStatus[] };
  path: 'engine' | 'gemini';
  selectedAgent: LocalAgentId;
  onPathChange: (path: 'engine' | 'gemini') => void;
  onAgentChange: (agent: LocalAgentId) => void;
  onRefreshAgents?: () => void;
  isRefreshingAgents?: boolean;
  workflow?: 'repository' | 'persona-draft';
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
  onRefreshAgents,
  isRefreshingAgents = false,
  workflow = 'repository',
}: GenerationPathSelectorProps) {
  const recommended = recommendedLocalAgent(scan.agents, 'auto', 'planning');
  const engineAvailable = scan.scanned && Boolean(recommended);

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.16em] font-black text-cyan-300">Generation path</p>
        <h3 className="mt-1 font-bold text-zinc-100">{engineAvailable ? workflow === 'persona-draft' ? 'Repository-free drafting agent' : 'Local Spec-Kit Engine' : 'Set up a local coding agent'}</h3>
        <p className="mt-1 text-xs text-zinc-400">
          {scan.scanned
            ? recommended
              ? workflow === 'persona-draft'
                ? 'Studio found an agent that can prepare a reviewable draft from the supplied source only. No repository, clone, or test run is involved.'
                : 'Studio found a local coding agent the connector can run. Hosted Gemini generation is optional and never selected automatically.'
              : 'No local coding agent is ready. Scan, install, and sign in to a local agent to continue with the default workflow.'
            : 'Scan the connected workspace to enable the default local-agent workflow. Gemini is optional.'}
        </p>
      </div>

      {onRefreshAgents && <button type="button" onClick={onRefreshAgents} disabled={isRefreshingAgents} className="w-fit rounded-lg border border-cyan-400/35 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/10 disabled:cursor-wait disabled:opacity-60">{isRefreshingAgents ? 'Refreshing local agents…' : 'Refresh available agents'}</button>}

      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => onPathChange('engine')} disabled={!engineAvailable} className={`rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-45 ${path === 'engine' ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>
          <strong className="block text-xs">{workflow === 'persona-draft' ? 'Draft with local agent' : 'Spec-Kit Engine'}{recommended ? ' · Recommended' : ''}</strong>
          <span className="block mt-1 text-[11px]">{scan.scanned ? recommended ? workflow === 'persona-draft' ? 'Uses only your supplied source to prepare a reviewable draft.' : 'Reviewable native workflow: constitution → specify → plan → tasks.' : 'No runnable local agent detected.' : workflow === 'persona-draft' ? 'Refresh available agents to enable.' : 'Scan the connected workspace to enable.'}</span>
        </button>
        <button type="button" onClick={() => onPathChange('gemini')} className={`rounded-xl border p-3 text-left ${path === 'gemini' ? 'border-purple-400 bg-purple-500/10 text-purple-100' : 'border-zinc-800 bg-zinc-950 text-zinc-400'}`}>
          <strong className="block text-xs">Gemini AI · Optional</strong>
          <span className="block mt-1 text-[11px]">Creates a Studio draft; review before exporting to the repository.</span>
        </button>
      </div>

      {path === 'engine' && (
        <div className="flex flex-wrap gap-2">
          <span className="w-full text-[11px] text-zinc-400">Choose a detected agent to receive the work packet:</span>
          {scan.agents.map((agent) => {
            const ready = agentSupports(agent, 'planning');
            return (
              <button key={agent.id} type="button" disabled={!ready} onClick={() => onAgentChange(agent.id)} className={`px-3 py-2 rounded-lg border text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45 ${selectedAgent === agent.id ? 'border-cyan-400 bg-cyan-500/10 text-cyan-100' : 'border-zinc-800 text-zinc-400'}`}>
                {localAgentLabel(agent)} · {ready ? `ready${agent.version ? ` (${agent.version})` : ''}` : scan.scanned ? 'not available for planning' : 'scan required'}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
