import React from 'react';
import { ArrowRight, CheckCircle2, Compass } from 'lucide-react';
import { SpecKitProject, ViewTab } from '../../types/speckit';
import { createFeatureJourney, getJourneyStageForTab } from '../../lib/featureJourney';
import { activeDeliveryItemForProject, deliveryItemLabel } from '../../lib/deliveryItems';

interface Props { project: SpecKitProject; activeTab: ViewTab; onOpenJourney: () => void; onNavigate: (tab: ViewTab) => void; onApproveStage: (stageId: number) => void; }

export function JourneyHandoff({ project, activeTab, onOpenJourney, onNavigate, onApproveStage }: Props) {
  const handoff = getJourneyStageForTab(activeTab);
  if (!handoff) return null;
  const journey = project.journey || createFeatureJourney();
  const activeItem = activeDeliveryItemForProject(project);
  const scopeLabel = activeItem ? deliveryItemLabel(activeItem) : 'Delivery';
  const isCurrent = journey.activeStage === handoff.id;
  const isComplete = journey.completedStages.includes(handoff.id);
  if (!isCurrent && !isComplete) return null;
  const isReady = handoff.ready(project);
  const canApprove = isCurrent && isReady && !isComplete;
  const actionLabel = isComplete
    ? handoff.id === 8 ? 'View completed handoff' : 'Return to Feature Journey'
    : canApprove
      ? handoff.id === 8 ? 'Complete handoff' : `Approve Stage ${handoff.id} and continue`
      : isCurrent ? 'See what is needed to approve' : `Open ${scopeLabel} Journey`;
  const handlePrimaryAction = () => canApprove ? onApproveStage(handoff.id) : onOpenJourney();

  return <section className="mx-auto mb-6 max-w-5xl rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4 text-xs">
    <div className="flex gap-3">
      <div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-300"><Compass className="h-4 w-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">{scopeLabel} Journey · Stage {handoff.id}</p>
        <h2 className="mt-1 font-bold text-zinc-100">{isComplete ? handoff.id === 8 ? 'Handoff complete' : 'This stage is approved — you can still edit it.' : handoff.handoffTitle}</h2>
        <p className="mt-1 text-zinc-400">{isComplete ? handoff.id === 8 ? 'The feature’s full eight-stage history and export package are retained. You can edit and re-review its artifacts whenever needed.' : 'Your next stage is available in the Journey. Changes here remain editable and should be re-reviewed if they affect later decisions.' : handoff.handoffGuidance}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={handlePrimaryAction} className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 font-bold text-cyan-100 hover:bg-cyan-500/20">{actionLabel}<ArrowRight className="h-3.5 w-3.5" /></button>
          {handoff.id === 7 && <button type="button" onClick={() => onNavigate('tasks')} className="rounded-lg border border-zinc-700 px-3 py-2 font-bold text-zinc-200 hover:bg-zinc-800">Mark verified task in board</button>}
        </div>
        {isCurrent && !isComplete && !isReady && <p className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-200"><CheckCircle2 className="h-3.5 w-3.5" />{handoff.readyHint}</p>}
      </div>
    </div>
  </section>;
}
