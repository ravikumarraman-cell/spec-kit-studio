export type DeploymentMode = 'standard' | 'govcloud' | 'dod';

export interface RegulatoryModeConfig {
  mode: DeploymentMode;
  regulated: boolean;
  allowExternalAiEgress: boolean;
}

/**
 * The only deployment posture that is safe to expose to the browser. It makes
 * a regulated boundary visible without leaking infrastructure, identity, or
 * authorization configuration.
 */
export interface PublicDeploymentContext {
  mode: DeploymentMode;
  regulated: boolean;
  externalAiEgress: 'disabled' | 'permitted';
}

export function publicDeploymentContext(config: RegulatoryModeConfig): PublicDeploymentContext {
  return {
    mode: config.mode,
    regulated: config.regulated,
    externalAiEgress: config.allowExternalAiEgress ? 'permitted' : 'disabled',
  };
}

function positiveInteger(value: string | undefined, fallback: number, name: string) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

/**
 * Regulated modes describe application safeguards, not an ATO or a service's
 * authorization boundary. They fail closed so an accidental production deploy
 * cannot use the ordinary local/developer defaults for identity or egress.
 */
export function loadRegulatoryModeConfig(environment: NodeJS.ProcessEnv = process.env): RegulatoryModeConfig {
  const mode = (environment.STUDIO_DEPLOYMENT_MODE?.trim() || 'standard') as DeploymentMode;
  if (!['standard', 'govcloud', 'dod'].includes(mode)) throw new Error('STUDIO_DEPLOYMENT_MODE must be standard, govcloud, or dod.');
  const regulated = mode !== 'standard';
  if (!regulated) return { mode, regulated, allowExternalAiEgress: true };

  if (environment.NODE_ENV !== 'production') throw new Error(`${mode} deployment mode requires NODE_ENV=production.`);
  if (environment.STUDIO_AUTH_MODE?.trim() !== 'enterprise') throw new Error(`${mode} deployment mode requires STUDIO_AUTH_MODE=enterprise.`);
  if (!environment.STUDIO_OIDC_REQUIRED_GROUP_IDS?.trim()) throw new Error(`${mode} deployment mode requires STUDIO_OIDC_REQUIRED_GROUP_IDS for explicit access authorization.`);
  if (environment.STUDIO_EXTERNAL_AI_EGRESS?.trim() !== 'disabled') throw new Error(`${mode} deployment mode requires STUDIO_EXTERNAL_AI_EGRESS=disabled until an approved in-boundary model adapter is configured.`);
  const sessionTtlMs = positiveInteger(environment.STUDIO_SESSION_TTL_MS, 0, 'STUDIO_SESSION_TTL_MS');
  if (!sessionTtlMs || sessionTtlMs > 60 * 60 * 1000) throw new Error(`${mode} deployment mode requires STUDIO_SESSION_TTL_MS no greater than 3600000.`);
  return { mode, regulated, allowExternalAiEgress: false };
}
