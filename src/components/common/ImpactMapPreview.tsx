import { FileSearch, FolderTree, Network, ShieldCheck, TestTube2 } from 'lucide-react';

type ImpactArea = 'ownership' | 'dependencies' | 'guardrails' | 'verification' | 'evidence';

interface ImpactSection {
  area: ImpactArea;
  title: string;
  items: string[];
}

const areaDetails: Record<ImpactArea, { label: string; icon: typeof FolderTree; tone: string }> = {
  ownership: { label: 'Owning areas', icon: FolderTree, tone: 'text-cyan-300' },
  dependencies: { label: 'Neighbours & contracts', icon: Network, tone: 'text-violet-300' },
  guardrails: { label: 'Guardrails & risks', icon: ShieldCheck, tone: 'text-amber-300' },
  verification: { label: 'Verification', icon: TestTube2, tone: 'text-emerald-300' },
  evidence: { label: 'Repository evidence', icon: FileSearch, tone: 'text-slate-300' },
};

function clean(value: string) {
  return value.replace(/^[-*]\s+/, '').replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function areaForHeading(heading: string): ImpactArea {
  if (/own|component|code path|affected area|surface/i.test(heading)) return 'ownership';
  if (/neighbou?r|depend|contract|api|schema|integration/i.test(heading)) return 'dependencies';
  if (/guardrail|constitution|risk|security|constraint/i.test(heading)) return 'guardrails';
  if (/test|verif|validation|check/i.test(heading)) return 'verification';
  return 'evidence';
}

/** Derives a compact decision preview from untrusted Markdown while retaining
 * the original source intact. Headings are advisory only, so legacy maps and
 * maps produced by different agents still render usefully. */
export function impactMapSections(content: string): ImpactSection[] {
  const chunks = content.trim().split(/^#{1,3}\s+/m).filter(Boolean);
  const sections = chunks.map((chunk, index) => {
    const [heading, ...body] = chunk.split('\n');
    const lines = (index === 0 ? body : body).map(clean).filter((line) => line && !line.startsWith('#'));
    return { area: areaForHeading(heading), title: clean(heading) || areaDetails.evidence.label, items: lines.slice(0, 5) };
  }).filter((section) => section.items.length);
  if (sections.length) return sections.slice(0, 6);
  const items = content.split('\n').map(clean).filter(Boolean).slice(0, 5);
  return items.length ? [{ area: 'evidence', title: areaDetails.evidence.label, items }] : [];
}

interface Props {
  content: string;
  acceptedAt?: string;
  defaultOpen?: boolean;
  className?: string;
}

export function ImpactMapPreview({ content, acceptedAt, defaultOpen = false, className = '' }: Props) {
  const sections = impactMapSections(content);
  const evidenceCount = sections.reduce((count, section) => count + section.items.length, 0);
  return <details className={`impact-map-preview rounded-xl border border-cyan-400/25 bg-cyan-500/5 p-4 text-xs ${className}`} open={defaultOpen}>
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
      <span className="flex items-center gap-2 font-bold text-cyan-100"><FileSearch className="h-4 w-4 text-cyan-300" />Impact map preview</span>
      <span className="text-[10px] text-zinc-400">{sections.length} evidence area{sections.length === 1 ? '' : 's'} · {evidenceCount} findings</span>
    </summary>
    <p className="mt-2 max-w-3xl text-[11px] leading-5 text-zinc-400">A read-only summary of the repository evidence used for the next design decision. Expand a card for the retained source when you need exact wording or traceability.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {sections.map((section, index) => {
        const detail = areaDetails[section.area]; const Icon = detail.icon;
        return <article key={`${section.title}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><div className="flex items-center gap-2"><Icon className={`h-3.5 w-3.5 ${detail.tone}`} /><p className="font-bold text-zinc-100">{section.title === detail.label ? detail.label : section.title}</p></div><ul className="mt-2 space-y-1 text-[11px] leading-5 text-zinc-300">{section.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`} className="flex gap-2"><span className="text-cyan-400">•</span><span>{item}</span></li>)}</ul></article>;
      })}
    </div>
    <details className="mt-3 border-t border-zinc-800 pt-3"><summary className="cursor-pointer font-semibold text-cyan-200">Inspect retained impact map source <span className="font-normal text-zinc-500">· {content.split('\n').filter((line) => line.trim()).length} lines</span></summary><pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 text-[10px] leading-relaxed text-zinc-300">{content}</pre></details>
    {acceptedAt && <p className="mt-3 text-[10px] text-emerald-300">Accepted {new Date(acceptedAt).toLocaleString()}</p>}
  </details>;
}
