import { ArrowRight, BarChart3, Code2, ShieldCheck, Sparkles } from 'lucide-react';
import { PersonaId } from '../../../types/speckit';

interface Props { onStartPersona: (personaId: PersonaId) => void; onPrefetch: () => void; }

const choices = [
  { label: 'Define a product outcome', persona: 'Product Manager', produces: 'Feature brief, user stories, and success measures', prerequisite: 'No repository required', personaId: 'product-manager' as const, icon: Sparkles },
  { label: 'Clarify a business need', persona: 'Business Analyst', produces: 'Scoped requirements and acceptance evidence', prerequisite: 'No repository required', personaId: 'business-analyst' as const, icon: BarChart3 },
  { label: 'Plan a technical change', persona: 'Developer / Architect', produces: 'Repository-grounded architecture and delivery plan', prerequisite: 'Repository required for technical evidence', personaId: 'developer' as const, icon: Code2 },
  { label: 'Assess security and risk', persona: 'Security Researcher', produces: 'Findings, evidence, and remediation guidance', prerequisite: 'Repository required for repository findings', personaId: 'security-researcher' as const, icon: ShieldCheck },
] as const;

/** The single first decision for a connected workspace without delivery scope. */
export function PersonaStartCard({ onStartPersona, onPrefetch }: Props) {
  return <section className="workspace-hub-next-action rounded-2xl border p-5 shadow-xs sm:p-6" aria-labelledby="start-outcome-title">
    <p className="workspace-hub-eyebrow text-[10px] font-black uppercase tracking-[0.16em]">START A DELIVERY</p>
    <h2 id="start-outcome-title" className="workspace-hub-title mt-1 text-xl font-bold">What do you need to accomplish?</h2>
    <p className="workspace-hub-muted mt-1 max-w-3xl text-sm leading-6">Start from the outcome you need. Studio keeps its decisions, evidence, and handoff connected as the work progresses.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {choices.map(({ label, persona, produces, prerequisite, personaId, icon: Icon }) => <button key={label} type="button" onPointerEnter={onPrefetch} onFocus={onPrefetch} onClick={() => onStartPersona(personaId)} className="workspace-hub-outcome group flex min-h-36 items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2">
        <span className="workspace-hub-outcome-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1"><span className="workspace-hub-title block text-sm font-bold">{label}</span><span className="workspace-hub-muted mt-0.5 block text-xs font-semibold">{persona}</span><span className="workspace-hub-muted mt-3 block text-xs leading-5">Produces: {produces}</span><span className="workspace-hub-prerequisite mt-2 block text-[11px] font-semibold">{prerequisite}</span></span>
        <ArrowRight className="workspace-hub-muted mt-1 h-4 w-4 shrink-0 transition group-hover:translate-x-0.5" />
      </button>)}
    </div>
  </section>;
}
