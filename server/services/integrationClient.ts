import { HttpError } from '../middleware/errorHandling';

export type IntegrationProvider = 'GitHub' | 'Jira';

const INTEGRATION_TIMEOUT_MS = 15_000;

export async function fetchIntegration(
  provider: IntegrationProvider,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: init.signal || AbortSignal.timeout(INTEGRATION_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new HttpError(504, 'INTEGRATION_TIMEOUT', `${provider} did not respond in time.`);
    }
    throw new HttpError(502, 'INTEGRATION_UNAVAILABLE', `${provider} is currently unavailable.`);
  }
}

export async function readIntegrationJson<T>(
  provider: IntegrationProvider,
  response: Response,
): Promise<T> {
  if (!response.ok) {
    throw integrationResponseError(provider, response.status);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new HttpError(502, 'INTEGRATION_INVALID_RESPONSE', `${provider} returned an invalid response.`);
  }
}

export function integrationResponseError(provider: IntegrationProvider, upstreamStatus: number) {
  const providerCode = provider.toUpperCase();
  const details = { provider, upstreamStatus };

  if (upstreamStatus === 401 || upstreamStatus === 403) {
    return new HttpError(401, `${providerCode}_AUTH_FAILED`, `${provider} rejected the supplied credentials.`, details);
  }
  if (upstreamStatus === 404) {
    return new HttpError(404, `${providerCode}_RESOURCE_NOT_FOUND`, `${provider} could not find the requested resource.`, details);
  }
  if (upstreamStatus === 429) {
    return new HttpError(429, `${providerCode}_RATE_LIMITED`, `${provider} rate-limited the request.`, details);
  }
  return new HttpError(502, `${providerCode}_UPSTREAM_ERROR`, `${provider} could not complete the request.`, details);
}