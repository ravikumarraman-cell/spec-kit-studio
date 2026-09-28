import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { HttpError } from '../middleware/errorHandling';
import { InMemorySessionStore, SessionService } from './sessionService';
import { OidcClient } from './oidcClient';
import type { AuthConfiguration, StudioSession } from './types';

interface LoginTransaction { nonce: string; verifier: string; returnTo: string; expiresAt: number; }

export class AuthRuntime {
  private readonly transactions = new Map<string, LoginTransaction>();
  readonly sessions: SessionService;
  readonly oidc?: OidcClient;
  constructor(readonly config: AuthConfiguration, secureCookies: boolean) {
    this.sessions = new SessionService(new InMemorySessionStore(), config.sessionTtlMs, secureCookies, config.sessionSecret);
    this.oidc = config.oidc ? new OidcClient(config.oidc) : undefined;
  }
  enabled() { return this.config.mode === 'enterprise'; }
  async getSession(request: Request) { return this.enabled() ? this.sessions.get(request) : undefined; }
  async beginLogin(returnTo = '/') {
    if (!this.enabled() || !this.oidc) throw new HttpError(404, 'AUTH_NOT_ENABLED', 'Company sign-in is not enabled.');
    this.pruneTransactions();
    const state = randomBytes(32).toString('base64url'); const nonce = randomBytes(32).toString('base64url'); const verifier = randomBytes(48).toString('base64url');
    this.transactions.set(state, { nonce, verifier, returnTo, expiresAt: Date.now() + 10 * 60 * 1000 });
    return { state, authorizationUrl: await this.oidc.begin(state, nonce, verifier) };
  }
  async finishLogin(state: string, code: string) {
    if (!this.oidc || !state || !code) throw new HttpError(400, 'OIDC_CALLBACK_INVALID', 'Sign-in did not complete. Try again.');
    const transaction = this.transactions.get(state); this.transactions.delete(state);
    if (!transaction || transaction.expiresAt <= Date.now()) throw new HttpError(400, 'OIDC_TRANSACTION_EXPIRED', 'Sign-in took too long. Start again.');
    const tokens = await this.oidc.exchange(code, transaction.verifier);
    const principal = await this.oidc.principalFromIdToken(tokens.idToken, transaction.nonce);
    return { ...(await this.sessions.create(principal)), returnTo: transaction.returnTo };
  }
  async requireSession(request: Request): Promise<StudioSession> {
    const session = await this.getSession(request);
    if (!session) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in with your company account to continue.');
    return session;
  }
  private pruneTransactions() { for (const [key, value] of this.transactions) if (value.expiresAt <= Date.now()) this.transactions.delete(key); }
}
