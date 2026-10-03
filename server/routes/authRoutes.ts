import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandling';
import type { AuthRuntime } from '../auth/runtime';

function safeAppPath(value: unknown) { return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'; }

export function createAuthRouter(auth: AuthRuntime) {
  const router = Router();
  const callback = asyncRoute(async (request, response, next) => {
    // A root redirect URI shares the SPA route. Let ordinary page requests
    // through to Vite/static hosting; intercept only an OIDC response.
    const state = typeof request.query.state === 'string' ? request.query.state : '';
    const code = typeof request.query.code === 'string' ? request.query.code : '';
    if (!state && !code) return next();
    const { token, returnTo } = await auth.finishLogin(state, code);
    auth.sessions.setCookie(response, token);
    response.redirect(303, returnTo);
  });
  router.get('/api/auth/session', asyncRoute(async (request, response) => {
    const session = await auth.getSession(request);
    response.setHeader('Cache-Control', 'no-store');
    response.json({ success: true, mode: auth.config.mode, authenticated: Boolean(session), session: session ? { principal: session.principal, expiresAt: session.expiresAt, csrfToken: session.csrfToken } : undefined });
  }));
  router.get('/api/auth/login', asyncRoute(async (request, response) => {
    const { authorizationUrl } = await auth.beginLogin(safeAppPath(request.query.returnTo)); response.redirect(302, authorizationUrl);
  }));
  router.get('/api/auth/browser-config', asyncRoute(async (_request, response) => {
    const oidc = auth.config.oidc;
    response.setHeader('Cache-Control', 'no-store');
    response.json({ success: true, enabled: Boolean(auth.enabled() && oidc?.clientAuthentication === 'none'), clientId: oidc?.clientAuthentication === 'none' ? oidc.clientId : undefined, authority: oidc?.clientAuthentication === 'none' ? oidc.issuer : undefined, scopes: oidc?.clientAuthentication === 'none' ? oidc.scopes : undefined });
  }));
  router.post('/api/auth/browser-session', asyncRoute(async (request, response) => {
    const idToken = typeof request.body.idToken === 'string' ? request.body.idToken : '';
    if (!idToken || idToken.length > 16_384) throw new Error('Invalid browser sign-in response.');
    const { token, session } = await auth.finishBrowserLogin(idToken);
    auth.sessions.setCookie(response, token);
    response.json({ success: true, session: { principal: session.principal, expiresAt: session.expiresAt, csrfToken: session.csrfToken } });
  }));
  router.get(auth.callbackPath(), callback);
  router.get('/api/auth/github/status', asyncRoute(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    const connected = Boolean(await auth.githubToken(request).catch(() => undefined));
    response.json({ success: true, configured: auth.githubOAuthConfigured(), connected, ...(connected ? { login: await auth.githubLogin(request) } : {}) });
  }));
  router.get('/api/auth/github/login', asyncRoute(async (request, response) => {
    const login = await auth.beginGitHubLogin(request, safeAppPath(request.query.returnTo));
    if (login.sessionToken) auth.sessions.setCookie(response, login.sessionToken);
    response.redirect(302, login.authorizationUrl);
  }));
  router.post('/api/auth/github/reconnect', asyncRoute(async (request, response) => {
    await auth.revokeGitHubAuthorization(request);
    response.status(204).end();
  }));
  router.get('/api/auth/github/callback', asyncRoute(async (request, response) => {
    const state = typeof request.query.state === 'string' ? request.query.state : ''; const code = typeof request.query.code === 'string' ? request.query.code : '';
    response.redirect(303, await auth.finishGitHubLogin(request, state, code));
  }));
  router.post('/api/auth/logout', asyncRoute(async (request, response) => {
    const session = await auth.getSession(request); if (session) auth.sessions.requireCsrf(request, session);
    await auth.sessions.revoke(request); auth.sessions.clearCookie(response); response.status(204).end();
  }));
  return router;
}
