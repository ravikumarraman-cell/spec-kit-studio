import { FeatureInboxItem, SpecKitProject } from '../types/speckit';
import { activeFeatureForProject } from './featureJourney';

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
export function officialFeatureIdentity(feature: FeatureInboxItem, ordinal: number): { featureKey: string; slug: string } {
  const year = new Date(feature.importedAt || Date.now()).getUTCFullYear();
  const featureKey = feature.featureKey || `FEAT-${Number.isFinite(year) ? year : new Date().getUTCFullYear()}-${ordinal + 1}`;
  const slug = /^\d{3,}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(feature.slug || '')
    ? feature.slug!
    : `${String(Math.max(1, ordinal + 1)).padStart(3, '0')}-${slugify(feature.title)}`;
  return { featureKey, slug };
}

/** @deprecated Use officialFeatureIdentity. Retained for persisted-workspace migrations. */
export const legacyFeatureIdentity = officialFeatureIdentity;

export interface IdentityIssue { code: string; message: string; }

export function identityIssues(project: SpecKitProject, feature = activeFeatureForProject(project)): IdentityIssue[] {
  const issues: IdentityIssue[] = [];
  if (!project.repositoryIdentity?.canonicalRemote) issues.push({ code: 'repository-unbound', message: 'This Studio project is not yet bound to a canonical Git remote. Re-scan Connected Workspace before running agents.' });
  if (feature && (!feature.featureKey || !feature.slug)) issues.push({ code: 'feature-unbound', message: `"${feature.title}" needs a feature key and slug before it can be executed safely.` });
  if (feature?.worktreePath && !feature.branch) issues.push({ code: 'worktree-branch-missing', message: 'The feature has a worktree path but no branch identity.' });
  return issues;
}
