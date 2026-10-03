const connectorTokenKey = 'speckit_connector_tokens_session_v2';
const legacyConnectorTokenKey = 'speckit_connector_token_session';
const defaultConnectorUrl = 'http://localhost:4318';

function tokenScope(connectorUrl = defaultConnectorUrl): string {
  try { return new URL(connectorUrl).origin; } catch { return connectorUrl.trim().replace(/\/$/, '') || defaultConnectorUrl; }
}

function readTokens(storage: Storage): Record<string, string> {
  try {
    const parsed = JSON.parse(storage.getItem(connectorTokenKey) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string' && Boolean(entry[1].trim()));
    return Object.fromEntries(entries);
  } catch { return {}; }
}

function writeTokens(storage: Storage, tokens: Record<string, string>): void {
  if (Object.keys(tokens).length) storage.setItem(connectorTokenKey, JSON.stringify(tokens));
  else storage.removeItem(connectorTokenKey);
}

/**
 * A pairing token authorizes a loopback connector. Keep it for the current
 * browser session only: navigating between Studio screens should work, but a
 * browser restart should require the user to pair again.
 */
export function getConnectorSessionToken(connectorUrl = defaultConnectorUrl): string {
  if (typeof window === 'undefined') return '';
  const tokens = readTokens(window.sessionStorage);
  const scoped = tokens[tokenScope(connectorUrl)];
  if (scoped) return scoped;
  // Migrate the pre-URL-scoped value once. It remains session-only, and the
  // first connection that uses it becomes its explicit local endpoint.
  return window.sessionStorage.getItem(legacyConnectorTokenKey)?.trim() || '';
}

export function setConnectorSessionToken(token: string, connectorUrl = defaultConnectorUrl): void {
  if (typeof window === 'undefined') return;
  const value = token.trim();
  const tokens = readTokens(window.sessionStorage);
  const scope = tokenScope(connectorUrl);
  if (value) tokens[scope] = value;
  else delete tokens[scope];
  writeTokens(window.sessionStorage, tokens);
  // Do not leave an unscoped credential around once a caller has deliberately
  // saved or cleared a connector-specific value.
  window.sessionStorage.removeItem(legacyConnectorTokenKey);
}
