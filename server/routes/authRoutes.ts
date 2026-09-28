import { Router } from 'express';
import { asyncRoute } from '../middleware/errorHandling';
import type { AuthRuntime } from '../auth/runtime';

function safeAppPath(value: unknown) { return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'; }

export function createAuthRouter(auth: AuthRuntime) {
  const router = Router();
  router.get('/api/auth/session', asyncRoute(async (request, response) => {
    const session = await auth.getSession(request);
    response.setHeader('Cache-Control', 'no-store');
    response.json({ success: true, mode: auth.config.mode, authenticated: Boolean(session), session: session ? { principal: session.principal, expiresAt: session.expiresAt, csrfToken: session.csrfToken } : undefined });
  }));
  router.get('/api/auth/login', asyncRoute(async (request, response) => {
    const { authorizationUrl } = await auth.beginLogin(safeAppPath(request.query.returnTo)); response.redirect(302, authorizationUrl);
  }));
  router.get('/api/auth/callback', asyncRoute(async (request, response) => {
    const state = typeof request.query.state === 'string' ? request.query.state : ''; const code = typeof request.query.code === 'string' ? request.query.code : '';
    const { token, returnTo } = await auth.finishLogin(state, code); auth.sessions.setCookie(response, token); response.redirect(303, returnTo);
  }));
  router.post('/api/auth/logout', asyncRoute(async (request, response) => {
    const session = await auth.getSession(request); if (session) auth.sessions.requireCsrf(request, session);
    await auth.sessions.revoke(request); auth.sessions.clearCookie(response); response.status(204).end();
  }));
  return router;
}
