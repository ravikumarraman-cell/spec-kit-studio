export type DeploymentMode = 'standard' | 'govcloud' | 'dod';

export interface DeploymentBoundary {
  mode: DeploymentMode;
  regulated: boolean;
  externalAiEgress: 'disabled' | 'permitted';
}

/** Validate the intentionally small, public deployment contract. Unknown or
 * older hosts simply remain unlabeled rather than guessing a regulated mode. */
export function parseDeploymentBoundary(value: unknown): DeploymentBoundary | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if ((candidate.mode !== 'standard' && candidate.mode !== 'govcloud' && candidate.mode !== 'dod')
    || typeof candidate.regulated !== 'boolean'
    || (candidate.externalAiEgress !== 'disabled' && candidate.externalAiEgress !== 'permitted')) return null;
  return { mode: candidate.mode, regulated: candidate.regulated, externalAiEgress: candidate.externalAiEgress };
}

export async function currentDeploymentBoundary(signal?: AbortSignal): Promise<DeploymentBoundary | null> {
  try {
    const response = await fetch('/api/health', { cache: 'no-store', signal });
    if (!response.ok) return null;
    return parseDeploymentBoundary((await response.json() as { deployment?: unknown }).deployment);
  } catch {
    return null;
  }
}
