import type { RequestHandler } from 'express';
import type { AuthRuntime } from '../auth/runtime';

/** Protects application API routes only when enterprise authentication is configured. */
export function requireEnterpriseSession(auth: AuthRuntime): RequestHandler {
  return async (request, _response, next) => {
    if (!auth.enabled()) return next();
    try { await auth.requireSession(request); next(); } catch (error) { next(error); }
  };
}

/** Mutations also require the server-issued CSRF proof bound to the opaque session. */
export function requireCsrf(auth: AuthRuntime): RequestHandler {
  return async (request, _response, next) => {
    if (!auth.enabled() || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next();
    try { auth.sessions.requireCsrf(request, await auth.requireSession(request)); next(); } catch (error) { next(error); }
  };
}
