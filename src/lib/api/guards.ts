import { StudioApiError } from './errors';

export function asRecord(value: unknown, context = 'response'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StudioApiError(`Invalid ${context}: expected an object.`);
  return value as Record<string, unknown>;
}

export function asString(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
export function asArray<T = unknown>(value: unknown): T[] { return Array.isArray(value) ? value as T[] : []; }

export function requireArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) throw new StudioApiError(`Invalid ${context}: expected an array.`);
  return value;
}

export function requireString(value: unknown, context: string): string {
  if (typeof value !== 'string') throw new StudioApiError(`Invalid ${context}: expected a string.`);
  return value;
}

export function requireObjectField(envelope: Record<string, unknown>, field: string): Record<string, unknown> {
  return asRecord(envelope[field], field);
}

export function requireSuccessEnvelope(value: unknown): Record<string, unknown> {
  const envelope = asRecord(value);
  if (envelope.success !== true) throw new StudioApiError(asString(envelope.error, 'The server rejected the request.'));
  return envelope;
}
