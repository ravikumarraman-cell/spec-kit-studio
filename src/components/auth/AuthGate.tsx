import { type PropsWithChildren, useEffect, useState } from 'react';
import { readAuthSession } from '../../lib/api/auth';

type State = 'loading' | 'ready' | 'error';

/** A single app-shell authentication boundary: features never handle identity redirects themselves. */
export function AuthGate({ children }: PropsWithChildren) {
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('Checking secure access…');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await readAuthSession();
      if (cancelled) return;
      if (session.mode === 'enterprise' && !session.authenticated) {
        const browserConfigResponse = await fetch('/api/auth/browser-config', { credentials: 'same-origin', cache: 'no-store' });
        const browserConfig = browserConfigResponse.ok ? await browserConfigResponse.json() as { enabled?: boolean; clientId?: string; authority?: string; scopes?: string[] } : {};
        if (browserConfig.enabled && browserConfig.clientId && browserConfig.authority) {
          setMessage('Taking you to your company sign-in…');
          const { PublicClientApplication } = await import('@azure/msal-browser');
          const client = new PublicClientApplication({ auth: { clientId: browserConfig.clientId, authority: browserConfig.authority, redirectUri: window.location.origin, navigateToLoginRequestUrl: false }, cache: { cacheLocation: 'sessionStorage' } });
          const result = await client.handleRedirectPromise();
          const account = result?.account || client.getAllAccounts()[0];
          if (!account) { await client.loginRedirect({ scopes: browserConfig.scopes || ['openid', 'profile', 'email'] }); return; }
          const tokenResult = result || await client.acquireTokenSilent({ scopes: browserConfig.scopes || ['openid', 'profile', 'email'], account });
          const established = await fetch('/api/auth/browser-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ idToken: tokenResult.idToken }) });
          if (!established.ok) throw new Error('Studio could not finish company sign-in.');
          window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
          if (!cancelled) setState('ready');
          return;
        }
        const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }
      setState('ready');
    })().catch(() => { if (!cancelled) { setMessage('Secure access could not be checked. Verify your connection and try again.'); setState('error'); } });
    return () => { cancelled = true; };
  }, []);
  if (state === 'ready') return <>{children}</>;
  return <main className="min-h-screen theme-canvas flex items-center justify-center p-6" aria-live="polite"><section className="max-w-md rounded-2xl border border-cyan-200/50 bg-white/90 p-6 text-center shadow-sm dark:bg-slate-950"><h1 className="text-lg font-bold theme-text-primary">Spec-Kit Studio</h1><p className="mt-2 text-sm theme-text-muted">{message}</p>{state === 'error' && <button className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => window.location.reload()}>Try again</button>}</section></main>;
}
