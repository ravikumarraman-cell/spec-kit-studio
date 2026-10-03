import { CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import type { FeatureInboxItem, PersonaId } from '../../types/speckit';
import { formatElapsed } from '../../lib/journeyObservability';
import { personaWorkflowObservabilitySummary } from '../../lib/personas/personaObservability';
import { ProgressiveDisclosure } from '../common/ProgressiveDisclosure';

interface Props { feature: FeatureInboxItem; personaId: PersonaId; }

/** Feature-owned delivery awareness for a completed specialist workflow.
 * It distinguishes retained human review evidence from actual automated runs. */
export function PersonaDeliveryObservability({ feature, personaId }: Props) {
  const summary = personaWorkflowObservabilitySummary(feature, personaId);
  const attemptLabel = `${summary.automationAttempts.length} automated attempt${summary.automationAttempts.length === 1 ? '' : 's'}`;
  return <ProgressiveDisclosure className="journey-supporting-details rounded-xl border p-1" tone={summary.retries ? 'context' : 'complete'} label="Delivery awareness" summary={`${summary.completed ? 'Completed' : 'Ready to finish'} · ${formatElapsed(summary.elapsedMs)} recorded elapsed · ${attemptLabel}`}>
    <section className="p-3 text-xs">
      <p className="text-zinc-300">This is a feature record, not an estimate of active work time. It shows retained milestones and only automation activity Studio actually observed.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3"><Metric icon={<Clock3 className="h-4 w-4" />} label="Recorded elapsed" value={formatElapsed(summary.elapsedMs)} /><Metric icon={<CheckCircle2 className="h-4 w-4" />} label="Review" value={summary.acceptedAt ? 'Approved' : 'Not recorded'} /><Metric icon={<Sparkles className="h-4 w-4" />} label="Automation" value={attemptLabel} /></div>
      <ol className="mt-4 space-y-2 border-l border-zinc-700 pl-4">
        <TimelineItem label="First retained input" value={summary.startedAt} />
        {summary.acceptedAt && <TimelineItem label="Review approved" value={summary.acceptedAt} />}
        {summary.completedAt && <TimelineItem label="Role marked done" value={summary.completedAt} />}
      </ol>
      <p className="mt-3 text-zinc-400">{summary.retries ? `${summary.retries} automated retry${summary.retries === 1 ? '' : 'ies'} retained for this feature.` : 'No automated retries were retained for this feature.'}</p>
    </section>
  </ProgressiveDisclosure>;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"><span className="text-cyan-200">{icon}</span><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p><p className="mt-1 font-bold text-zinc-100">{value}</p></div>; }
function TimelineItem({ label, value }: { label: string; value: string }) { return <li className="relative text-zinc-300 before:absolute before:-left-[1.35rem] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-emerald-300"><strong className="text-zinc-100">{label}</strong><time className="ml-2 text-zinc-400" dateTime={value}>{new Date(value).toLocaleString()}</time></li>; }
