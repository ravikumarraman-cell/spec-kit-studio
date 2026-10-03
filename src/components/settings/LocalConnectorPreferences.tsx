import React, { useState } from 'react';
import { CheckCircle2, CircleAlert, Link2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { ConnectorHealth, configuredConnectorUrl, connectorClient, saveConfiguredConnectorUrl } from '../../lib/connector';
import { getConnectorSessionToken, setConnectorSessionToken } from '../../lib/connectorSession';

type ConnectionState = { health: ConnectorHealth; url: string } | null;

function connectorMessage(health: ConnectorHealth): string {
  if (health.tokenStatus === 'rejected') return 'The connector rejected this pairing token. Confirm that it belongs to this local endpoint.';
  if (health.tokenStatus === 'missing') return 'This connector requires its pairing token before Studio can use it.';
  if (health.tokenRequired && health.tokenStatus !== 'accepted') return 'This connector requires a valid pairing token.';
  return `Connected${health.version ? ` · connector ${health.version}` : ''}`;
}

/**
 * Shared connector preferences for every Studio persona and route. It tests
 * only /health and stores a session-scoped pairing token: no repository is
 * selected, scanned, modified, or handed to an agent here.
 */
export function LocalConnectorPreferences() {
  const initialUrl = configuredConnectorUrl();
  const [url, setUrl] = useState(initialUrl);
  const [token, setToken] = useState(() => getConnectorSessionToken(initialUrl));
  const [state, setState] = useState<ConnectionState>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const testAndSave = async () => {
    setTesting(true); setError(null); setState(null);
    const endpoint = url.trim().replace(/\/$/, '');
    try {
      const health = await connectorClient(endpoint, token.trim()).health();
      if (health.tokenStatus === 'missing' || health.tokenStatus === 'rejected' || (health.tokenRequired && !token.trim())) {
        throw new Error(connectorMessage(health));
      }
      setConnectorSessionToken(token, endpoint);
      // Persist the session credential before broadcasting the endpoint so an
      // already-open screen reads one coherent connector configuration.
      saveConfiguredConnectorUrl(endpoint);
      setState({ health, url: endpoint });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Studio could not verify this local connector.');
    } finally { setTesting(false); }
  };

  const clearToken = () => {
    setToken('');
    setConnectorSessionToken('', url);
    saveConfiguredConnectorUrl(url);
    setState(null);
  };

  return <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-5">
    <div className="flex gap-3">
      <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-300"><Link2 className="h-5 w-5" /></div>
      <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">Shared capability</p><h2 className="mt-1 font-bold text-zinc-100">Local connector</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">Configure the local Studio connector once for this browser. Every role can use it when needed; it is not a delivery step.</p></div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <label className="text-xs font-semibold text-zinc-300">Local connector URL
        <input value={url} onChange={(event) => { setUrl(event.target.value); setState(null); }} inputMode="url" autoComplete="url" spellCheck={false} className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 font-mono text-xs text-zinc-100" placeholder="http://localhost:4318" />
      </label>
      <label className="text-xs font-semibold text-zinc-300">Pairing token <span className="font-normal text-zinc-500">(only when required)</span>
        <input value={token} onChange={(event) => { setToken(event.target.value); setState(null); }} type="password" autoComplete="off" className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-zinc-100" placeholder="Paste a local pairing token" />
      </label>
      <button type="button" onClick={() => void testAndSave()} disabled={testing} className="rounded-xl bg-cyan-400 px-4 py-3 text-xs font-bold text-zinc-950 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">{testing ? <span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />Testing…</span> : 'Test & save'}</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
      {state && <span className="inline-flex items-center gap-1.5 text-emerald-300"><CheckCircle2 className="h-4 w-4" />{connectorMessage(state.health)}</span>}
      {error && <span role="alert" className="inline-flex items-center gap-1.5 text-rose-300"><CircleAlert className="h-4 w-4" />{error}</span>}
      {token && <button type="button" onClick={clearToken} className="font-semibold text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">Clear saved pairing token</button>}
    </div>
    <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] leading-relaxed text-zinc-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />This check contacts only the connector health endpoint. It does not scan a repository, run an agent, start a workflow, or change files. The pairing token is kept only for this browser session.</p>
  </section>;
}
