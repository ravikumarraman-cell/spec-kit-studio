import { useState } from 'react';
import { Archive, CheckCircle2, Code2, Download, FileCheck2, GitBranch, PackageCheck } from 'lucide-react';
import { FeatureInboxItem, PersonaId, SpecKitProject } from '../../types/speckit';
import { featureArtifactRoot } from '../../lib/projectIdentity';
import { selectedEngineContract } from '../../lib/sddEngineWorkflow';
import { downloadBlob, engineFeatureExportIssues, generateEngineFeaturePackageZip, generateFeaturePackageZip } from '../../lib/export';
import { userFacingActionError } from '../../lib/workflowUx';
import { ArchiveTree } from '../common/ArchiveTree';
import { PullRequestPublication } from './PullRequestPublication';
import { personaCatalogEntry } from '../../lib/personas/catalog';

interface Props {
  project: SpecKitProject;
  feature: FeatureInboxItem;
  onReviewImplementation: () => void;
  onPullRequestPublished: (pullRequest: NonNullable<FeatureInboxItem['pullRequest']>) => void;
  /** Review mode is the Stage 8 decision surface; complete mode is the final archive surface. */
  mode?: 'review' | 'complete';
  ownerPersona?: PersonaId;
  verification?: { state: 'not-run' | 'running' | 'passed'; output?: string };
  completionLabel?: string;
  canComplete?: boolean;
  onComplete?: () => void;
}

/**
 * The final delivery boundary is shared regardless of the person who ran the
 * work. It makes clear that Spec-Kit artifacts, Studio review evidence, and
 * application code have different recipients and transfer mechanisms.
 */
export function FeatureDeliveryHandoff({ project, feature, onReviewImplementation, onPullRequestPublished, mode = 'complete', ownerPersona, verification = { state: 'not-run' }, completionLabel = 'Done with this handoff', canComplete = false, onComplete }: Props) {
  const [isPackaging, setIsPackaging] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const engine = selectedEngineContract(project);
  const enginePackageReady = engineFeatureExportIssues(project, feature).length === 0;
  const root = featureArtifactRoot(feature);
  const packageName = feature.slug || feature.id || project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const studioRoot = `.specify/studio/delivery/${feature.slug || feature.id}`;
  const receipts = feature.implementationReceipts || [];
  const ownerLabel = ownerPersona ? personaCatalogEntry(ownerPersona).label : 'Delivery team';
  const reviewMode = mode === 'review';
  const changedFiles = [...new Set(receipts.flatMap((receipt) => receipt.changedFiles))];
  const enginePaths = [
    feature.specification?.path || `${root}/spec.md`,
    feature.architecturePlan?.path || `${root}/plan.md`,
    feature.deliveryPlan?.path || `${root}/tasks.md`,
  ];
  const deliveryEvidencePaths = [
    ...enginePaths,
    `${studioRoot}/manifest.json`,
    `${studioRoot}/implementation-receipts.json`,
    ...(feature.pullRequest ? [`${studioRoot}/pull-request.json`] : []),
    `${studioRoot}/ci-pr-template.md`,
  ];

  const downloadEngineHandoff = async () => {
    try {
      setIsPackaging(true);
      setPackageError(null);
      downloadBlob(await generateEngineFeaturePackageZip(project, feature), `${packageName}-engine-handoff.zip`);
    } catch (error) {
      setPackageError(userFacingActionError('package this engine handoff', error, 'Couldn’t package this engine handoff. Review the accepted artifacts and try again.'));
    } finally {
      setIsPackaging(false);
    }
  };

  const downloadDeliveryEvidence = async () => {
    try {
      setIsPackaging(true);
      setPackageError(null);
      downloadBlob(await generateFeaturePackageZip(project, feature), `${packageName}-delivery-evidence.zip`);
    } catch (error) {
      setPackageError(userFacingActionError('package this delivery evidence', error, 'Couldn’t package this delivery evidence. Try again.'));
    } finally {
      setIsPackaging(false);
    }
  };

  return <section id="developer-delivery-handoff" className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 md:p-6" aria-label="Developer delivery handoff">
    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300"><CheckCircle2 className="h-4 w-4" />{ownerLabel} delivery handoff</p>
    <h2 className="mt-2 text-xl font-bold text-zinc-100">{reviewMode ? 'Review this handoff before you approve it' : `Here is exactly what ${ownerLabel} is handing over`}</h2>
    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">{reviewMode ? 'Confirm the final verification, task-by-task review evidence, and deliverables below. Approval records the final handoff; it does not commit, push, merge, or deploy code.' : 'The work is complete in Studio only after its evidence is reviewed. This handoff separates the engine-ready design artifacts, the human review record, and the application code so a receiver knows precisely what to use.'}</p>

    <div className="mt-5 grid gap-3 lg:grid-cols-3">
      <article className="rounded-xl border border-emerald-400/25 bg-zinc-950/45 p-4">
        <PackageCheck className="h-5 w-5 text-emerald-300" />
        <p className="mt-3 text-sm font-bold text-zinc-100">1. Engine-compatible feature package</p>
        <p className="mt-1 text-xs leading-5 text-zinc-300"><strong>{engine.label} {engine.version}</strong> receives the accepted specification, technical plan, delivery tasks, active-feature pointer, and constitution. These are the portable, engine-owned inputs.</p>
      </article>
      <article className="rounded-xl border border-cyan-400/25 bg-zinc-950/45 p-4">
        <FileCheck2 className="h-5 w-5 text-cyan-300" />
        <p className="mt-3 text-sm font-bold text-zinc-100">2. Review evidence</p>
        <p className="mt-1 text-xs leading-5 text-zinc-300"><strong>{receipts.length} reviewed task receipt{receipts.length === 1 ? '' : 's'}</strong> records the changed files, agent output, and focused verification that reviewers use to assess the implementation.</p>
      </article>
      <article className="rounded-xl border border-violet-400/25 bg-zinc-950/45 p-4">
        <Code2 className="h-5 w-5 text-violet-300" />
        <p className="mt-3 text-sm font-bold text-zinc-100">3. Code handoff</p>
        <p className="mt-1 text-xs leading-5 text-zinc-300">Application code stays in the connected worktree on <strong>{feature.branch || 'the feature branch'}</strong>. A developer shares it through the normal repository review or pull-request process.</p>
      </article>
    </div>

    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <article className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-cyan-100"><GitBranch className="h-3.5 w-3.5" />Code remains intentionally separate</p>
        <p className="mt-2 text-xs leading-5 text-zinc-300">Studio never commits, pushes, merges, deploys, or copies application source into a handoff archive. A developer may explicitly create a pull request below after their normal commit-and-push process. The receiving developer can inspect the {changedFiles.length} recorded changed file{changedFiles.length === 1 ? '' : 's'} and then use the repository’s approved change-control process.</p>
      </article>
      <article className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-2 text-xs font-bold text-emerald-100"><Archive className="h-3.5 w-3.5" />Choose the package the receiver needs</p>
        <p className="mt-2 text-xs leading-5 text-zinc-300">Download the selected engine-compatible feature package for an SDD receiver, or delivery evidence for a reviewer. Review implementation history when you need the task-by-task proof.</p>
      </article>
    </div>

    {reviewMode ? <><div className={`mt-4 rounded-xl border p-4 ${verification.state === 'passed' ? 'border-emerald-400/30 bg-emerald-500/5' : 'border-amber-400/30 bg-amber-500/10'}`}><p className="text-xs font-bold text-zinc-100">Final repository verification</p><p className="mt-1 text-xs leading-5 text-zinc-300">{verification.state === 'passed' ? 'Passed. Review the result and the handoff contents, then complete this handoff.' : verification.state === 'running' ? 'Running now. Studio will unlock completion only after it passes.' : 'Not run yet. Complete final verification before this handoff can be finished.'}</p>{verification.output && <details className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"><summary className="cursor-pointer text-xs font-bold text-cyan-100">View verification output</summary><pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-zinc-300">{verification.output}</pre></details>}</div><div className="mt-4 border-t border-emerald-400/20 pt-4"><button type="button" onClick={onComplete} disabled={!canComplete || !onComplete} className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50">{completionLabel}</button><p className="mt-2 text-xs text-zinc-400">{canComplete ? 'This records the final handoff approval. It does not commit, push, merge, or deploy code.' : 'Available after final verification is recorded.'}</p></div></> : <><ArchiveTree paths={deliveryEvidencePaths} rootLabel={`${feature.slug || feature.id}-delivery-evidence`} />
    <div className="mt-4"><PullRequestPublication project={project} feature={feature} onPublished={onPullRequestPublished} /></div>
    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-zinc-950/35 p-4">
      <p className="text-xs font-bold text-zinc-100">Download the handoff</p>
      <p className="mt-1 text-xs leading-5 text-zinc-300">These downloads are limited to this delivery item. Neither archive contains application code or changes the repository.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={downloadEngineHandoff} disabled={isPackaging || !enginePackageReady} title={enginePackageReady ? 'Download the selected engine’s validated feature package.' : 'The selected engine package is locked until spec, plan, and tasks validate.'} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"><Download className="h-4 w-4" />{isPackaging ? 'Preparing download…' : 'Download engine-compatible feature package'}</button>
        <button type="button" onClick={downloadDeliveryEvidence} disabled={isPackaging} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/35 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-100 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"><Archive className="h-4 w-4" />Download delivery evidence</button>
        <button type="button" onClick={onReviewImplementation} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 px-4 py-2.5 text-sm font-bold text-cyan-100 hover:bg-cyan-500/10"><FileCheck2 className="h-4 w-4" />Review implementation evidence</button>
      </div>
      {packageError && <p role="alert" className="mt-3 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{packageError}</p>}
    </div></>}
  </section>;
}
