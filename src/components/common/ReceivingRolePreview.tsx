import { ArrowLeft, ArrowRight, CheckCircle2, CircleDashed, FileCheck2, LockKeyhole } from 'lucide-react';
import type { FeatureInboxItem } from '../../types/speckit';

interface Props {
  senderLabel: string;
  recipientLabel: string;
  artifactLabel: string;
  feature: FeatureInboxItem;
  onBack: () => void;
  /** Optional, explicit role adoption. The preview itself remains read-only. */
  onOpenRecipient?: () => void;
}

/** A reusable, non-destructive look at what the next role receives. */
export function ReceivingRolePreview({ senderLabel, recipientLabel, artifactLabel, feature, onBack, onOpenRecipient }: Props) {
  return <section aria-labelledby="receiving-role-preview-title" className="workspace-hub-next-action overflow-hidden rounded-2xl border shadow-xs">
    <div className="border-b border-cyan-300/20 bg-cyan-500/5 p-5 sm:p-6">
      <p className="workspace-hub-eyebrow flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><FileCheck2 className="h-3.5 w-3.5" />READ-ONLY HANDOFF PREVIEW</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div><h2 id="receiving-role-preview-title" className="workspace-hub-title text-xl font-bold">What {recipientLabel} receives next</h2><p className="workspace-hub-muted mt-2 max-w-2xl text-sm leading-6">Your {senderLabel} work is already complete. This is the context retained for the receiving role—not a request for you to continue the workflow.</p></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-100"><LockKeyhole className="h-3.5 w-3.5" />Nothing starts here</span>
      </div>
    </div>
    <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
      <article className="rounded-xl border border-emerald-300/25 bg-emerald-500/5 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-300" /><h3 className="mt-3 text-sm font-bold">Accepted {artifactLabel}</h3><p className="workspace-hub-muted mt-1 text-xs leading-5">The approved decision and retained source context travel with <strong>{feature.title}</strong>.</p></article>
      <article className="rounded-xl border border-cyan-300/25 bg-cyan-500/5 p-4"><FileCheck2 className="h-5 w-5 text-cyan-300" /><h3 className="mt-3 text-sm font-bold">Delivery evidence</h3><p className="workspace-hub-muted mt-1 text-xs leading-5">{feature.userStoryIds.length} attached user {feature.userStoryIds.length === 1 ? 'story' : 'stories'} and {feature.requirementIds.length} {feature.requirementIds.length === 1 ? 'requirement' : 'requirements'} are available for their review.</p></article>
      <article className="rounded-xl border border-violet-300/25 bg-violet-500/5 p-4"><CircleDashed className="h-5 w-5 text-violet-300" /><h3 className="mt-3 text-sm font-bold">Their decision</h3><p className="workspace-hub-muted mt-1 text-xs leading-5">{recipientLabel} reviews this context and decides their next safe action. That work remains theirs to begin.</p></article>
    </div>
    <div className="mx-5 rounded-xl border border-emerald-300/20 bg-emerald-500/5 p-4 text-xs leading-5 sm:mx-6"><strong>Preview guarantee:</strong> no role switch, GitHub connection, repository access, AI run, or approval happens from this screen.</div>
    <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6"><button type="button" onClick={onBack} className="workspace-hub-button workspace-hub-button--secondary inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold"><ArrowLeft className="h-4 w-4" />Back to completed handoff</button>{onOpenRecipient && <button type="button" onClick={onOpenRecipient} className="workspace-hub-button inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold">I am also the {recipientLabel}<ArrowRight className="h-4 w-4" /></button>} {onOpenRecipient && <p className="basis-full text-xs leading-5 opacity-80">Choose this only when you are intentionally taking the receiving role.</p>}</div>
  </section>;
}
