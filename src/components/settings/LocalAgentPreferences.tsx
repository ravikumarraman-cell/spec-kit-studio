import React, { useCallback, useEffect, useState } from "react";
import { Cpu, ShieldCheck } from "lucide-react";
import { localAgentLabel } from "../../lib/agentAvailability";
import {
  CONNECTOR_CONFIGURATION_CHANGED_EVENT,
} from "../../lib/connector";
import { useRuntimeAgentScan } from "../../hooks/useRuntimeAgents";
import {
  LocalAgentScan,
  refreshRuntimeAgentAvailability,
  refreshRuntimeAgentScan,
} from "../../lib/runtimeAgents";
import { StudioSettings } from "../../lib/studioSettings";

interface Props {
  settings: StudioSettings;
  repositoryPath?: string;
  onChange: (partial: Partial<StudioSettings>) => void;
}

export function describeLocalAgentScan(
  scan: LocalAgentScan,
  refreshing: boolean,
  error: string | null,
): string {
  const checkedAt = scan.checkedAt
    ? new Date(scan.checkedAt).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;
  if (refreshing) return "Checking the local connector now…";
  if (error) {
    return `Live check failed: ${error}${checkedAt ? ` Last successful check: ${checkedAt}.` : ""}`;
  }
  if (!scan.scanned) return "Not checked yet. Check now to query the local connector.";
  const installed = scan.agents.filter((agent) => agent.installed);
  const source = scan.source === "workspace" ? "workspace scan" : "local connector";
  if (!installed.length) return `No runnable local agent was reported by the ${source}${checkedAt ? ` at ${checkedAt}` : ""}.`;
  return `${installed.map(localAgentLabel).join(", ")} reported ready by the ${source}${checkedAt ? ` at ${checkedAt}` : ""}.`;
}

export function LocalAgentPreferences({ settings, repositoryPath, onChange }: Props) {
  const scan = useRuntimeAgentScan();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (repositoryPath) await refreshRuntimeAgentScan(repositoryPath);
      else await refreshRuntimeAgentAvailability();
      setRefreshError(null);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Studio could not verify local-agent availability.");
    } finally {
      setIsRefreshing(false);
    }
  }, [repositoryPath]);

  useEffect(() => {
    void refresh();
    const refreshAfterConnectorChange = () => void refresh();
    window.addEventListener(CONNECTOR_CONFIGURATION_CHANGED_EVENT, refreshAfterConnectorChange);
    return () => window.removeEventListener(CONNECTOR_CONFIGURATION_CHANGED_EVENT, refreshAfterConnectorChange);
  }, [refresh]);

  const configuredAgents = scan.scanned ? scan.agents : [];

  return (
    <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-5">
      <div className="flex gap-3">
        <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-300"><Cpu className="h-5 w-5" /></div>
        <div>
          <h2 className="font-bold text-zinc-100">Engine & workflow</h2>
          <p className="mt-1 text-xs text-zinc-400">Choose the compatible local agent Studio should use when a delivery screen explicitly asks for one. Hosted providers remain explicit and optional.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 border-t border-cyan-500/15 pt-4 sm:grid-cols-2">
        <label className="text-xs font-semibold text-zinc-300">
          Preferred local agent
          <select value={settings.preferredAgent} onChange={(event) => onChange({ preferredAgent: event.target.value as StudioSettings["preferredAgent"] })} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-zinc-100">
            <option value="auto">Auto-select compatible agent</option>
            {configuredAgents.map((agent) => <option key={agent.id} value={agent.id}>{localAgentLabel(agent)}{agent.installed ? "" : " (not detected)"}</option>)}
          </select>
          <span className="mt-1 block text-[11px] font-normal text-zinc-500">Machine availability is queried directly from the local connector. A connected workspace additionally validates agents during its repository scan.</span>
        </label>
        <div className="space-y-2">
          <div className="rounded-xl border border-cyan-500/20 bg-zinc-950/45 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-200">Local-agent availability</span>
              <button type="button" onClick={() => void refresh()} disabled={isRefreshing} className="rounded-lg border border-cyan-400/35 px-3 py-1.5 text-[11px] font-bold text-cyan-100 hover:bg-cyan-500/10 disabled:cursor-wait disabled:opacity-60">{isRefreshing ? "Checking…" : "Check now"}</button>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400" aria-live="polite">{describeLocalAgentScan(scan, isRefreshing, refreshError)}</p>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
            <span><strong className="text-xs text-zinc-200">Human approval stays on</strong><span className="mt-1 block text-[11px] text-zinc-500">The Engine can prepare a stage, but only you advance the Journey or apply repository changes.</span></span>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
            <input type="checkbox" checked={settings.showAdvancedTools} onChange={(event) => onChange({ showAdvancedTools: event.target.checked })} className="mt-0.5 accent-cyan-400" />
            <span><strong className="text-xs text-zinc-200">Show advanced tools</strong><span className="mt-1 block text-[11px] text-zinc-500">Show Repository Import in the Journey Map. You can turn it on whenever you need it.</span></span>
          </label>
        </div>
      </div>
    </section>
  );
}