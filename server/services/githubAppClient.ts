import { createSign } from 'node:crypto';
import { HttpError } from '../middleware/errorHandling';
import { fetchIntegration, readIntegrationJson } from './integrationClient';

export interface GitHubAppConfig { appId: string; installationId: string; privateKey: string; apiUrl: string; }
interface InstallationToken { token: string; expiresAt: number; }

function base64url(value: string | Buffer) { return Buffer.from(value).toString('base64url'); }
function required(value: string | undefined, name: string) { if (!value?.trim()) throw new HttpError(503, 'GITHUB_APP_NOT_CONFIGURED', `GitHub App ${name} is not configured.`); return value.trim(); }

export function loadGitHubAppConfig(environment: NodeJS.ProcessEnv = process.env): GitHubAppConfig {
  const apiUrl = (environment.STUDIO_GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
  if (!apiUrl.startsWith('https://')) throw new Error('STUDIO_GITHUB_API_URL must use HTTPS.');
  return { appId: required(environment.STUDIO_GITHUB_APP_ID, 'ID'), installationId: required(environment.STUDIO_GITHUB_APP_INSTALLATION_ID, 'installation ID'), privateKey: required(environment.STUDIO_GITHUB_APP_PRIVATE_KEY, 'private key').replace(/\\n/g, '\n'), apiUrl };
}

/** Server-only installation-token broker. Tokens are cached only until shortly before expiry. */
export class GitHubAppClient {
  private token?: InstallationToken;
  constructor(private readonly config: GitHubAppConfig) {}
  async headers() { return { Authorization: `Bearer ${await this.installationToken()}`, Accept: 'application/vnd.github+json', 'User-Agent': 'spec-kit-studio' }; }
  async installationToken() {
    if (this.token && this.token.expiresAt - Date.now() > 60_000) return this.token.token;
    const now = Math.floor(Date.now() / 1000); const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })); const payload = base64url(JSON.stringify({ iat: now - 30, exp: now + 9 * 60, iss: this.config.appId }));
    const signer = createSign('RSA-SHA256'); signer.update(`${header}.${payload}`); signer.end(); const appJwt = `${header}.${payload}.${signer.sign(this.config.privateKey).toString('base64url')}`;
    const response = await fetchIntegration('GitHub', `${this.config.apiUrl}/app/installations/${encodeURIComponent(this.config.installationId)}/access_tokens`, { method: 'POST', headers: { Authorization: `Bearer ${appJwt}`, Accept: 'application/vnd.github+json', 'User-Agent': 'spec-kit-studio' } });
    const result = await readIntegrationJson<{ token?: unknown; expires_at?: unknown }>('GitHub', response);
    if (typeof result.token !== 'string' || typeof result.expires_at !== 'string' || Number.isNaN(Date.parse(result.expires_at))) throw new HttpError(502, 'GITHUB_APP_TOKEN_INVALID', 'GitHub could not establish the application connection.');
    this.token = { token: result.token, expiresAt: Date.parse(result.expires_at) }; return this.token.token;
  }
  url(path: string) { return `${this.config.apiUrl}${path}`; }
}
