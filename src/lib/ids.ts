let fallbackSequence = 0;

/**
 * Browser-persisted aggregates must never use a timestamp as their identity:
 * two clicks or imports in the same millisecond can otherwise overwrite each
 * other in storage. UUIDs are available in supported browsers; the fallback
 * still combines a clock value and process sequence for non-browser tests.
 */
export function createUniqueId(prefix: string, now = Date.now()): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  fallbackSequence += 1;
  return `${prefix}-${now.toString(36)}-${fallbackSequence.toString(36)}`;
}
