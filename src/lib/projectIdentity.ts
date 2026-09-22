import { FeatureInboxItem, SpecKitProject } from '../types/speckit';

/**
 * Small, dependency-free identity helpers. They deliberately tolerate legacy
 * workspaces: an absent identity is surfaced as "needs setup", never guessed.
 */
export function normalizeGitRemote(value: string | undefined): string {
  return (value || '')
    .trim()
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .toLowerCase();
}

export function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 72) || 'feature';
}

export function featureArtifactRoot(feature: FeatureInboxItem): string {
  return `specs/${feature.slug || slugify(feature.title)}`;
}

/** Deterministic migration for features created before feature-scoped identity existed. */
export function legacyFeatureIdentity(feature: FeatureInboxItem, ordinal: number): Pick<FeatureInboxItem, 'featureKey' | 'slug'> {
  const year = new Date(feature.importedAt || Date.now()).getUTCFullYear();
  const featureKey = feature.featureKey || `FEAT-${Number.isFinite(year) ? year : new Date().getUTCFullYear()}-${ordinal + 1}`;
  return { featureKey, slug: feature.slug || `${featureKey.toLowerCase()}-${slugify(feature.title)}` };
}

export interface IdentityIssue { code: string; message: string; }

export function identityIssues(project: SpecKitProject, feature = project.featureInbox?.at(-1)): IdentityIssue[] {
  const issues: IdentityIssue[] = [];
  if (!project.repositoryIdentity?.canonicalRemote) issues.push({ code: 'repository-unbound', message: 'This Studio project is not yet bound to a canonical Git remote. Re-scan Connected Workspace before running agents.' });
  if (feature && (!feature.featureKey || !feature.slug)) issues.push({ code: 'feature-unbound', message: `"${feature.title}" needs a feature key and slug before it can be executed safely.` });
  if (feature?.worktreePath && !feature.branch) issues.push({ code: 'worktree-branch-missing', message: 'The feature has a worktree path but no branch identity.' });
  return issues;
}
