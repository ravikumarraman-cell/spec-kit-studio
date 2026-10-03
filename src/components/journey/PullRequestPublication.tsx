import { useMemo, useState } from 'react';
import { ExternalLink, Github, Send } from 'lucide-react';
import { DeliveryPullRequest, FeatureInboxItem, SpecKitProject } from '../../types/speckit';
import { configuredConnectorClient, configuredConnectorUrl, connectorPreflightProject } from '../../lib/connector';
import { getConnectorSessionToken } from '../../lib/connectorSession';
import { selectedEngineContract } from '../../lib/sddEngineWorkflow';
import { confirmStudioAction } from '../../lib/confirmation';

interface Props { project: SpecKitProject; feature: FeatureInboxItem; onPublished: (pullRequest: DeliveryPullRequest) => void; }

function defaultDescription(project: SpecKitProject, feature: FeatureInboxItem) {
  const engine = selectedEngineContract(project);
  const receipts = feature.implementationReceipts || [];
  const tasks = receipts.map((receipt) => `- [x] ${receipt.taskId}`).join('\n') || '- No Studio-reviewed task receipts were retained.';
  return `## Summary\n${feature.summary}\n\n## Spec-Driven Development artifacts\n- ${engine.label} ${engine.version}\n- ${feature.specification?.path || 'spec.md'}\n- ${feature.architecturePlan?.path || 'plan.md'}\n- ${feature.deliveryPlan?.path || 'tasks.md'}\n\n## Reviewed implementation\n${tasks}\n\n## Verification\nReview the attached Studio delivery evidence package and this repository's required checks before merging.\n\n## Studio boundary\nStudio retained task-level review evidence; it did not approve this pull request, merge it, or deploy it.`;
}

/** Provider-neutral publication UI. Today it uses the connector's trusted
 * GitHub publisher; future providers can implement the same request contract. */
export function PullRequestPublication({ project, feature, onPublished }: Props) {
  const existing = feature.pullRequest;
  const repositoryPath = feature.worktreePath || project.importedRepo?.repoUrl;
  const [title, setTitle] = useState(feature.title);
  const [baseBranch, setBaseBranch] = useState('main');
  const [body, setBody] = useState(() => defaultDescription(project, feature));
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState('');
  const client = useMemo(() => {
    const url = configuredConnectorUrl();
    return configuredConnectorClient(getConnectorSessionToken(url));
  }, []);

  if (existing) return <article className="rounded-xl border border-emerald-400/25 bg-emerald-500/5 p-4"><p className="flex items-center gap-2 text-xs font-bold text-emerald-100"><Github className="h-4 w-4" />GitHub pull request included in this handoff</p><a href={existing.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-cyan-200 underline underline-offset-4 hover:text-cyan-100">{existing.number ? `PR #${existing.number}` : 'Open pull request'}: {existing.title}<ExternalLink className="h-3.5 w-3.5" /></a><p className="mt-2 text-xs text-zinc-300">{existing.headBranch} → {existing.baseBranch} · created {new Date(existing.createdAt).toLocaleString()}</p></article>;

  if (!repositoryPath) return <article className="rounded-xl border border-zinc-700 bg-zinc-950/40 p-4"><p className="text-xs font-bold text-zinc-200">Pull-request publication is available after a connected feature worktree exists.</p><p className="mt-1 text-xs text-zinc-400">It is optional and never blocks the downloadable handoff packages.</p></article>;

  const publish = async () => {
    if (!title.trim() || !body.trim()) { setError('Add a pull-request title and description before publishing.'); return; }
    const confirmed = await confirmStudioAction({ title: 'Create GitHub pull request?', description: `Studio will ask your paired local connector to create a PR from this already-pushed, clean feature branch into ${baseBranch.trim() || 'main'}. It will not commit, merge, or deploy.`, confirmLabel: 'Create pull request', tone: 'caution' });
    if (!confirmed) return;
    try {
      setIsPublishing(true); setError('');
      const result = await client.createDeliveryPublication(repositoryPath, { provider: 'github', title: title.trim(), body: body.trim(), baseBranch: baseBranch.trim(), project: connectorPreflightProject(project, feature.id), featureId: feature.id });
      onPublished(result.publication);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Studio could not create the pull request.');
    } finally { setIsPublishing(false); }
  };

  return <details className="rounded-xl border border-violet-400/25 bg-violet-500/5 p-4"><summary className="cursor-pointer text-xs font-bold text-violet-100"><span className="inline-flex items-center gap-2"><Github className="h-4 w-4" />Optional: create a GitHub pull request</span></summary><div className="mt-4 grid gap-3"><p className="max-w-3xl text-xs leading-5 text-zinc-300">Use your existing local <code>gh</code> sign-in to create the PR after you have committed and pushed the reviewed feature branch. Studio records the resulting PR link and metadata in the delivery handoff; it never makes a hidden commit, merges, or deploys.</p><div className="grid gap-3 sm:grid-cols-[1fr_12rem]"><label className="grid gap-1 text-xs font-semibold text-zinc-200">Title<input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" /></label><label className="grid gap-1 text-xs font-semibold text-zinc-200">Base branch<input value={baseBranch} maxLength={160} onChange={(event) => setBaseBranch(event.target.value)} className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100" /></label></div><label className="grid gap-1 text-xs font-semibold text-zinc-200">Pull request description<textarea value={body} maxLength={12_000} rows={10} onChange={(event) => setBody(event.target.value)} className="resize-y rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs leading-5 text-zinc-100" /></label><button type="button" onClick={() => { void publish(); }} disabled={isPublishing} className="inline-flex w-fit items-center gap-2 rounded-xl bg-violet-400 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-violet-300 disabled:opacity-50"><Send className="h-4 w-4" />{isPublishing ? 'Creating pull request…' : 'Create GitHub pull request'}</button>{error && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-100">{error}</p>}</div></details>;
}
