import { SpecKitProject } from '../types/speckit';
import { normalizeGitRemote } from './projectIdentity';

/** A feature record can live in a separate Studio workspace after an explicit
 * "create separate workspace" choice. Surface it; never merge or move it
 * automatically because that could combine unrelated product histories. */
export function relatedFeatureWorkspaces(current: SpecKitProject, projects: SpecKitProject[]): SpecKitProject[] {
  if (current.featureInbox?.length) return [];
  const identity = normalizeGitRemote(current.repositoryIdentity?.canonicalRemote || current.importedRepo?.repoUrl);
  const retained = projects.filter((candidate) => candidate.id !== current.id && Boolean(candidate.featureInbox?.length));
  // Without a shared durable repository identity, a workspace cannot safely
  // claim another workspace's feature. Avoid a misleading recovery banner.
  if (!identity) return [];
  const matching = retained.filter((candidate) => normalizeGitRemote(candidate.repositoryIdentity?.canonicalRemote || candidate.importedRepo?.repoUrl) === identity);
  return matching;
}
