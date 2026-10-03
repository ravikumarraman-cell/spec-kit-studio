import { Layers } from 'lucide-react';
import { FeatureInboxItem } from '../../types/speckit';
import { availablePersonaInputs, PersonaConsumer } from '../../lib/personas/consumption';
import { personaCatalogEntry } from '../../lib/personas/catalog';

interface Props { feature: FeatureInboxItem; consumer: PersonaConsumer; }

/** A compact shared disclosure showing exactly which reviewed inputs a role can use. */
export function PersonaInputSummary({ feature, consumer }: Props) {
  const inputs = availablePersonaInputs(feature, consumer);
  if (!inputs.length) return null;
  return <div className="mt-4 rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-3 text-xs text-zinc-300"><p className="flex items-center gap-2 font-bold text-cyan-100"><Layers className="h-4 w-4" />Reviewed inputs available to this role</p><ul className="mt-2 space-y-1">{inputs.map((input) => <li key={`${input.source}-${input.path}`}><span className="font-semibold text-zinc-100">{personaCatalogEntry(input.source).label}</span> · {input.purpose}</li>)}</ul><p className="mt-2 text-[11px] text-zinc-400">Inputs are read-only context. They do not replace human approval or alter the source artifact.</p></div>;
}
