import { SpecKitProject } from '../types/speckit';
import { normalizeGitRemote } from './projectIdentity';

/** A feature record can live in a separate Studio workspace after an explicit
 * "create separate workspace" choice. Surface it; never merge or move it
 * automatically because that could combine unrelated product histories. */
export function relatedFeatureWorkspaces(current: SpecKitProject, projects: SpecKitProject[]): SpecKitProject[] {
  if (current.featureInbox?.length) return [];
  const identity = normalizeGitRemote(current.repositoryIdentity?.canonicalRemote || current.importedRepo?.repoUrl);
  const retained = projects.filter((candidate) => candidate.id !== current.id && Boolean(candidate.featureInbox?.length));
  // If this workspace has not been scanned yet, identity cannot safely rule
  // anything out. Offer read-only workspace choices rather than presenting an
  // empty inbox as proof that the retained feature was deleted.
  if (!identity) return retained;
  const matching = retained.filter((candidate) => normalizeGitRemote(candidate.repositoryIdentity?.canonicalRemote || candidate.importedRepo?.repoUrl) === identity);
  // A historical workspace may predate repository identity persistence. Keep
  // it recoverable, but place known repository matches first.
  return [...matching, ...retained.filter((candidate) => !matching.includes(candidate))];
}
