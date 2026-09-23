export { StudioApiError } from './errors';
import { StudioApiError } from './errors';
import { requireSuccessEnvelope } from './guards';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  requestId?: string;
}

export type ResponseParser<TResponse> = (envelope: Record<string, unknown>) => TResponse;

export async function postApi<TResponse, TRequest>(path: string, body: TRequest, parse: ResponseParser<TResponse>): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'TimeoutError') {
      throw new StudioApiError('The request timed out. Try again.', 408, 'REQUEST_TIMEOUT', undefined, { cause });
    }
    throw new StudioApiError('Studio could not reach the server. Check your connection and try again.', undefined, 'NETWORK_ERROR', undefined, { cause });
  }

  const requestId = response.headers.get('x-request-id') || undefined;
  const payload = await response.json().catch((cause) => {
    throw new StudioApiError('The server returned an unreadable response.', response.status, 'INVALID_RESPONSE', requestId, { cause });
  }) as ApiEnvelope<TResponse> & TResponse;

  if (!response.ok) {
    throw new StudioApiError(
      payload.error || `Request failed (${response.status}).`,
      response.status,
      payload.code,
      payload.requestId || requestId,
    );
  }

  return parse(requireSuccessEnvelope(payload));
}
