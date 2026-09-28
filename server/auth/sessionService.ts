import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { HttpError } from '../middleware/errorHandling';
import type { StudioPrincipal, StudioSession } from './types';

const COOKIE_NAME = 'speckit_session';
const SESSION_ID_BYTES = 32;

interface StoredSession extends StudioSession { tokenHash: string; }

/** Port for a durable, shared session implementation. Memory is development/test only. */
export interface SessionStore {
  get(tokenHash: string): Promise<StoredSession | undefined>;
  set(session: StoredSession): Promise<void>;
  delete(tokenHash: string): Promise<void>;
}

export class InMemorySessionStore implements SessionStore {
  private readonly records = new Map<string, StoredSession>();
  async get(tokenHash: string) {
    const record = this.records.get(tokenHash);
    if (record && record.expiresAt <= Date.now()) this.records.delete(tokenHash);
    return this.records.get(tokenHash);
  }
  async set(session: StoredSession) { this.records.set(session.tokenHash, session); }
  async delete(tokenHash: string) { this.records.delete(tokenHash); }
}

function tokenHash(secret: string, token: string) { return createHash('sha256').update(secret).update(':').update(token).digest('hex'); }
function randomToken(bytes = SESSION_ID_BYTES) { return randomBytes(bytes).toString('base64url'); }

function parseCookies(request: Request) {
  const raw = request.header('cookie') || '';
  return Object.fromEntries(raw.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf('=');
    return separator < 1 ? [part, ''] : [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
  }));
}

export class SessionService {
  constructor(private readonly store: SessionStore, private readonly ttlMs: number, private readonly secureCookies: boolean, private readonly secret = 'development-session-secret') {}

  async create(principal: StudioPrincipal) {
    const token = randomToken();
    const session: StoredSession = {
      id: randomToken(16), tokenHash: tokenHash(this.secret, token), principal, csrfToken: randomToken(24), expiresAt: Date.now() + this.ttlMs,
    };
    await this.store.set(session);
    return { token, session };
  }

  async get(request: Request): Promise<StudioSession | undefined> {
    const token = parseCookies(request)[COOKIE_NAME];
    if (!token || token.length > 512) return undefined;
    const session = await this.store.get(tokenHash(this.secret, token));
    return session && session.expiresAt > Date.now() ? session : undefined;
  }

  async revoke(request: Request) {
    const token = parseCookies(request)[COOKIE_NAME];
    if (token) await this.store.delete(tokenHash(this.secret, token));
  }

  setCookie(response: Response, token: string) {
    response.cookie(COOKIE_NAME, token, { httpOnly: true, secure: this.secureCookies, sameSite: 'lax', path: '/', maxAge: this.ttlMs });
  }

  clearCookie(response: Response) { response.clearCookie(COOKIE_NAME, { httpOnly: true, secure: this.secureCookies, sameSite: 'lax', path: '/' }); }

  requireCsrf(request: Request, session: StudioSession) {
    const candidate = request.header('x-csrf-token');
    if (!candidate || candidate.length !== session.csrfToken.length || !timingSafeEqual(Buffer.from(candidate), Buffer.from(session.csrfToken))) {
      throw new HttpError(403, 'CSRF_VALIDATION_FAILED', 'This action could not be verified. Refresh and try again.');
    }
  }
}
