const connectorTokenKey = 'speckit_connector_token_session';

/**
 * A pairing token authorizes a loopback connector. Keep it for the current
 * browser session only: navigating between Studio screens should work, but a
 * browser restart should require the user to pair again.
 */
export function getConnectorSessionToken(): string {
  if (typeof window === 'undefined') return '';
  return window.sessionStorage.getItem(connectorTokenKey) || '';
}

export function setConnectorSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  const value = token.trim();
  if (value) window.sessionStorage.setItem(connectorTokenKey, value);
  else window.sessionStorage.removeItem(connectorTokenKey);
}
