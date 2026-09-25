import { Check, CheckCircle2, Clipboard, Download, ExternalLink, HelpCircle, Terminal, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useClipboard } from '../../hooks/useClipboard';

type ConnectorState = 'connected' | 'attention' | 'not-connected';

interface Props {
  state: ConnectorState;
  connectorUrl: string;
  websiteOrigin: string;
  onOpenConnection: () => void;
}

const fallbackPackagePath = '/downloads/spec-kit-studio-local-connector-0.1.1.tgz';

function isDownloadPath(value: unknown): value is string {
  return typeof value === 'string' && /^\/downloads\/spec-kit-studio-local-connector-[\d.]+\.tgz$/.test(value);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const { copied, copy } = useClipboard();
  return <button type="button" onClick={() => void copy(value)} className="connector-setup-copy inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold">
    {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copied ? 'Copied' : label}
  </button>;
}

export function LocalConnectorSetup({ state, connectorUrl, websiteOrigin, onOpenConnection }: Props) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [packagePath, setPackagePath] = useState(fallbackPackagePath);
  useEffect(() => {
    let cancelled = false;
    // The release manifest lets the hosted UI offer the matching connector
    // package without hard-coding a version into every UI release. Older
    // deployments retain a safe, explicit fallback package path.
    fetch('/downloads/local-connector.json')
      .then((response) => response.ok ? response.json() : null)
      .then((manifest: unknown) => {
        const candidate = manifest && typeof manifest === 'object' ? (manifest as { downloadPath?: unknown }).downloadPath : undefined;
        if (!cancelled && isDownloadPath(candidate)) setPackagePath(candidate);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);
  const downloadUrl = `${websiteOrigin}${packagePath}`;
  const installCommand = `npm install --global ${downloadUrl}`;
  const settingsTemplate = `STUDIO_CONNECTOR_MODE=production\nSTUDIO_ALLOWED_ROOTS="/absolute/path/to/your/studio-repositories"\nSTUDIO_ALLOWED_ORIGINS="${websiteOrigin}"\nSTUDIO_CONNECTOR_TOKEN="paste-a-long-random-token-here"`;
  const label = state === 'connected' ? 'Connector connected' : state === 'attention' ? 'Connector needs attention' : 'Connector not connected yet';
  const summary = state === 'connected' ? `Ready at ${connectorUrl}` : state === 'attention' ? 'Check its URL, pairing token, or local settings' : 'Install, start, and pair it before scanning a repository';

  return <>
    <details className={`local-connector-setup local-connector-setup--${state} rounded-2xl border`} open={state !== 'connected'}>
      <summary className="cursor-pointer list-none p-4 md:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3"><div className="local-connector-setup-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Terminal className="h-5 w-5" /></div><div><p className="text-[10px] font-black uppercase tracking-[0.16em]">Before you begin</p><h2 className="mt-0.5 font-bold">Local connector</h2><p className="mt-1 text-xs">{summary}</p></div></div>
          <span className="local-connector-setup-status inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold">{state === 'connected' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}{label}</span>
        </div>
      </summary>
      <div className="local-connector-setup-body border-t p-4 md:p-5">
        <p className="max-w-3xl text-sm">Studio cannot inspect your local repository or use a local agent until this loopback connector is running on this computer. It never gives the hosted website direct access to your files or agent account.</p>
        <ol className="mt-5 grid gap-3 text-sm md:grid-cols-2">
          <li className="local-connector-setup-step rounded-xl border p-4"><span className="text-[10px] font-black uppercase tracking-[0.14em]">Step 1</span><h3 className="mt-1 font-bold">Download the connector</h3><p className="mt-1 text-xs">Download the small local package. You do not need a Studio source clone.</p><a href={packagePath} download className="connector-setup-primary mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold"><Download className="h-3.5 w-3.5" />Download connector</a></li>
          <li className="local-connector-setup-step rounded-xl border p-4"><span className="text-[10px] font-black uppercase tracking-[0.14em]">Step 2</span><h3 className="mt-1 font-bold">Install the downloaded package</h3><p className="mt-1 text-xs">Paste this into Terminal. It installs the connector globally, not your repository.</p><code className="local-connector-setup-command mt-3 block overflow-x-auto rounded-lg p-3 text-[11px]">{installCommand}</code><CopyButton value={installCommand} label="Copy install command" /></li>
          <li className="local-connector-setup-step rounded-xl border p-4"><span className="text-[10px] font-black uppercase tracking-[0.14em]">Step 3</span><h3 className="mt-1 font-bold">Create private local settings</h3><p className="mt-1 text-xs">In Terminal, create and enter a settings folder, then add a `.env.local` file there.</p><code className="local-connector-setup-command mt-3 block rounded-lg p-3 text-[11px]">mkdir -p "$HOME/.spec-kit-studio-connector"<br />cd "$HOME/.spec-kit-studio-connector"</code><CopyButton value={'mkdir -p "$HOME/.spec-kit-studio-connector"\ncd "$HOME/.spec-kit-studio-connector"'} label="Copy folder commands" /></li>
          <li className="local-connector-setup-step rounded-xl border p-4"><span className="text-[10px] font-black uppercase tracking-[0.14em]">Step 4</span><h3 className="mt-1 font-bold">Start and pair</h3><p className="mt-1 text-xs">Run the connector from that settings folder, then enter its URL and pairing token in Connection settings.</p><code className="local-connector-setup-command mt-3 block rounded-lg p-3 text-[11px]">spec-kit-studio-connector</code><div className="mt-3 flex flex-wrap gap-2"><CopyButton value="spec-kit-studio-connector" label="Copy start command" /><button type="button" onClick={onOpenConnection} className="connector-setup-copy inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold">Open connection settings</button></div></li>
        </ol>
        <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-2 text-xs font-bold underline"><HelpCircle className="h-4 w-4" />Open the complete setup guide</button><a href={packagePath} download className="inline-flex items-center gap-2 text-xs font-bold underline"><ExternalLink className="h-4 w-4" />Download package again</a></div>
      </div>
    </details>

    <Modal isOpen={guideOpen} onClose={() => setGuideOpen(false)} ariaLabel="Local connector setup guide" className="items-center justify-center p-4">
      <section className="local-connector-guide max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border p-5 md:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em]">Local setup guide</p><h2 className="mt-1 text-xl font-bold">Connect this Studio site to your computer</h2><p className="mt-2 text-sm">Follow these steps in order. The connector remains local; your repository and agent credentials do not move to Vercel.</p></div><button type="button" onClick={() => setGuideOpen(false)} className="connector-setup-copy rounded-lg border px-3 py-2 text-xs font-bold">Close</button></div>
        <div className="mt-6 space-y-5 text-sm"><section><h3 className="font-bold">1. Install the package</h3><p className="mt-1">Use the copied install command from Step 2 above. It requires Node 22.12 or newer.</p></section><section><h3 className="font-bold">2. Add a local `.env.local` file</h3><p className="mt-1">Create it in `$HOME/.spec-kit-studio-connector`. Choose the narrowest directory containing your approved repository and worktrees. Generate a pairing token with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.</p><code className="local-connector-setup-command mt-3 block overflow-x-auto rounded-lg p-3 text-[11px] whitespace-pre">{settingsTemplate}</code><div className="mt-2"><CopyButton value={settingsTemplate} label="Copy settings template" /></div></section><section><h3 className="font-bold">3. Start it locally</h3><p className="mt-1">From the settings folder, run `spec-kit-studio-connector` and leave that terminal open. Visit `{connectorUrl}/health`; a healthy connector reports `status: ok`.</p></section><section><h3 className="font-bold">4. Pair Studio</h3><p className="mt-1">In Connection settings, enter `{connectorUrl}`, the same pairing token, and a repository path inside your allowed root. Scan is read-only. Codex, Claude, Copilot, and future agents keep using the account already signed in locally.</p></section><section><h3 className="font-bold">Keep it safe</h3><p className="mt-1">Never put the pairing token or local path in Vercel. Do not expose the connector on your network. Stop it with `Ctrl+C` when you are done.</p></section></div>
      </section>
    </Modal>
  </>;
}
