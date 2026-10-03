import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { HttpError } from '../middleware/errorHandling';
import { InMemorySessionStore, SessionService } from './sessionService';
import { OidcClient } from './oidcClient';
import type { AuthConfiguration, StudioSession } from './types';

interface LoginTransaction { nonce: string; verifier: string; returnTo: string; expiresAt: number; }
interface GitHubTransaction { sessionId: string; returnTo: string; expiresAt: number; }

export class AuthRuntime {
  private readonly transactions = new Map<string, LoginTransaction>();
  private readonly githubTransactions = new Map<string, GitHubTransaction>();
  private readonly githubTokens = new Map<string, string>();
  private readonly githubLogins = new Map<string, string>();
  readonly sessions: SessionService;
  readonly oidc?: OidcClient;
  constructor(readonly config: AuthConfiguration, secureCookies: boolean) {
    const sessionSecret = config.mode === 'enterprise' ? config.sessionSecret! : randomBytes(32).toString('base64url');
    this.sessions = new SessionService(new InMemorySessionStore(), config.sessionTtlMs, secureCookies, sessionSecret);
    this.oidc = config.oidc ? new OidcClient(config.oidc) : undefined;
  }
  enabled() { return this.config.mode === 'enterprise'; }
  /** An Entra public-client registration can redirect to the SPA root. */
  callbackPath() { return new URL(this.config.oidc?.redirectUri || 'http://localhost/api/auth/callback').pathname; }
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
  async finishBrowserLogin(idToken: string) {
    if (!this.enabled() || !this.oidc || this.config.oidc?.clientAuthentication !== 'none') throw new HttpError(404, 'BROWSER_AUTH_NOT_ENABLED', 'Browser sign-in is not enabled.');
    const principal = await this.oidc.principalFromIdToken(idToken);
    return this.sessions.create(principal);
  }
  async requireSession(request: Request): Promise<StudioSession> {
    const session = await this.getSession(request);
    if (!session) throw new HttpError(401, 'AUTHENTICATION_REQUIRED', 'Sign in with your company account to continue.');
    return session;
  }
  githubOAuthConfigured() { return Boolean(this.config.githubOAuth); }
  async githubToken(request: Request) { const session = await this.sessions.get(request); return session ? this.githubTokens.get(session.id) : undefined; }
  async githubLogin(request: Request) { const session = await this.sessions.get(request); return session ? this.githubLogins.get(session.id) : undefined; }
  async revokeGitHubAuthorization(request: Request) {
    const session = await this.sessions.get(request);
    if (!session) return;
    const token = this.githubTokens.get(session.id);
    const config = this.config.githubOAuth;
    this.githubTokens.delete(session.id);
    this.githubLogins.delete(session.id);
    if (!token || !config) return;
    try {
      await fetch(`https://api.github.com/applications/${encodeURIComponent(config.clientId)}/token`, {
        method: 'DELETE',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`, 'User-Agent': 'spec-kit-studio' },
        body: JSON.stringify({ access_token: token }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      // The local token is already removed, so retrying authorization is safe.
    }
  }
  async beginGitHubLogin(request: Request, returnTo = '/') {
    const existing = await this.sessions.get(request);
    const created = existing ? undefined : await this.sessions.create({ id: `github-connect|${randomBytes(16).toString('base64url')}`, displayName: 'GitHub connection', groups: [], roles: ['github-user'] });
    const session = existing || created!.session;
    const config = this.config.githubOAuth;
    if (!config) throw new HttpError(409, 'GITHUB_OAUTH_NOT_CONFIGURED', 'GitHub connection is not configured for this Studio.');
    const state = randomBytes(32).toString('base64url');
    this.githubTransactions.set(state, { sessionId: session.id, returnTo, expiresAt: Date.now() + 10 * 60 * 1000 });
    const authorization = new URL('https://github.com/login/oauth/authorize');
    authorization.searchParams.set('client_id', config.clientId); authorization.searchParams.set('redirect_uri', config.redirectUri); authorization.searchParams.set('scope', 'repo read:org'); authorization.searchParams.set('state', state);
    // GitHub OAuth has no organization parameter. Starting at the org SSO
    // endpoint establishes the company IdP session first, then returns to the
    // same authorization request without asking users to find SSO manually.
    const authorizationUrl = config.ssoOrganization
      ? (() => {
        const sso = new URL(`https://github.com/orgs/${config.ssoOrganization}/sso`);
        sso.searchParams.set('return_to', `${authorization.pathname}${authorization.search}`);
        return sso.toString();
      })()
      : authorization.toString();
    return { authorizationUrl, sessionToken: created?.token };
  }
  async finishGitHubLogin(request: Request, state: string, code: string) {
    const session = await this.sessions.get(request); const transaction = this.githubTransactions.get(state); this.githubTransactions.delete(state);
    if (!session || !transaction || transaction.expiresAt <= Date.now() || transaction.sessionId !== session.id || !code) throw new HttpError(400, 'GITHUB_OAUTH_CALLBACK_INVALID', 'GitHub sign-in did not complete. Try again.');
    const config = this.config.githubOAuth!;
    const response = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.redirectUri }), signal: AbortSignal.timeout(10_000) });
    const payload = await response.json() as { access_token?: unknown };
    if (!response.ok || typeof payload.access_token !== 'string') throw new HttpError(401, 'GITHUB_OAUTH_TOKEN_EXCHANGE_FAILED', 'GitHub sign-in did not complete. Try again.');
    const profileResponse = await fetch('https://api.github.com/user', {
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${payload.access_token}`, 'User-Agent': 'spec-kit-studio' },
      signal: AbortSignal.timeout(10_000),
    });
    const profile = profileResponse.ok ? await profileResponse.json() as { login?: unknown } : undefined;
    if (typeof profile?.login !== 'string' || !profile.login) {
      throw new HttpError(401, 'GITHUB_OAUTH_TOKEN_INVALID', 'GitHub did not issue a usable account connection. Start the connection again with your GitHub account.');
    }
    this.githubTokens.set(session.id, payload.access_token);
    this.githubLogins.set(session.id, profile.login);
    return transaction.returnTo;
  }
  private pruneTransactions() { for (const [key, value] of this.transactions) if (value.expiresAt <= Date.now()) this.transactions.delete(key); }
}
