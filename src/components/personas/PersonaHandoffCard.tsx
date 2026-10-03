import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Download, FileText, Users } from 'lucide-react';
import { EngineContractDescriptor } from '../../lib/sddEngineWorkflow';
import { ArchiveTree } from '../common/ArchiveTree';
import { HandoffDeliverable, PersonaHandoffDeliverables } from './PersonaHandoffDeliverables';

interface Props {
  personaLabel: string;
  artifactLabel: string;
  title: string;
  recipients: string;
  deliverables: HandoffDeliverable[];
  repositoryNote: string;
  artifactPath?: string;
  artifactMarkdown?: string;
  engineContract: EngineContractDescriptor;
  engineArtifact?: { kind: string; path: string; content: string };
  archivePaths?: string[];
  onDownload?: () => void | Promise<void>;
  onDownloadEngineArtifact?: () => void | Promise<void>;
  onContinue: () => void;
  onDashboard: () => void;
  continueLabel: string;
  primaryActionDescription?: string;
  onFinish?: () => void;
  finishLabel?: string;
  downloadLabel?: string;
  nextStepGuidance?: string;
  onAlternativeContinue?: () => void;
  alternativeContinueLabel?: string;
}

/** A role-neutral completion state: show the finished artifact, its consumers,
 * and the single safe next step rather than leaving a persona route ambiguous. */
export function PersonaHandoffCard({ personaLabel, artifactLabel, title, recipients, deliverables, repositoryNote, artifactPath, artifactMarkdown, engineContract, engineArtifact, archivePaths, onDownload, onDownloadEngineArtifact, onContinue, onDashboard, continueLabel, primaryActionDescription, onFinish, finishLabel, downloadLabel = 'Download handoff (.zip)', nextStepGuidance, onAlternativeContinue, alternativeContinueLabel }: Props) {
  return <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5" aria-label={`${personaLabel} handoff complete`}>
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-emerald-200"><CheckCircle2 className="h-4 w-4" />{personaLabel} workflow complete</p>
    <h2 className="mt-2 text-lg font-bold text-zinc-100">{title}</h2>
    <p className="mt-1 text-sm text-zinc-300">Your reviewed <strong>{artifactLabel}</strong> package is ready as a durable, feature-scoped handoff. The next role receives it as read-only context and makes its own review decision.</p>
    <PersonaHandoffDeliverables deliverables={deliverables} />
    {nextStepGuidance && <p className="mt-4 rounded-xl border border-emerald-300/30 bg-zinc-950/30 p-3 text-sm font-semibold leading-6 text-emerald-50">{nextStepGuidance}</p>}
    <div className="mt-5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200">{onFinish ? 'Your work is complete' : 'Recommended next step'}</p>
      {onFinish ? <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-50/90">Finish here when your review is complete. Your approved handoff stays available for the next role.</p> : primaryActionDescription && <p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-50/90">{primaryActionDescription}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {onFinish && finishLabel && <button type="button" onClick={onFinish} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-300"><BadgeCheck className="h-4 w-4" />{finishLabel}</button>}
        {!onFinish && <button type="button" onClick={onContinue} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-300">{continueLabel}<ArrowRight className="h-4 w-4" /></button>}
      </div>
      {onFinish && primaryActionDescription && <div className="mt-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-200">Optional continuation</p><p className="mt-1 max-w-2xl text-xs leading-5 text-emerald-50/90">{primaryActionDescription}</p></div>}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold">
        {onFinish && <button type="button" onClick={onContinue} className="inline-flex items-center gap-1 text-cyan-100 hover:text-cyan-50">{continueLabel}<ArrowRight className="h-3.5 w-3.5" /></button>}
        {onAlternativeContinue && alternativeContinueLabel && <button type="button" onClick={onAlternativeContinue} className="inline-flex items-center gap-1 text-violet-100 hover:text-violet-50">{alternativeContinueLabel}<ArrowRight className="h-3.5 w-3.5" /></button>}
        {!onFinish && <button type="button" onClick={onDashboard} className="inline-flex items-center gap-1 text-emerald-100 hover:text-emerald-50"><ArrowLeft className="h-3.5 w-3.5" />Back to Home</button>}
      </div>
    </div>
    {(onDownload || (onDownloadEngineArtifact && engineArtifact)) && <details className="mt-4 rounded-xl border border-emerald-400/20 bg-zinc-950/25 p-3"><summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-emerald-100"><Download className="h-3.5 w-3.5" />Download or inspect files <span className="font-normal text-zinc-400">· optional</span></summary><div className="mt-3 flex flex-wrap gap-2">{onDownload && <button type="button" onClick={() => { void onDownload(); }} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300/45 px-3 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-500/10"><Download className="h-3.5 w-3.5" />{downloadLabel}</button>}{onDownloadEngineArtifact && engineArtifact && <button type="button" onClick={() => { void onDownloadEngineArtifact(); }} className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/45 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-500/10"><Download className="h-3.5 w-3.5" />Download canonical {engineArtifact.kind}.md</button>}</div></details>}
    <details className="mt-4 rounded-xl border border-emerald-400/20 bg-zinc-950/25 p-3"><summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-emerald-100"><Users className="h-3.5 w-3.5" />View recipients and technical details</summary><div className="mt-3 grid gap-3 md:grid-cols-2"><article className="rounded-lg border border-emerald-400/20 bg-zinc-950/35 p-3"><p className="text-xs font-bold text-emerald-100">Who receives it</p><p className="mt-1 text-xs leading-5 text-zinc-300">{recipients}</p></article><article className="rounded-lg border border-emerald-400/20 bg-zinc-950/35 p-3"><p className="flex items-center gap-2 text-xs font-bold text-emerald-100"><BadgeCheck className="h-3.5 w-3.5" />Engine artifact</p><p className="mt-1 text-xs leading-5 text-zinc-300">{!engineContract.available ? `${engineContract.label} ${engineContract.version} is selected, but no verified adapter is available.` : engineArtifact ? `This accepted ${engineArtifact.kind}.md is included at ${engineArtifact.path}. A complete engine package additionally requires accepted spec.md, plan.md, and tasks.md.` : `No accepted engine artifact is available. A complete ${engineContract.label} package requires accepted spec.md, plan.md, and tasks.md.`}</p></article></div><p className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs leading-5 text-cyan-100"><strong>Repository handoff:</strong> {repositoryNote}</p>{artifactPath && <><p className="mt-3 text-xs text-zinc-300">The package includes <strong>{artifactLabel}</strong> at <code className="text-emerald-100">{artifactPath}</code>{engineArtifact && <> and its canonical <strong>{engineArtifact.kind}.md</strong> at <code className="text-emerald-100">{engineArtifact.path}</code></>}.</p>{archivePaths && <ArchiveTree paths={archivePaths} rootLabel={`${personaLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-handoff`} />}{engineArtifact && <details className="mt-3 rounded-lg border border-cyan-400/20 bg-zinc-950/25 p-3"><summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-cyan-100"><FileText className="h-3.5 w-3.5" />View canonical {engineArtifact.kind}.md <span className="font-normal text-zinc-400">· {engineArtifact.path}</span></summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs leading-5 text-zinc-300">{engineArtifact.content}</pre></details>}{artifactMarkdown && <details className="mt-3 rounded-lg border border-emerald-400/20 bg-zinc-950/25 p-3"><summary className="flex cursor-pointer items-center gap-2 text-xs font-bold text-emerald-100"><FileText className="h-3.5 w-3.5" />View accepted artifact <span className="font-normal text-zinc-400">· {artifactPath}</span></summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 text-xs leading-5 text-zinc-300">{artifactMarkdown}</pre></details>}</>}</details>
  </section>;
}
