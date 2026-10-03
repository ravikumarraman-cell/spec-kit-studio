import { BadgeCheck, FileCheck2 } from 'lucide-react';
import { useState } from 'react';
import type { DashboardViewModel } from '../../../lib/dashboard/dashboardViewModel';
import type { FeatureInboxItem } from '../../../types/speckit';
import { PersonaDeliveryObservability } from '../../personas/PersonaDeliveryObservability';
import { ReceivingRolePreview } from '../../common/ReceivingRolePreview';

interface Props {
  handoff: NonNullable<DashboardViewModel['personaHandoff']>;
  feature: FeatureInboxItem;
}

/** Home view for any completed persona boundary. It deliberately does not
 * imply that the eight-stage engineering Journey has begun. */
export function PersonaHandoffHomeCard({ handoff, feature }: Props) {
  const [previewOpen, setPreviewOpen] = useState(false);
  if (previewOpen) return <ReceivingRolePreview senderLabel={handoff.personaLabel} recipientLabel={handoff.recipientLabel} artifactLabel={handoff.title} feature={feature} onBack={() => setPreviewOpen(false)} />;
  return <section aria-labelledby="persona-handoff-home-title" className="workspace-hub-next-action rounded-2xl border p-5 shadow-xs sm:p-6">
    <p className="workspace-hub-eyebrow flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><BadgeCheck className="h-3.5 w-3.5" />{handoff.personaLabel} HANDOFF COMPLETE</p>
    <h2 id="persona-handoff-home-title" className="workspace-hub-title mt-2 text-xl font-bold">Your work has been handed off</h2>
    <p className="workspace-hub-muted mt-2 max-w-2xl text-sm leading-6">{handoff.description} The next step belongs to {handoff.recipientLabel}, who reviews the handoff before deciding whether to begin their work.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" onClick={() => setPreviewOpen(true)} className="workspace-hub-button workspace-hub-button--secondary inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold"><FileCheck2 className="h-4 w-4" />Preview receiving role</button>
      <p className="basis-full text-xs leading-5 opacity-80">This is a read-only preview of what {handoff.recipientLabel} receives next. It does not start their work, connect GitHub, or change the repository.</p>
    </div>
    <div className="mt-5"><PersonaDeliveryObservability feature={feature} personaId={handoff.personaId} /></div>
  </section>;
}
