export { StudioApiError } from './errors';
import { StudioApiError } from './errors';
import { requireSuccessEnvelope } from './guards';

export interface ApiEnvelope<T> { success: boolean; data?: T; error?: string; }

export type ResponseParser<TResponse> = (envelope: Record<string, unknown>) => TResponse;

export async function postApi<TResponse, TRequest>(path: string, body: TRequest, parse: ResponseParser<TResponse>): Promise<TResponse> {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({})) as ApiEnvelope<TResponse> & TResponse;
  if (!response.ok) throw new StudioApiError(payload.error || `Request failed (${response.status}).`, response.status);
  return parse(requireSuccessEnvelope(payload));
}
