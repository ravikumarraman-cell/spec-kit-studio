import { ChangeEvent, useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { readStudioHandoff, StudioPortableHandoff } from '../../lib/personas/portableHandoff';
import { personaCatalogEntry } from '../../lib/personas/catalog';
import { PersonaId } from '../../types/speckit';

export interface HandoffImportResult { ok: boolean; message: string; }
interface Props { personaId: PersonaId; onImport: (handoff: StudioPortableHandoff) => HandoffImportResult; }

export function personaHandoffImportCopy(personaId: PersonaId) {
  const receiver = personaCatalogEntry(personaId).label;
  return {
    heading: 'Resume a previously exported Studio handoff',
    description: `Use this only when you have a Studio handoff from another delivery role or an earlier session. Studio restores its accepted evidence so ${receiver} can continue from the next relevant review stage.`,
  };
}

/** File boundary for resuming approved cross-persona work. It accepts only
 * Studio's bounded handoff archive/manifest and leaves repository access off. */
export function PersonaHandoffImport({ personaId, onImport }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const copy = personaHandoffImportCopy(personaId);
  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    setError(''); setMessage('');
    try {
      const result = onImport(await readStudioHandoff(file));
      if (result.ok) setMessage(result.message); else setError(result.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Studio could not import this handoff.'); }
  };
  return <details className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
    <summary className="cursor-pointer text-xs font-bold text-violet-100">{copy.heading}</summary>
    <p className="mt-3 text-xs leading-5 text-zinc-400">{copy.description} Your repository stays disconnected and unchanged.</p>
    <p className="mt-1 text-[11px] text-zinc-500">Accepted files: a Studio `.zip` package, `studio-persona-handoff.json`, or a PM reviewed-delivery handoff.</p>
    <button type="button" onClick={() => inputRef.current?.click()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-violet-300/45 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-500/10"><FileUp className="h-3.5 w-3.5" />Import a Studio handoff</button>
    <input ref={inputRef} type="file" accept=".zip,.json,application/json" className="sr-only" onChange={(event) => { void choose(event); }} />
    {message && <p role="status" className="mt-3 text-xs text-emerald-200">{message}</p>}
    {error && <p role="alert" className="mt-3 text-xs text-rose-200">{error}</p>}
  </details>;
}
