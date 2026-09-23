export interface ServerConfig {
  host: string;
  port: number;
  requestBodyLimit: string;
  shutdownGracePeriodMs: number;
}

function positiveInteger(value: string | undefined, fallback: number, name: string) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

export function loadServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    host: environment.HOST?.trim() || '0.0.0.0',
    port: positiveInteger(environment.PORT, 3000, 'PORT'),
    requestBodyLimit: environment.REQUEST_BODY_LIMIT?.trim() || '10mb',
    shutdownGracePeriodMs: positiveInteger(environment.SHUTDOWN_GRACE_PERIOD_MS, 10_000, 'SHUTDOWN_GRACE_PERIOD_MS'),
  };
}