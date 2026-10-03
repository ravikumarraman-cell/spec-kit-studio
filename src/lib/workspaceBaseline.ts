import type { TruthReport } from './connector';
import type { WorkspaceBaselineEvidence } from '../types/speckit';

/** A passing baseline is valid only for the same clean repository revision.
 * Keeping this pure makes reuse behavior independently testable. */
export function baselineStillMatches(scan: TruthReport, baseline?: WorkspaceBaselineEvidence): boolean {
  if (!baseline || baseline.repositoryPath !== scan.repositoryPath || baseline.branch !== scan.git.branch || baseline.commit !== scan.git.head) return false;
  const statusLines = String(scan.git.status || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const hasWorkingTreeChanges = statusLines.some((line) => !line.startsWith('##'));
  return !hasWorkingTreeChanges && (baseline.manual || (baseline.results.length > 0 && baseline.results.every((result) => result.ok)));
}
