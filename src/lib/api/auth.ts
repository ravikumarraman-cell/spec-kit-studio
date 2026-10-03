export interface StudioAuthSession {
  mode: 'disabled' | 'enterprise';
  authenticated: boolean;
  session?: { csrfToken: string; expiresAt: number; principal: { id: string; displayName: string; email?: string; roles: string[] } };
}

let csrfToken: string | undefined;

export function setCsrfToken(value: string | undefined) { csrfToken = value; }
export function getCsrfHeaders() { return csrfToken ? { 'X-CSRF-Token': csrfToken } : {}; }

export async function readAuthSession(): Promise<StudioAuthSession> {
  const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error('Unable to check your sign-in status.');
  const value = await response.json() as StudioAuthSession & { success?: boolean };
  if (value.session?.csrfToken) setCsrfToken(value.session.csrfToken); else setCsrfToken(undefined);
  return value;
}
